alter table public.article_queue
  add column if not exists duplicate_of_queue_id uuid references public.article_queue(id) on delete set null,
  add column if not exists resolved_reason text;

alter table public.seo_articles
  add column if not exists source_queue_id uuid references public.article_queue(id) on delete set null;

create index if not exists idx_article_queue_article_id on public.article_queue(article_id);
create index if not exists idx_article_queue_duplicate_of_queue_id on public.article_queue(duplicate_of_queue_id);
create index if not exists idx_article_queue_status_topic on public.article_queue(status, topic);
create index if not exists idx_seo_articles_source_queue_id on public.seo_articles(source_queue_id);
create index if not exists idx_seo_articles_status_slug on public.seo_articles(status, slug);

create or replace function public.seo_normalize_key(_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(trim(coalesce(_value, ''))), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.sync_article_queue_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  published_fixed integer := 0;
  duplicates_fixed integer := 0;
begin
  update public.seo_articles a
  set source_queue_id = q.id
  from public.article_queue q
  where a.source_queue_id is null
    and q.article_id = a.id;

  update public.article_queue q
  set status = 'done',
      article_id = coalesce(q.article_id, a.id),
      completed_at = coalesce(q.completed_at, now()),
      started_at = null,
      error_message = null,
      duplicate_of_queue_id = null,
      resolved_reason = 'published_article'
  from public.seo_articles a
  where a.status = 'published'
    and q.status in ('pending', 'processing', 'error', 'duplicate')
    and (
      q.article_id = a.id
      or a.source_queue_id = q.id
      or public.seo_normalize_key(coalesce(q.target_keyword, q.topic)) = public.seo_normalize_key(coalesce(a.slug, a.keyword))
      or public.seo_normalize_key(q.topic) = public.seo_normalize_key(a.keyword)
    );
  get diagnostics published_fixed = row_count;

  with ranked as (
    select
      id,
      first_value(id) over (
        partition by public.seo_normalize_key(coalesce(target_keyword, topic))
        order by
          case status when 'processing' then 0 when 'pending' then 1 when 'error' then 2 else 3 end,
          priority nulls last,
          created_at nulls last,
          id
      ) as canonical_id,
      row_number() over (
        partition by public.seo_normalize_key(coalesce(target_keyword, topic))
        order by
          case status when 'processing' then 0 when 'pending' then 1 when 'error' then 2 else 3 end,
          priority nulls last,
          created_at nulls last,
          id
      ) as rn
    from public.article_queue
    where status in ('pending', 'processing', 'error')
      and public.seo_normalize_key(coalesce(target_keyword, topic)) <> ''
  )
  update public.article_queue q
  set status = 'duplicate',
      duplicate_of_queue_id = r.canonical_id,
      completed_at = coalesce(q.completed_at, now()),
      started_at = null,
      error_message = null,
      resolved_reason = 'duplicate_queue_item'
  from ranked r
  where q.id = r.id
    and r.rn > 1;
  get diagnostics duplicates_fixed = row_count;

  return jsonb_build_object(
    'published_fixed', published_fixed,
    'duplicates_fixed', duplicates_fixed
  );
end;
$$;

create or replace function public.article_queue_before_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matching_article_id uuid;
  canonical_queue_id uuid;
begin
  if NEW.status in ('pending', 'processing', 'error') then
    select a.id into matching_article_id
    from public.seo_articles a
    where a.status = 'published'
      and (
        public.seo_normalize_key(coalesce(NEW.target_keyword, NEW.topic)) = public.seo_normalize_key(coalesce(a.slug, a.keyword))
        or public.seo_normalize_key(NEW.topic) = public.seo_normalize_key(a.keyword)
      )
    order by a.updated_at desc nulls last, a.created_at desc nulls last
    limit 1;

    if matching_article_id is not null then
      NEW.status := 'done';
      NEW.article_id := coalesce(NEW.article_id, matching_article_id);
      NEW.completed_at := coalesce(NEW.completed_at, now());
      NEW.started_at := null;
      NEW.error_message := null;
      NEW.duplicate_of_queue_id := null;
      NEW.resolved_reason := 'published_article';
      return NEW;
    end if;
  end if;

  if NEW.status = 'pending' then
    select q.id into canonical_queue_id
    from public.article_queue q
    where q.id is distinct from NEW.id
      and q.status in ('pending', 'processing', 'error')
      and public.seo_normalize_key(coalesce(q.target_keyword, q.topic)) = public.seo_normalize_key(coalesce(NEW.target_keyword, NEW.topic))
    order by
      case q.status when 'processing' then 0 when 'pending' then 1 when 'error' then 2 else 3 end,
      q.priority nulls last,
      q.created_at nulls last,
      q.id
    limit 1;

    if canonical_queue_id is not null then
      NEW.status := 'duplicate';
      NEW.duplicate_of_queue_id := canonical_queue_id;
      NEW.completed_at := coalesce(NEW.completed_at, now());
      NEW.started_at := null;
      NEW.error_message := null;
      NEW.resolved_reason := 'duplicate_queue_item';
    end if;
  end if;

  return NEW;
end;
$$;

create or replace function public.seo_article_after_sync_queue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'published' then
    update public.article_queue q
    set status = 'done',
        article_id = coalesce(q.article_id, NEW.id),
        completed_at = coalesce(q.completed_at, now()),
        started_at = null,
        error_message = null,
        duplicate_of_queue_id = null,
        resolved_reason = 'published_article'
    where q.status in ('pending', 'processing', 'error', 'duplicate')
      and (
        q.article_id = NEW.id
        or NEW.source_queue_id = q.id
        or public.seo_normalize_key(coalesce(q.target_keyword, q.topic)) = public.seo_normalize_key(coalesce(NEW.slug, NEW.keyword))
        or public.seo_normalize_key(q.topic) = public.seo_normalize_key(NEW.keyword)
      );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_article_queue_before_sync on public.article_queue;
create trigger trg_article_queue_before_sync
before insert or update of topic, target_keyword, status on public.article_queue
for each row
execute function public.article_queue_before_sync();

drop trigger if exists trg_seo_article_after_sync_queue on public.seo_articles;
create trigger trg_seo_article_after_sync_queue
after insert or update of status, slug, keyword, source_queue_id on public.seo_articles
for each row
execute function public.seo_article_after_sync_queue();

select public.sync_article_queue_state();