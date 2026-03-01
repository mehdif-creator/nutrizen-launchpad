-- Persist fixed parse_ingredient_line (French multi-word units)
DROP FUNCTION IF EXISTS public.parse_ingredient_line(text);
CREATE OR REPLACE FUNCTION public.parse_ingredient_line(raw_line text)
RETURNS TABLE(quantity numeric, canonical_unit text, ingredient_name text)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  cleaned text; qty_text text; rest text;
  parsed_qty numeric; parsed_unit text; parsed_name text;
BEGIN
  IF raw_line IS NULL OR trim(raw_line) = '' THEN RETURN; END IF;
  cleaned := regexp_replace(trim(raw_line), '\([^)]*\)', '', 'g');
  cleaned := trim(regexp_replace(cleaned, '\s+', ' ', 'g'));
  IF cleaned = '' THEN RETURN; END IF;
  IF cleaned ~* '^(sel(\s+et\s+poivre)?|poivre)\s*(au\s+go[uû]t|à\s+volonté)?\s*$' THEN
    quantity := 1; canonical_unit := 'pinch'; ingredient_name := trim(cleaned); RETURN NEXT; RETURN;
  END IF;
  cleaned := trim(regexp_replace(cleaned, '(au\s+go[uû]t|à\s+volonté)', '', 'gi'));
  IF cleaned ~* '^quelques\s+' THEN
    parsed_qty := 1; parsed_unit := 'bunch';
    cleaned := trim(regexp_replace(cleaned, '^quelques\s+', '', 'i'));
    cleaned := trim(regexp_replace(cleaned, '^(feuilles?|brins?|tiges?|branches?)\s+(de\s+|d'')?', '', 'i'));
    quantity := parsed_qty; canonical_unit := parsed_unit; ingredient_name := cleaned; RETURN NEXT; RETURN;
  END IF;
  IF cleaned ~* '^un\s+peu\s+de\s+' THEN
    cleaned := trim(regexp_replace(cleaned, '^un\s+peu\s+de\s+', '', 'i'));
    quantity := 1; canonical_unit := 'pinch'; ingredient_name := cleaned; RETURN NEXT; RETURN;
  END IF;
  qty_text := substring(cleaned from '^\s*(\d+\s+\d+/\d+|\d+[,\.]\d+|\d+/\d+|\d+)');
  IF qty_text IS NOT NULL THEN
    IF qty_text ~ '^\d+\s+\d+/\d+' THEN
      parsed_qty := (regexp_replace(qty_text,'^(\d+)\s+(\d+)/(\d+)$','\1'))::numeric
                 + (regexp_replace(qty_text,'^(\d+)\s+(\d+)/(\d+)$','\2'))::numeric
                 / (regexp_replace(qty_text,'^(\d+)\s+(\d+)/(\d+)$','\3'))::numeric;
    ELSIF qty_text ~ '/' THEN
      parsed_qty := split_part(qty_text,'/',1)::numeric / split_part(qty_text,'/',2)::numeric;
    ELSE
      parsed_qty := replace(qty_text,',','.')::numeric;
    END IF;
    rest := trim(substring(cleaned from length(qty_text)+1));
  ELSE
    parsed_qty := 1; rest := cleaned;
  END IF;
  IF rest ~* '^(cuillères?\s+à\s+soupe|cuillères?\s+a\s+soupe|c[\.\s]?à[\.\s]?s[\.\s]?|càs|c\.a\.s|tbsp)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'tbsp';
    rest := trim(regexp_replace(rest,'^(cuillères?\s+à\s+soupe|cuillères?\s+a\s+soupe|c[\.\s]?à[\.\s]?s[\.\s]?|càs|c\.a\.s|tbsp)\s*(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(cuillères?\s+à\s+café|cuillères?\s+a\s+cafe|c[\.\s]?à[\.\s]?c[\.\s]?|càc|c\.a\.c|tsp)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'tsp';
    rest := trim(regexp_replace(rest,'^(cuillères?\s+à\s+café|cuillères?\s+a\s+cafe|c[\.\s]?à[\.\s]?c[\.\s]?|càc|c\.a\.c|tsp)\s*(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^gousses?\s+(d''|de\s+|d'')?' THEN
    parsed_unit := 'piece';
    rest := 'gousse d''' || trim(regexp_replace(rest, '^gousses?\s+(d''|de\s+|d'')?', '', 'i'));
  ELSIF rest ~* '^grammes?\s*(de\s+|d''|d'')?' OR rest ~* '^g\M\s*(de\s+|d''|d'')?' THEN
    IF rest ~* '^\d+\s*g\M' AND parsed_qty = 1 THEN
      qty_text := substring(rest from '^\d+'); parsed_qty := qty_text::numeric;
      rest := trim(substring(rest from length(qty_text)+1));
    END IF;
    parsed_unit := 'g';
    rest := trim(regexp_replace(rest,'^(grammes?|g\M)\s*(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(kilogrammes?|kg)\M\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'kg';
    rest := trim(regexp_replace(rest,'^(kilogrammes?|kg)\s*(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(millilitres?|ml)\M\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'ml';
    rest := trim(regexp_replace(rest,'^(millilitres?|ml)\s*(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(centilitres?|cl)\M\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'ml'; parsed_qty := parsed_qty * 10;
    rest := trim(regexp_replace(rest,'^(centilitres?|cl)\s*(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(litres?|l)\M\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'l';
    rest := trim(regexp_replace(rest,'^(litres?|l)\s*(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(tranches?|morceaux?|filets?|steaks?)\s+(de\s+|d''|d'')?' THEN
    parsed_unit := 'piece';
    rest := trim(regexp_replace(rest,'^(tranches?|morceaux?|filets?|steaks?)\s+(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(bottes?|bouquets?)\s+(de\s+|d''|d'')?' THEN
    parsed_unit := 'bunch';
    rest := trim(regexp_replace(rest,'^(bottes?|bouquets?)\s+(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(sachets?|boîtes?|conserves?)\s+(de\s+|d''|d'')?' THEN
    parsed_unit := 'package';
    rest := trim(regexp_replace(rest,'^(sachets?|boîtes?|conserves?)\s+(de\s+|d''|d'')?','','i'));
  ELSIF rest ~* '^(pincées?|pincee?s?)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'pinch';
    rest := trim(regexp_replace(rest,'^(pincées?|pincee?s?)\s*(de\s+|d''|d'')?','','i'));
  ELSE
    IF rest ~* '^(g|ml|kg|cl|l)\M\s*(de\s+|d''|d'')?' THEN
      CASE lower(substring(rest from '^[a-z]+'))
        WHEN 'g'  THEN parsed_unit := 'g';
        WHEN 'kg' THEN parsed_unit := 'kg';
        WHEN 'ml' THEN parsed_unit := 'ml';
        WHEN 'cl' THEN parsed_unit := 'ml'; parsed_qty := parsed_qty * 10;
        WHEN 'l'  THEN parsed_unit := 'l';
        ELSE parsed_unit := 'piece';
      END CASE;
      rest := trim(regexp_replace(rest,'^[a-z]+\s*(de\s+|d''|d'')?','','i'));
    ELSE
      parsed_unit := 'piece';
      rest := trim(regexp_replace(rest,'^(de\s+|d''|d'')','','i'));
    END IF;
  END IF;
  parsed_name := trim(regexp_replace(rest,'[,;]+$',''));
  parsed_name := trim(regexp_replace(parsed_name,'\s+',' ','g'));
  IF parsed_name = '' OR parsed_name ~* '^(facultatif|optionnel|selon|environ|env\.)' THEN RETURN; END IF;
  quantity := parsed_qty; canonical_unit := parsed_unit; ingredient_name := parsed_name;
  RETURN NEXT;
END;
$$;

-- Persist fixed get_shopping_list_from_weekly_menu (unit normalization + plurals)
CREATE OR REPLACE FUNCTION public.get_shopping_list_from_weekly_menu(
  p_user_id uuid,
  p_week_start date DEFAULT NULL
)
RETURNS TABLE(ingredient_name text, total_quantity numeric, unit text, formatted_display text)
LANGUAGE plpgsql STABLE SET search_path = public
AS $$
DECLARE v_week_start date;
BEGIN
  v_week_start := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date);
  RETURN QUERY
  WITH menu_items AS (
    SELECT uwmi.recipe_id, uwmi.portion_factor, r.ingredients as recipe_ingredients
    FROM public.user_weekly_menus uwm
    JOIN public.user_weekly_menu_items uwmi ON uwmi.weekly_menu_id = uwm.menu_id
    JOIN public.recipes r ON r.id = uwmi.recipe_id
    WHERE uwm.user_id = p_user_id AND uwm.week_start = v_week_start AND r.ingredients IS NOT NULL
  ),
  ingredient_lines AS (
    SELECT mi.portion_factor,
      CASE
        WHEN jsonb_typeof(ing) = 'string' THEN ing #>> '{}'
        WHEN jsonb_typeof(ing) = 'object' AND ing ? 'name' THEN ing ->> 'name'
        WHEN jsonb_typeof(ing) = 'object' AND ing ? 'ingredient' THEN ing ->> 'ingredient'
        ELSE NULL
      END as raw_line
    FROM menu_items mi
    CROSS JOIN LATERAL jsonb_array_elements(mi.recipe_ingredients) as ing
  ),
  parsed_ingredients AS (
    SELECT il.portion_factor, p.quantity,
      CASE WHEN p.canonical_unit = 'cl' THEN 'ml' ELSE p.canonical_unit END as canonical_unit,
      CASE WHEN p.canonical_unit = 'cl' THEN p.quantity * 10 ELSE p.quantity END as adj_quantity,
      public.normalize_str(p.ingredient_name) as normalized_name,
      p.ingredient_name as display_name
    FROM ingredient_lines il
    CROSS JOIN LATERAL public.parse_ingredient_line(il.raw_line) p
    WHERE il.raw_line IS NOT NULL AND il.raw_line != ''
      AND p.ingredient_name IS NOT NULL AND p.quantity > 0
  ),
  aggregated AS (
    SELECT normalized_name, canonical_unit,
      SUM(adj_quantity * portion_factor) as total_qty,
      (array_agg(display_name ORDER BY length(display_name) DESC))[1] as display_name
    FROM parsed_ingredients
    GROUP BY normalized_name, canonical_unit
    HAVING SUM(adj_quantity * portion_factor) > 0.05
  ),
  display_ready AS (
    SELECT display_name, normalized_name,
      CASE
        WHEN canonical_unit = 'ml' AND total_qty >= 1000 THEN 'l'
        WHEN canonical_unit = 'l'  AND total_qty < 1    THEN 'ml'
        ELSE canonical_unit
      END as display_unit,
      CASE
        WHEN canonical_unit = 'ml' AND total_qty >= 1000 THEN ROUND(total_qty / 1000, 2)
        WHEN canonical_unit = 'l'  AND total_qty < 1    THEN ROUND(total_qty * 1000, 0)
        ELSE ROUND(total_qty, 1)
      END as display_qty
    FROM aggregated
  )
  SELECT
    dr.display_name as ingredient_name,
    dr.display_qty as total_quantity,
    dr.display_unit as unit,
    CASE
      WHEN dr.display_unit = 'tbsp' THEN
        CASE WHEN dr.display_qty <= 1 THEN '1 c. à soupe de ' ELSE ROUND(dr.display_qty,0)::text || ' c. à soupe de ' END || dr.display_name
      WHEN dr.display_unit = 'tsp' THEN
        CASE WHEN dr.display_qty <= 1 THEN '1 c. à café de ' ELSE ROUND(dr.display_qty,0)::text || ' c. à café de ' END || dr.display_name
      WHEN dr.display_unit = 'g'   THEN ROUND(dr.display_qty,0)::text || ' g de ' || dr.display_name
      WHEN dr.display_unit = 'kg'  THEN dr.display_qty::text || ' kg de ' || dr.display_name
      WHEN dr.display_unit = 'ml'  THEN ROUND(dr.display_qty,0)::text || ' ml de ' || dr.display_name
      WHEN dr.display_unit = 'l'   THEN dr.display_qty::text || ' l de ' || dr.display_name
      WHEN dr.display_unit = 'pinch' THEN
        CASE WHEN dr.display_qty <= 1 THEN 'Une pincée de ' ELSE ROUND(dr.display_qty,0)::text || ' pincées de ' END || dr.display_name
      WHEN dr.display_unit = 'bunch' THEN
        CASE WHEN dr.display_qty <= 1 THEN '1 botte de ' ELSE ROUND(dr.display_qty,0)::text || ' bottes de ' END || dr.display_name
      WHEN dr.display_unit = 'package' THEN ROUND(dr.display_qty,0)::text || ' sachet(s) de ' || dr.display_name
      WHEN dr.display_unit = 'piece' THEN
        CASE
          WHEN dr.display_qty <= 1 THEN '1 ' || dr.display_name
          ELSE ROUND(dr.display_qty,0)::text || ' ' ||
            regexp_replace(
              regexp_replace(
                regexp_replace(dr.display_name, '^gousse\s+', 'gousses ', 'i'),
              '^tranche\s+', 'tranches ', 'i'),
            '^morceau\s+', 'morceaux ', 'i')
        END
      ELSE dr.display_qty::text || ' ' || dr.display_unit || ' de ' || dr.display_name
    END as formatted_display
  FROM display_ready dr
  WHERE dr.display_qty > 0
  ORDER BY
    CASE
      WHEN dr.display_unit IN ('g','kg') AND dr.display_name ~* '(poulet|boeuf|porc|saumon|thon|cabillaud|crevette|viande|poisson)' THEN 1
      WHEN dr.display_unit IN ('g','kg') THEN 2
      WHEN dr.display_name ~* '(tomate|carotte|oignon|ail|courgette|poivron|épinard|salade|brocoli|champignon|concombre)' THEN 3
      WHEN dr.display_unit IN ('ml','l','cl') THEN 5
      WHEN dr.display_unit IN ('tbsp','tsp','pinch') THEN 6
      ELSE 4
    END,
    dr.display_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shopping_list_from_weekly_menu(uuid, date) TO authenticated;