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

const LEADING_DE = /^(?:de|du|des|d'|la|le|les|l')\s+/i;
const TRAILING_S_RE = /s$/;

export function normalizeIngredientName(name: string): string {
  let n = name
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[.,;:]/g, ' ')
    .replace(/[’]/g, "'")
    .replace(PREP_WORDS_RE, ' ')
    .replace(/\b(?:r[aâ]p[eé]e?s?|é?minc[eé]e?s?|coup[eé]e?s?|hach[eé]e?s?|frais|fra[iî]che?s?|en fines? tranches?|en lamelles?|en d[eé]s|en rondelles?|en morceaux)\b/gi, ' ')
    .replace(/\s+(?:coup[eé]e?s?|hach[eé]e?s?|r[aâ]p[eé]e?s?|é?minc[eé]e?s?).*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Strip leading "de", "du", "d'", articles
  n = n.replace(LEADING_DE, '').trim();

  // Remove trailing plural 's' for matching (but keep common non-plural endings)
  if (n.length > 3 && TRAILING_S_RE.test(n) && !/(ais|ois|ous|us|is|as)$/.test(n)) {
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

const PREFER_COUNT_ITEMS = [
  "gousse d'ail",
  'ail',
  'oeuf',
  'œuf',
  'citron',
  'citron vert',
  'orange',
];

function shouldKeepAsCount(norm: string): boolean {
  return PREFER_COUNT_ITEMS.some((k) => norm === k || norm.includes(k));
}

function findPieceWeight(norm: string): number | null {
  // Exact match first
  if (PIECE_TO_GRAMS[norm] !== undefined) return PIECE_TO_GRAMS[norm];
  // Partial match
  for (const [key, val] of Object.entries(PIECE_TO_GRAMS)) {
    if (norm.includes(key) || key.includes(norm)) return val;
  }
  return null;
}

/** Normalize unit aliases used across RPC and UI. */
function canonicalizeUnit(unit: string): string {
  const u = unit.toLowerCase().trim();
  if (!u || u === 'pièce' || u === 'piece' || u === 'pcs' || u === 'pc') return 'piece';
  if (u === 'gr' || u === 'gramme' || u === 'grammes') return 'g';
  if (u === 'kilogramme' || u === 'kilogrammes') return 'kg';
  if (u === 'millilitre' || u === 'millilitres') return 'ml';
  if (u === 'centilitre' || u === 'centilitres') return 'cl';
  if (u === 'litre' || u === 'litres') return 'l';
  if (/^(tbsp|c\.?\s*à\s*s(?:oupe)?|cuillère[s]?\s*à\s*soupe|càs|cas)$/i.test(u)) return 'tbsp';
  if (/^(tsp|c\.?\s*à\s*c(?:afé)?|cuillère[s]?\s*à\s*café|càc|cac)$/i.test(u)) return 'tsp';
  if (/^(pincée|pincee|pinch|pincées|pincees)$/.test(u)) return 'pinch';
  return u;
}

/** Convert a quantity to grams when possible. Returns null if can't convert. */
export function toGrams(
  qty: number,
  unit: string,
  normName: string,
): { grams: number } | null {
  const u = canonicalizeUnit(unit);
  if (u === 'g') return { grams: qty };
  if (u === 'kg') return { grams: qty * 1000 };
  if (u === 'piece') {
    if (shouldKeepAsCount(normName)) return null;
    const w = findPieceWeight(normName);
    if (w) return { grams: qty * w };
  }
  return null;
}

/** Convert compatible volume units to ml when possible. */
function toMilliliters(qty: number, unit: string): number | null {
  const u = canonicalizeUnit(unit);
  if (u === 'ml') return qty;
  if (u === 'cl') return qty * 10;
  if (u === 'l') return qty * 1000;
  if (u === 'tbsp') return qty * 15;
  if (u === 'tsp') return qty * 5;
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

const INLINE_TBSP_RE =
  /^(?:c\.?\s*à\s*s(?:oupe)?|cuillère[s]?\s*à\s*soupe|tbsp)\s*(?:de\s+|d')?(.+)$/i;
const INLINE_TSP_RE =
  /^(?:c\.?\s*à\s*c(?:afé)?|cuillère[s]?\s*à\s*café|tsp)\s*(?:de\s+|d')?(.+)$/i;

function extractInlineUnitFromName(name: string): { cleanName: string; inlineUnit: string | null } {
  const trimmed = name.trim();
  const tbsp = trimmed.match(INLINE_TBSP_RE);
  if (tbsp) return { cleanName: tbsp[1].trim(), inlineUnit: 'tbsp' };

  const tsp = trimmed.match(INLINE_TSP_RE);
  if (tsp) return { cleanName: tsp[1].trim(), inlineUnit: 'tsp' };

  return { cleanName: trimmed, inlineUnit: null };
}

function spoonToMl(unit: string, qty: number): number | null {
  const u = canonicalizeUnit(unit);
  if (u === 'tbsp') return qty * 15;
  if (u === 'tsp') return qty * 5;
  if (u === 'ml') return qty;
  if (u === 'cl') return qty * 10;
  return null;
}

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

// --------------------------------------------------------------------------
// 4. Category assignment
// --------------------------------------------------------------------------

// Order matters: first match wins. More specific keywords first.
const CATEGORY_RULES: Array<[RegExp, string]> = [
  // Viandes & Poissons
  [/\b(agneau|boeuf|bœuf|porc|veau|dinde|poulet|canard|lapin|magret|entrecôte|escalope)\b|\bfilet de\s+.*\b(poulet|dinde|porc|boeuf|bœuf)\b/i, 'Viandes & Poissons'],
  [/\b(saumon|thon|cabillaud|crevette|moule|sardine|truite|bar|lieu|merlu|colin|sole|dorade|gambas|calamars?|poisson|anchois|maquereau)\b/i, 'Viandes & Poissons'],

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

function formatCompactNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}`;
  return rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
}

function roundCountQuantity(qty: number): number {
  if (qty <= 4) return Math.round(qty * 2) / 2;
  return Math.round(qty);
}

function formatSpoonOrPinchFromMl(ml: number): string {
  // Less than 0.1 tsp ≈ 0.5 ml => display pinch
  if (ml < 0.5) return '1 pincée';

  const roundQuarter = (n: number) => Math.max(0.25, Math.round(n * 4) / 4);

  if (ml >= 12.5) {
    const tbsp = roundQuarter(ml / 15);
    return `${formatCompactNumber(tbsp)} c. à soupe`;
  }

  const tsp = roundQuarter(ml / 5);
  return `${formatCompactNumber(tsp)} c. à café`;
}

function formatVolumeQty(ml: number, preferSpoons: boolean): string {
  if (preferSpoons) return formatSpoonOrPinchFromMl(ml);
  if (ml < 0.5) return '1 pincée';
  if (ml >= 1000) {
    const liters = Math.round((ml / 1000) * 10) / 10;
    return `${formatCompactNumber(liters)} l`;
  }
  return `${Math.round(ml)} ml`;
}

export function formatShoppingQty(grams: number | null, unit: string, qty: number): string {
  if (grams !== null) {
    if (grams >= 1000) {
      const kg = Math.round(grams / 100) / 10;
      return `${formatCompactNumber(kg)} kg`;
    }
    return `${Math.round(grams)}g`;
  }

  const u = canonicalizeUnit(unit);
  if (u === 'piece') {
    return formatCompactNumber(roundCountQuantity(qty));
  }

  if (u === 'tbsp' || u === 'tsp' || u === 'ml' || u === 'cl' || u === 'l') {
    const ml = toMilliliters(qty, u);
    if (ml !== null) return formatVolumeQty(ml, u === 'tbsp' || u === 'tsp');
  }

  if (qty < 10) {
    const rounded = Math.round(qty * 10) / 10;
    return `${formatCompactNumber(rounded)}${u ? ' ' + u : ''}`;
  }
  return `${Math.round(qty)}${u ? ' ' + u : ''}`;
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
  volumeMl: number;
  countQty: number;
  otherUnits: Record<string, number>;
  hasSpoonSource: boolean;
  displayNames: string[];
}

export function mergeShoppingItems(raw: RawShoppingItem[]): MergedShoppingItem[] {
  const buckets = new Map<string, Bucket>();

  for (const item of raw) {
    const { cleanName, inlineUnit } = extractInlineUnitFromName(item.ingredient_name);
    const norm = normalizeIngredientName(cleanName);

    // Check if this is juice that should merge into whole fruit
    const fruitBase = isJuiceOf(norm);
    let effectiveNorm = fruitBase ?? norm;
    let effectiveQty = item.total_quantity;
    let effectiveUnit = canonicalizeUnit(item.unit ?? '');

    // Recover spoon units accidentally parsed as "piece" in backend
    if (inlineUnit && (effectiveUnit === 'piece' || !effectiveUnit)) {
      effectiveUnit = inlineUnit;
    }

    if (fruitBase) {
      // Convert juice spoon/volume → ml → whole fruit count
      const ml = spoonToMl(effectiveUnit, effectiveQty) ?? toMilliliters(effectiveQty, effectiveUnit);
      if (ml !== null) {
        const perFruit = JUICE_PER_FRUIT[fruitBase] ?? 30;
        effectiveQty = ml / perFruit;
        effectiveUnit = 'piece';
      }
    }

    const bucket = buckets.get(effectiveNorm) ?? {
      grams: 0,
      volumeMl: 0,
      countQty: 0,
      otherUnits: {},
      hasSpoonSource: false,
      displayNames: [],
    };

    // Try to convert to grams
    const converted = toGrams(effectiveQty, effectiveUnit, effectiveNorm);
    if (converted) {
      bucket.grams += converted.grams;
    } else {
      // Try to normalize all volume-like units to ml
      const volumeMl = toMilliliters(effectiveQty, effectiveUnit);
      if (volumeMl !== null) {
        bucket.volumeMl += volumeMl;
        if (effectiveUnit === 'tbsp' || effectiveUnit === 'tsp') bucket.hasSpoonSource = true;
      } else if (effectiveUnit === 'piece' || effectiveUnit === '') {
        bucket.countQty += effectiveQty;
      } else {
        bucket.otherUnits[effectiveUnit] = (bucket.otherUnits[effectiveUnit] ?? 0) + effectiveQty;
      }
    }

    // Collect display name variants (prefer clean and descriptive names)
    const displayCandidate = cleanName || item.ingredient_name;
    if (!bucket.displayNames.includes(displayCandidate)) {
      bucket.displayNames.push(displayCandidate);
    }

    buckets.set(effectiveNorm, bucket);
  }

  // Build final list
  const results: MergedShoppingItem[] = [];

  for (const [normKey, bucket] of buckets) {
    const bestName = pickDisplayName(bucket.displayNames, normKey);
    const category = getCategory(bestName);

    const qtyParts: string[] = [];

    if (bucket.grams > 0) {
      qtyParts.push(formatShoppingQty(bucket.grams, 'g', bucket.grams));
    }

    if (bucket.volumeMl > 0) {
      qtyParts.push(formatVolumeQty(bucket.volumeMl, bucket.hasSpoonSource));
    }

    if (bucket.countQty > 0) {
      qtyParts.push(formatShoppingQty(null, 'piece', bucket.countQty));
    }

    for (const [unit, qty] of Object.entries(bucket.otherUnits).sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
      if (qty > 0) qtyParts.push(formatShoppingQty(null, unit, qty));
    }

    const displayQty = qtyParts.join(' + ');

    results.push({
      displayName: bestName,
      displayQty,
      category,
      normalizedKey: normKey,
    });
  }

  // Sort by category order, then alphabetically within category
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
