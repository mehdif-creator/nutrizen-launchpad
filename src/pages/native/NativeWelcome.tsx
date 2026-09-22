import { useNavigate } from 'react-router-dom';
import { Sparkles, UtensilsCrossed, ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markNativeIntroSeen } from '@/lib/native/nativeStartup';
import logo from '@/assets/nutrizen-main-logo.png';

/**
 * Native-only welcome screen. Replaces the marketing landing page as the very
 * first screen inside the Capacitor app. Never rendered on the web.
 */
export default function NativeWelcome() {
  const navigate = useNavigate();

  const go = async (path: string) => {
    await markNativeIntroSeen();
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10 safe-area">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <img src={logo} alt="NutriZen" width={96} height={96} className="h-24 w-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Bienvenue sur NutriZen</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Vos menus de la semaine, vos courses et vos recettes, adaptés à votre famille.
          </p>
        </div>

        <ul className="w-full max-w-xs space-y-3 text-left">
          {[
            { icon: UtensilsCrossed, text: 'Près de 5 000 recettes disponibles' },
            { icon: Sparkles, text: 'Menus générés selon votre profil' },
            { icon: ShoppingBasket, text: 'Liste de courses automatique' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-xl bg-card p-3 border">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm text-card-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {/* Native: never the Stripe checkout signup — the paywall comes after onboarding. */}
        <Button className="w-full h-12 text-base" onClick={() => go('/auth/signup?plan=free')}>
          Commencer
        </Button>

        <Button
          variant="outline"
          className="w-full h-12 text-base"
          onClick={() => go('/auth/login')}
        >
          J'ai déjà un compte
        </Button>
      </div>
    </div>
  );
}
