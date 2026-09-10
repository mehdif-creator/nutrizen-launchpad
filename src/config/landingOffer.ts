/** Marketing display only; Stripe remains responsible for coupon eligibility. */
export const RENTREE_OFFER = {
  code: 'RENTREE50',
  // Valid through September 30 inclusive in metropolitan France (Europe/Paris).
  expiresAt: '2026-10-01T00:00:00+02:00',
  deadlineLabel: '30 septembre 2026 inclus',
} as const;

export const isRentreeOfferActive = (now = Date.now()) =>
  now < Date.parse(RENTREE_OFFER.expiresAt);

export const RECIPE_CATALOG_COPY = {
  title: 'Près de 4 000 recettes disponibles',
  updates: 'Des centaines de nouvelles recettes ajoutées régulièrement.',
} as const;