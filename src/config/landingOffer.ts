/** Marketing display only; Stripe remains responsible for coupon eligibility. */
export const OCTOBRE_OFFER = {
  code: 'OCTOBRE50',
  // Valid through October 31 inclusive in metropolitan France (Europe/Paris).
  expiresAt: '2026-11-01T00:00:00+01:00',
  deadlineLabel: '31 octobre 2026 inclus',
} as const;

export const isOctobreOfferActive = (now = Date.now()) =>
  now < Date.parse(OCTOBRE_OFFER.expiresAt);

export const RECIPE_CATALOG_COPY = {
  title: 'Près de 5 000 recettes disponibles',
  updates: 'Des centaines de nouvelles recettes ajoutées régulièrement.',
} as const;