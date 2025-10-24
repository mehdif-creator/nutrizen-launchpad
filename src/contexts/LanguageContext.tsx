import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'fr' | 'en' | 'es' | 'de';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    'preheader.trial': '🎉 Essai gratuit 7 jours — Aucune CB requise — Garantie temps-gagné 30j',
    'signup.title': 'Commencer avec NutriZen',
    'signup.subtitle': 'Choisis ta formule pour créer ton compte',
    'signup.info': 'Pour garantir la qualité de notre service, la création de compte se fait uniquement via Stripe.',
    'signup.benefit': '🎁 7 jours d\'essai gratuit · Aucune carte bancaire requise',
    'signup.viewPlans': 'Voir les formules',
    'signup.hasAccount': 'Déjà un compte ?',
    'signup.login': 'Se connecter',
    'signup.backHome': '← Retour à l\'accueil',
  },
  en: {
    'preheader.trial': '🎉 7-day free trial — No credit card required — 30-day time-saved guarantee',
    'signup.title': 'Get Started with NutriZen',
    'signup.subtitle': 'Choose your plan to create your account',
    'signup.info': 'To ensure the quality of our service, account creation is done exclusively via Stripe.',
    'signup.benefit': '🎁 7-day free trial · No credit card required',
    'signup.viewPlans': 'View Plans',
    'signup.hasAccount': 'Already have an account?',
    'signup.login': 'Sign in',
    'signup.backHome': '← Back to home',
  },
  es: {
    'preheader.trial': '🎉 Prueba gratuita de 7 días — Sin tarjeta de crédito — Garantía de tiempo ahorrado de 30 días',
    'signup.title': 'Comienza con NutriZen',
    'signup.subtitle': 'Elige tu plan para crear tu cuenta',
    'signup.info': 'Para garantizar la calidad de nuestro servicio, la creación de cuentas se realiza exclusivamente a través de Stripe.',
    'signup.benefit': '🎁 Prueba gratuita de 7 días · Sin tarjeta de crédito requerida',
    'signup.viewPlans': 'Ver Planes',
    'signup.hasAccount': '¿Ya tienes una cuenta?',
    'signup.login': 'Iniciar sesión',
    'signup.backHome': '← Volver al inicio',
  },
  de: {
    'preheader.trial': '🎉 7 Tage kostenlose Testversion — Keine Kreditkarte erforderlich — 30-Tage-Zeitersparnis-Garantie',
    'signup.title': 'Starte mit NutriZen',
    'signup.subtitle': 'Wähle deinen Plan, um dein Konto zu erstellen',
    'signup.info': 'Um die Qualität unseres Services zu gewährleisten, erfolgt die Kontoerstellung ausschließlich über Stripe.',
    'signup.benefit': '🎁 7 Tage kostenlose Testversion · Keine Kreditkarte erforderlich',
    'signup.viewPlans': 'Pläne ansehen',
    'signup.hasAccount': 'Hast du bereits ein Konto?',
    'signup.login': 'Anmelden',
    'signup.backHome': '← Zurück zur Startseite',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('nutrizen-language') as Language;
    return stored || 'fr';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('nutrizen-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
