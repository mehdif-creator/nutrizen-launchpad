/**
 * Shopping list normalization, merging, and categorization utilities.
 *
 * Pipeline:
 *  1. Parse each raw line into { name, qty, unit }
 *  2. Normalize ingredient name (strip prep adjectives)
 *  3. Convert heterogeneous units to grams when possible
 *  4. Merge juice references into whole-fruit equivalents
 *  5. Group by normalizedName → sum quantities
 *  6. Assign category
 *  7. Format display string
 */

// --------------------------------------------------------------------------
// 1. Normalization
// --------------------------------------------------------------------------

const PREP_WORDS_RE =
  /\b(râpée?s?|émincée?s?|coupée?s?|haché?e?s?|frais|fraîche?s?|en fines? tranches?|en lamelles?|en dés|en rondelles?|en morceaux|nouveau|nouvelle|nouveaux|nouvelles|ciselée?s?|pelée?s?|tranchée?s?|fondues?|séchée?s?|surgelée?s?|décortiquée?s?|nettoyée?s?|lavée?s?|pressée?s?|égoutée?s?|égouttée?s?|finement|grossièrement)\b/gi;

const LEADING_DE = /^d[e'u]\s+/i;
const TRAILING_S_RE = /s$/;

export function normalizeIngredientName(name: string): string {
  let n = name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(PREP_WORDS_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Strip leading "de ", "d'"
  n = n.replace(LEADING_DE, '').trim();

  // Remove trailing plural 's' for matching (but keep irregular words)
  // Only strip if word is >3 chars to avoid breaking "riz", "sel", etc.
  if (n.length > 3 && TRAILING_S_RE.test(n)) {
    n = n.replace(/s$/, '');
  }

  return n;
}

// --------------------------------------------------------------------------
// 2. Piece-to-gram conversion
// --------------------------------------------------------------------------

const PIECE_TO_GRAMS: Record<string, number> = {
  carotte: 80,
  concombre: 300,
  citron: 80,
  'citron vert': 70,
  oignon: 110,
  'oignon nouveau': 80,
  'oignon rouge': 110,
  tomate: 120,
  courgette: 200,
  aubergine: 250,
  poivron: 150,
  'gousse d\'ail': 5,
  'ail': 5,
  'oeuf': 60,
  'œuf': 60,
  pomme: 150,
  poire: 150,
  banane: 120,
  orange: 180,
  mangue: 200,
  avocat: 170,
  'pomme de terre': 150,
  'patate douce': 200,
  betterave: 200,
  navet: 120,
  fenouil: 250,
  artichaut: 120,
  poireau: 200,
  'échalote': 30,
  céleri: 40,
};

function findPieceWeight(norm: string): number | null {
  // Exact match first
  if (PIECE_TO_GRAMS[norm] !== undefined) return PIECE_TO_GRAMS[norm];
  // Partial match
  for (const [key, val] of Object.entries(PIECE_TO_GRAMS)) {
    if (norm.includes(key) || key.includes(norm)) return val;
  }
  return null;
}

/** Convert a quantity to grams when possible. Returns null if can't convert. */
export function toGrams(
  qty: number,
  unit: string,
  normName: string,
): { grams: number } | null {
  const u = unit.toLowerCase().trim();
  if (u === 'g' || u === 'gr') return { grams: qty };
  if (u === 'kg') return { grams: qty * 1000 };
  if (u === '' || u === 'pièce' || u === 'piece') {
    const w = findPieceWeight(normName);
    if (w) return { grams: qty * w };
  }
  return null;
}

// --------------------------------------------------------------------------
// 3. Juice → whole fruit conversion
// --------------------------------------------------------------------------

// ml of juice per whole fruit
const JUICE_PER_FRUIT: Record<string, number> = {
  citron: 30,
  'citron vert': 25,
  orange: 80,
};

const JUICE_RE =
  /^jus\s+de\s+(.+)$/i;

const TBSP_RE = /c\.\s*à\s*s(?:oupe)?|cuillère[s]?\s*à\s*soupe|tbsp/i;
const TSP_RE = /c\.\s*à\s*c(?:afé)?|cuillère[s]?\s*à\s*café|tsp/i;

function isJuiceOf(normName: string): string | null {
  const m = normName.match(JUICE_RE);
  if (m) {
    const fruit = normalizeIngredientName(m[1]);
    if (JUICE_PER_FRUIT[fruit] !== undefined) return fruit;
  }
  // Also handle "jus citron", "jus de citron vert"
  for (const fruit of Object.keys(JUICE_PER_FRUIT)) {
    if (normName.includes('jus') && normName.includes(fruit)) return fruit;
  }
  return null;
}

function spoonToMl(unit: string, qty: number): number | null {
  if (TBSP_RE.test(unit)) return qty * 15;
  if (TSP_RE.test(unit)) return qty * 5;
  return null;
}

// --------------------------------------------------------------------------
// 4. Category assignment
// --------------------------------------------------------------------------

// Order matters: first match wins. More specific keywords first.
const CATEGORY_RULES: Array<[RegExp, string]> = [
  // Viandes & Poissons
  [/agneau|boeuf|bœuf|porc|veau|dinde|poulet|canard|lapin|magret|entrecôte|escalope|filet de .*(poulet|dinde|porc|boeuf|bœuf)/i, 'Viandes & Poissons'],
  [/saumon|thon|cabillaud|crevette|moule|sardine|truite|bar|lieu|merlu|colin|sole|dorade|gambas|calamars?|poisson|anchois|maquereau/i, 'Viandes & Poissons'],

  // Fruits & Légumes (must come before Épicerie to catch "oignon" etc.)
  [/oignon|carotte|concombre|courgette|aubergine|poivron|tomate|brocoli|chou|épinard|salade|laitue|radis|betterave|poireau|asperge|artichaut|fenouil|navet|céleri|champignon|endive|cresson|roquette|mâche|haricot[s]?\s*vert/i, 'Fruits & Légumes'],
  [/citron|orange|pomme(?! de terre)|poire|banane|mangue|ananas|fraise|framboise|raisin|melon|pastèque|kiwi|abricot|pêche|prune|avocat|grenade|figue/i, 'Fruits & Légumes'],
  [/ail|échalote|gingembre|citronnelle/i, 'Fruits & Légumes'],
  [/persil|coriandre|basilic|menthe|ciboulette|aneth|estragon|cerfeuil|thym frais|romarin frais/i, 'Fruits & Légumes'],

  // Féculents
  [/riz|pâte[s]?|spaghetti|nouille|ramen|quinoa|semoule|boulgour|pain|farine|pomme[s]?\s*de\s*terre|patate|lentille|pois\s*chiche|haricot[s]?\s*(?:rouge|blanc|noir|sec)|couscous|tapioca|gnocchi|tortilla|blé|maïs|avoine|flocon|muesli|céréale/i, 'Féculents'],

  // Produits laitiers
  [/lait|fromage|crème(?! de coco)|beurre|yaourt|yogourt|feta|mozzarella|parmesan|gruyère|ricotta|mascarpone|chèvre|comté|emmental|roquefort|camembert|reblochon/i, 'Produits laitiers'],

  // Épicerie
  [/huile|vinaigre|sel|poivre|épice|sucre|miel|sauce|bouillon|moutarde|ketchup|mayonnaise|tahini|soja|miso|curry|cumin|paprika|thym|romarin|basilic sec|origan|cannelle|muscade|safran|piment|harissa|concentré|conserve|coulis|maïzena|fécule|levure|bicarbonate|gélatine|agar|vanille|cacao|chocolat|confiture|sirop|cornichon|câpre|olive|noix|amande|noisette|pistache|sésame|cacahuète|pignon|graine/i, 'Épicerie'],
  [/crème\s*de\s*coco|lait\s*de\s*coco|coconut/i, 'Épicerie'],

  // Boissons
  [/eau|jus(?! de citron)|boisson|café|thé|vin|bière|cidre/i, 'Boissons'],
];

export const CATEGORY_ORDER = [
  'Viandes & Poissons',
  'Fruits & Légumes',
  'Féculents',
  'Produits laitiers',
  'Épicerie',
  'Boissons',
  'Divers',
];

export const CATEGORY_ICONS: Record<string, string> = {
  'Fruits & Légumes': '🥦',
  'Viandes & Poissons': '🥩',
  'Produits laitiers': '🧀',
  'Féculents': '🍚',
  'Épicerie': '🫙',
  'Boissons': '🥤',
  'Divers': '📦',
};

export function getCategory(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(lower)) return cat;
  }
  return 'Divers';
}

// --------------------------------------------------------------------------
// 5. Quantity formatting
// --------------------------------------------------------------------------

export function formatShoppingQty(grams: number | null, unit: string, qty: number): string {
  if (grams !== null) {
    if (grams >= 1000) {
      const kg = Math.round(grams / 100) / 10;
      return `${kg} kg`;
    }
    return `${Math.round(grams)}g`;
  }
  // Non-gram units — keep as-is with rounding
  if (qty < 10) {
    const rounded = Math.round(qty * 10) / 10;
    return `${rounded}${unit ? ' ' + unit : ''}`;
  }
  return `${Math.round(qty)}${unit ? ' ' + unit : ''}`;
}

// --------------------------------------------------------------------------
// 6. Main merge pipeline
// --------------------------------------------------------------------------

export interface RawShoppingItem {
  ingredient_name: string;
  total_quantity: number;
  unit: string;
  formatted_display: string;
}

export interface MergedShoppingItem {
  displayName: string;
  displayQty: string;
  category: string;
  normalizedKey: string;
}

interface Bucket {
  grams: number;
  nonGramQty: number;
  nonGramUnit: string;
  hasGrams: boolean;
  displayNames: string[];
}

export function mergeShoppingItems(raw: RawShoppingItem[]): MergedShoppingItem[] {
  const buckets = new Map<string, Bucket>();

  for (const item of raw) {
    const norm = normalizeIngredientName(item.ingredient_name);

    // Check if this is juice that should merge into whole fruit
    const fruitBase = isJuiceOf(norm);
    let effectiveNorm = fruitBase ?? norm;
    let effectiveQty = item.total_quantity;
    let effectiveUnit = item.unit;

    if (fruitBase) {
      // Convert juice spoons → ml → whole fruit count
      const ml = spoonToMl(item.unit, item.total_quantity);
      if (ml !== null) {
        const perFruit = JUICE_PER_FRUIT[fruitBase] ?? 30;
        effectiveQty = ml / perFruit;
        effectiveUnit = '';
      }
    }

    const bucket = buckets.get(effectiveNorm) ?? {
      grams: 0,
      nonGramQty: 0,
      nonGramUnit: '',
      hasGrams: false,
      displayNames: [],
    };

    // Try to convert to grams
    const converted = toGrams(effectiveQty, effectiveUnit, effectiveNorm);
    if (converted) {
      bucket.grams += converted.grams;
      bucket.hasGrams = true;
    } else {
      // Can't convert – accumulate in original unit
      bucket.nonGramQty += effectiveQty;
      if (!bucket.nonGramUnit && effectiveUnit) bucket.nonGramUnit = effectiveUnit;
    }

    // Collect display name variants (prefer the longest / most descriptive)
    if (!bucket.displayNames.includes(item.ingredient_name)) {
      bucket.displayNames.push(item.ingredient_name);
    }

    buckets.set(effectiveNorm, bucket);
  }

  // Build final list
  const results: MergedShoppingItem[] = [];

  for (const [normKey, bucket] of buckets) {
    // Pick display name: prefer shortest clean form, capitalize
    const bestName = pickDisplayName(bucket.displayNames, normKey);
    const category = getCategory(bestName);

    let displayQty: string;

    if (bucket.hasGrams && bucket.nonGramQty > 0) {
      // Mixed: show grams + extra
      const gPart = formatShoppingQty(bucket.grams, 'g', bucket.grams);
      const oPart = formatShoppingQty(null, bucket.nonGramUnit, bucket.nonGramQty);
      displayQty = `${gPart} + ${oPart}`;
    } else if (bucket.hasGrams) {
      displayQty = formatShoppingQty(bucket.grams, 'g', bucket.grams);
    } else {
      displayQty = formatShoppingQty(null, bucket.nonGramUnit, bucket.nonGramQty);
    }

    results.push({
      displayName: bestName,
      displayQty,
      category,
      normalizedKey: normKey,
    });
  }

  // Sort by category order, then alphabetically
  results.sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
    return a.displayName.localeCompare(b.displayName, 'fr');
  });

  return results;
}

function pickDisplayName(variants: string[], normKey: string): string {
  // Pick the variant that, once lowered, is closest to the normKey length
  // (i.e. the simplest form without prep words)
  let best = variants[0] ?? normKey;
  let bestScore = Infinity;

  for (const v of variants) {
    const score = Math.abs(v.length - normKey.length);
    if (score < bestScore) {
      bestScore = score;
      best = v;
    }
  }

  // Capitalize first letter
  return best.charAt(0).toUpperCase() + best.slice(1);
}
