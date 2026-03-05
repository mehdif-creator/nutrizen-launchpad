import type { Json } from '@/integrations/supabase/types';

export interface SeoArticle {
  id: string;
  keyword: string;
  cluster_context: string | null;
  status: string;
  serp_snapshot: Json | null;
  paa_questions: string[] | null;
  related_keywords: string[] | null;
  brief: Json | null;
  outline: Json | null;
  image_urls: Json | null;
  draft_html: string | null;
  draft_meta: Json | null;
  cta_blocks: Json | null;
  schema_json: Json | null;
  quality_flags: Json | null;
  qa_result: Json | null;
  qa_score: number | null;
  qa_pass: boolean | null;
  improve_attempts: number | null;
  blog_post_id: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const PIPELINE_STEPS = [
  { key: 'serp_done', label: 'SERP' },
  { key: 'brief_done', label: 'Brief' },
  { key: 'outline_done', label: 'Plan' },
  { key: 'images_done', label: 'Images' },
  { key: 'draft_done', label: 'Brouillon' },
  { key: 'qa_done', label: 'QA' },
  { key: 'published', label: 'Publié' },
] as const;

export const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  serp_done: 1,
  brief_done: 2,
  outline_done: 3,
  images_done: 4,
  draft_done: 5,
  qa_done: 6,
  published: 7,
  failed: -1,
};

export const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  serp_done: { label: 'SERP OK', variant: 'default', className: 'bg-blue-600' },
  brief_done: { label: 'Brief OK', variant: 'default', className: 'bg-blue-600' },
  outline_done: { label: 'Plan OK', variant: 'default', className: 'bg-blue-600' },
  images_done: { label: 'Images OK', variant: 'default', className: 'bg-blue-600' },
  draft_done: { label: 'Brouillon prêt', variant: 'default', className: 'bg-orange-500' },
  qa_done: { label: 'QA Validé', variant: 'default', className: 'bg-green-600' },
  published: { label: 'Publié', variant: 'default', className: 'bg-green-800' },
  failed: { label: 'Erreur', variant: 'destructive' },
};

export interface ExpandedKeyword {
  keyword: string;
  intent: string;
  funnel_stage: string;
  serp_format: string;
  estimated_priority: number;
  rationale: string;
}

/** Map status → next edge function to call */
export const NEXT_STEP: Record<string, { fn: string; label: string; payload: (a: SeoArticle) => Record<string, unknown> } | null> = {
  pending: null, // handled at creation
  serp_done: { fn: 'seo-brief', label: 'Générer le brief', payload: (a) => ({ article_id: a.id }) },
  brief_done: { fn: 'seo-outline', label: 'Créer le plan', payload: (a) => ({ article_id: a.id }) },
  outline_done: { fn: 'seo-image-gen', label: 'Générer les images', payload: (a) => ({ article_id: a.id }) },
  images_done: { fn: 'seo-draft', label: 'Rédiger l\'article', payload: (a) => ({ article_id: a.id, cta_url: window.location.origin }) },
  draft_done: { fn: 'seo-qa', label: 'Lancer le QA', payload: (a) => ({ article_id: a.id }) },
};

export const AUTO_PIPELINE_SEQUENCE = ['seo-serp-research', 'seo-brief', 'seo-outline', 'seo-image-gen', 'seo-draft', 'seo-qa'] as const;
export const AUTO_PIPELINE_LABELS = ['SERP', 'Brief', 'Plan', 'Images', 'Brouillon', 'QA'] as const;
