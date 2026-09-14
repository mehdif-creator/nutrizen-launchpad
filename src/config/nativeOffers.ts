/**
 * Native (Capacitor) offer cards — shared by the authenticated paywall
 * (`src/pages/native/NativePaywall.tsx`) and the public plans preview
 * (`src/pages/native/NativePlans.tsx`) so both always show the same offers.
 *
 * Derived from the existing NutriZen offers in `src/config/pricing.ts`.
 * Never used on the web.
 */
import { PLANS, TRIAL, formatEUR } from '@/config/pricing';

/** UI-only identifiers for the three native cards. */
export type NativeOfferChoice = 'free' | 'premium' | 'premium_plus';

export interface NativeOfferCard {
  choice: NativeOfferChoice;
  title: string;
  priceLabel: string;
  subtitle: string;
  features: string[];
  highlight?: boolean;
}

export const NATIVE_OFFER_CARDS: NativeOfferCard[] = [
  {
    choice: 'free',
    title: 'Free',
    priceLabel: 'Gratuit',
    subtitle: `${TRIAL.days} jours pour tester · ${TRIAL.credits} crédits offerts`,
    features: [
      `${TRIAL.credits} crédits offerts`,
      'Sans carte bancaire',
      'Accès aux recettes et à la liste de courses',
    ],
  },
  {
    choice: 'premium',
    title: 'Premium',
    priceLabel: `${formatEUR(PLANS.starter.monthlyPrice)} / mois`,
    subtitle: PLANS.starter.tagline,
    features: [
      `${PLANS.starter.credits} crédits par mois`,
      `Report jusqu'à ${PLANS.starter.rolloverCap} crédits`,
      'Menus illimités pour votre famille',
    ],
    highlight: true,
  },
  {
    choice: 'premium_plus',
    title: 'Premium+',
    priceLabel: `${formatEUR(PLANS.premium.monthlyPrice)} / mois`,
    subtitle: PLANS.premium.tagline,
    features: [
      `${PLANS.premium.credits} crédits par mois`,
      `Report jusqu'à ${PLANS.premium.rolloverCap} crédits`,
      'Tous les outils IA (Scan repas, Inspi Frigo, code-barres)',
    ],
  },
];
