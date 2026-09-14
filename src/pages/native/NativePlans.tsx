import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NATIVE_OFFER_CARDS, type NativeOfferChoice } from '@/config/nativeOffers';
import { saveNativePlanIntent } from '@/lib/native/nativeStartup';

/**
 * Public native plans preview (Capacitor only, no authentication required).
 * Same cards as NativePaywall, but every CTA leads to account creation —
 * no purchase is ever attempted before signup/login.
 */
export default function NativePlans() {
  const navigate = useNavigate();

  const pick = async (choice: NativeOfferChoice) => {
    // UI intent only; the real plan is resolved from Supabase after onboarding.
    await saveNativePlanIntent(choice);
    navigate('/auth/signup?plan=free');
  };

  const ctaLabel = (choice: NativeOfferChoice, title: string) =>
    choice === 'free' ? 'Commencer gratuitement' : `Choisir ${title}`;

  return (
    <div className="min-h-screen bg-background px-4 py-8 safe-area">
      <div className="mx-auto w-full max-w-md space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Nos formules</h1>
          <p className="text-sm text-muted-foreground">
            Créez votre compte pour commencer, sans paiement immédiat.
          </p>
        </header>

        <div className="space-y-4">
          {NATIVE_OFFER_CARDS.map((card) => (
            <Card
              key={card.choice}
              className={`p-5 ${card.highlight ? 'border-primary border-2' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-card-foreground">{card.title}</h2>
                <span className="text-base font-bold text-primary whitespace-nowrap">
                  {card.priceLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>

              <ul className="mt-4 space-y-2">
                {card.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-card-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-5 w-full h-12 text-base"
                variant={card.highlight ? 'default' : 'outline'}
                onClick={() => pick(card.choice)}
              >
                {ctaLabel(card.choice, card.title)}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" className="min-h-[44px]" onClick={() => navigate('/auth/login')}>
            J'ai déjà un compte
          </Button>
        </div>
      </div>
    </div>
  );
}
