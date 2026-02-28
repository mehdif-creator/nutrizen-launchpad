-- Complete rewrite of parse_ingredient_line for French ingredient strings
DROP FUNCTION IF EXISTS public.parse_ingredient_line(text);

CREATE OR REPLACE FUNCTION public.parse_ingredient_line(raw_line text)
RETURNS TABLE(
  quantity numeric,
  canonical_unit text,
  ingredient_name text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  qty_text text;
  rest text;
  parsed_qty numeric;
  parsed_unit text;
  parsed_name text;
BEGIN
  IF raw_line IS NULL OR trim(raw_line) = '' THEN RETURN; END IF;

  -- Clean: remove parenthetical annotations like "(jus)", "(type coquillettes)"
  cleaned := regexp_replace(trim(raw_line), '\([^)]*\)', '', 'g');
  cleaned := trim(regexp_replace(cleaned, '\s+', ' ', 'g'));

  IF cleaned = '' THEN RETURN; END IF;

  -- Handle "au goût", "à volonté", "quelques", "un peu de"
  IF cleaned ~* '^\s*(sel(\s+et\s+poivre)?|poivre)\s*(au\s+goût|à\s+volonté)?\s*$' THEN
    quantity  := 1; canonical_unit := 'pinch'; ingredient_name := trim(cleaned);
    RETURN NEXT; RETURN;
  END IF;
  IF cleaned ~* '(au\s+goût|à\s+volonté)' THEN
    cleaned := trim(regexp_replace(cleaned, '(au\s+goût|à\s+volonté)', '', 'gi'));
  END IF;
  IF cleaned ~* '^quelques\s+' THEN
    parsed_qty  := 1;
    parsed_unit := 'bunch';
    cleaned := trim(regexp_replace(cleaned, '^quelques\s+', '', 'i'));
    cleaned := trim(regexp_replace(cleaned, '^(feuilles?|brins?|tiges?|branches?)\s+(de\s+|d'')?', '', 'i'));
    quantity := parsed_qty; canonical_unit := parsed_unit; ingredient_name := cleaned;
    RETURN NEXT; RETURN;
  END IF;
  IF cleaned ~* '^un\s+peu\s+de\s+' THEN
    cleaned := trim(regexp_replace(cleaned, '^un\s+peu\s+de\s+', '', 'i'));
    quantity := 1; canonical_unit := 'pinch'; ingredient_name := cleaned;
    RETURN NEXT; RETURN;
  END IF;

  -- STEP 1: Extract leading quantity
  qty_text := substring(cleaned from '^\s*(\d+\s+\d+/\d+|\d+[,\.]\d+|\d+/\d+|\d+)');
  IF qty_text IS NOT NULL THEN
    IF qty_text ~ '^\d+\s+\d+/\d+' THEN
      parsed_qty := (regexp_replace(qty_text, '^(\d+)\s+(\d+)/(\d+)$', '\1'))::numeric
                 + (regexp_replace(qty_text, '^(\d+)\s+(\d+)/(\d+)$', '\2'))::numeric
                 / (regexp_replace(qty_text, '^(\d+)\s+(\d+)/(\d+)$', '\3'))::numeric;
    ELSIF qty_text ~ '/' THEN
      parsed_qty := split_part(qty_text, '/', 1)::numeric
                 / split_part(qty_text, '/', 2)::numeric;
    ELSE
      parsed_qty := replace(qty_text, ',', '.')::numeric;
    END IF;
    rest := trim(substring(cleaned from length(qty_text) + 1));
  ELSE
    parsed_qty := 1;
    rest := cleaned;
  END IF;

  -- STEP 2: Identify unit (multi-word French units first)

  -- Tablespoon
  IF rest ~* '^(cuillères?\s+à\s+soupe|cuillères?\s+a\s+soupe|c[\.\s]?à[\.\s]?s[\.\s]?|càs|c\.a\.s|tbsp)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'tbsp';
    rest := trim(regexp_replace(rest,
      '^(cuillères?\s+à\s+soupe|cuillères?\s+a\s+soupe|c[\.\s]?à[\.\s]?s[\.\s]?|càs|c\.a\.s|tbsp)\s*(de\s+|d''|d'')?',
      '', 'i'));

  -- Teaspoon
  ELSIF rest ~* '^(cuillères?\s+à\s+café|cuillères?\s+a\s+cafe|c[\.\s]?à[\.\s]?c[\.\s]?|càc|c\.a\.c|tsp)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'tsp';
    rest := trim(regexp_replace(rest,
      '^(cuillères?\s+à\s+café|cuillères?\s+a\s+cafe|c[\.\s]?à[\.\s]?c[\.\s]?|càc|c\.a\.c|tsp)\s*(de\s+|d''|d'')?',
      '', 'i'));

  -- Weight: g/kg
  ELSIF rest ~* '^(grammes?|g)\s*(de\s+|d''|d'')?' OR
        rest ~* '^\d+\s*(grammes?|g)\b' THEN
    IF rest ~* '^\d+\s*g\b' AND parsed_qty = 1 THEN
      qty_text := substring(rest from '^\d+');
      parsed_qty := qty_text::numeric;
      rest := trim(substring(rest from length(qty_text) + 1));
    END IF;
    parsed_unit := 'g';
    rest := trim(regexp_replace(rest, '^(grammes?|g)\s*(de\s+|d''|d'')?', '', 'i'));

  ELSIF rest ~* '^(kilogrammes?|kg)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'kg';
    rest := trim(regexp_replace(rest, '^(kilogrammes?|kg)\s*(de\s+|d''|d'')?', '', 'i'));

  -- Volume
  ELSIF rest ~* '^(millilitres?|ml)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'ml';
    rest := trim(regexp_replace(rest, '^(millilitres?|ml)\s*(de\s+|d''|d'')?', '', 'i'));

  ELSIF rest ~* '^(centilitres?|cl)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'cl';
    rest := trim(regexp_replace(rest, '^(centilitres?|cl)\s*(de\s+|d''|d'')?', '', 'i'));

  ELSIF rest ~* '^(litres?|l)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'l';
    rest := trim(regexp_replace(rest, '^(litres?|l)\s*(de\s+|d''|d'')?', '', 'i'));

  -- Count units
  ELSIF rest ~* '^(tranches?|morceaux?|filets?|steaks?)\s+(de\s+|d''|d'')?' THEN
    parsed_unit := 'piece';
    rest := trim(regexp_replace(rest, '^(tranches?|morceaux?|filets?|steaks?)\s+(de\s+|d''|d'')?', '', 'i'));

  ELSIF rest ~* '^(gousses?)\s+(d''|de\s+|d'')?' THEN
    parsed_unit := 'piece';
    rest := trim(regexp_replace(rest, '^gousses?\s+(d''|de\s+|d'')?', '', 'i'));

  ELSIF rest ~* '^(bottes?|bouquets?)\s+(de\s+|d''|d'')?' THEN
    parsed_unit := 'bunch';
    rest := trim(regexp_replace(rest, '^(bottes?|bouquets?)\s+(de\s+|d''|d'')?', '', 'i'));

  ELSIF rest ~* '^(sachets?|boîtes?|conserves?)\s+(de\s+|d''|d'')?' THEN
    parsed_unit := 'package';
    rest := trim(regexp_replace(rest, '^(sachets?|boîtes?|conserves?)\s+(de\s+|d''|d'')?', '', 'i'));

  ELSIF rest ~* '^(pincées?|pincee?s?)\s*(de\s+|d''|d'')?' THEN
    parsed_unit := 'pinch';
    rest := trim(regexp_replace(rest, '^(pincées?|pincee?s?)\s*(de\s+|d''|d'')?', '', 'i'));

  ELSE
    IF rest ~* '^(g|ml|kg|cl|l)\s+(de\s+|d''|d'')?' THEN
      CASE lower(substring(rest from '^[a-z]+'))
        WHEN 'g'  THEN parsed_unit := 'g';
        WHEN 'kg' THEN parsed_unit := 'kg';
        WHEN 'ml' THEN parsed_unit := 'ml';
        WHEN 'cl' THEN parsed_unit := 'cl';
        WHEN 'l'  THEN parsed_unit := 'l';
        ELSE parsed_unit := 'piece';
      END CASE;
      rest := trim(regexp_replace(rest, '^[a-z]+\s+(de\s+|d''|d'')?', '', 'i'));
    ELSE
      parsed_unit := 'piece';
      rest := trim(regexp_replace(rest, '^(de\s+|d''|d'')', '', 'i'));
    END IF;
  END IF;

  -- STEP 3: Handle "Xg" glued format
  IF parsed_qty = 1 AND rest ~* '^\d+\s*(g|kg|ml|cl|l)\b' THEN
    qty_text := substring(rest from '^\d+');
    parsed_qty := qty_text::numeric;
    rest := trim(substring(rest from length(qty_text) + 1));
    IF rest ~* '^(g|kg|ml|cl|l)\s*(de\s+|d''|d'')?' THEN
      CASE lower(substring(rest from '^[a-z]+'))
        WHEN 'g'  THEN parsed_unit := 'g';
        WHEN 'kg' THEN parsed_unit := 'kg';
        WHEN 'ml' THEN parsed_unit := 'ml';
        WHEN 'cl' THEN parsed_unit := 'cl';
        WHEN 'l'  THEN parsed_unit := 'l';
        ELSE NULL;
      END CASE;
      rest := trim(regexp_replace(rest, '^[a-z]+\s*(de\s+|d''|d'')?', '', 'i'));
    END IF;
  END IF;

  -- STEP 4: Clean up the name
  parsed_name := trim(regexp_replace(rest, '[,;]+$', ''));
  parsed_name := trim(regexp_replace(parsed_name, '\s+', ' ', 'g'));

  IF parsed_name = '' OR parsed_name ~* '^(facultatif|optionnel|selon|environ|env\.)' THEN
    RETURN;
  END IF;

  quantity        := parsed_qty;
  canonical_unit  := parsed_unit;
  ingredient_name := parsed_name;
  RETURN NEXT;
END;
$$;