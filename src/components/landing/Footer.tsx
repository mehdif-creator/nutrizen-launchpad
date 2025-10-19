import { Shield, Lock, CreditCard } from 'lucide-react';

export const Footer = () => {
  const footerSections = [
    {
      title: 'NutriZen',
      links: [
        { label: 'Fonctionnalités', href: '/#avantages' },
        { label: 'Tarifs', href: '/#tarifs' },
        { label: 'Témoignages', href: '/#temoignages' },
        { label: 'FAQ', href: '/#faq' },
        { label: 'Contact', href: '/contact' }
      ]
    },
    {
      title: 'Légal',
      links: [
        { label: 'CGV', href: '/legal/cgv' },
        { label: 'Confidentialité', href: '/legal/confidentialite' },
        { label: 'Mentions légales', href: '/legal/mentions' }
      ]
    }
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src={new URL('@/assets/nutrizen-main-logo.png', import.meta.url).href}
                alt="NutriZen Logo" 
                className="h-12 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Menus adaptés à tes objectifs en 30 secondes.<br />
              Sans passer des heures à réfléchir, planifier et calculer.
            </p>
            <a 
              href="/auth/signup"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:scale-[1.02] transition-tech text-sm"
            >
              Commencer mon plan gratuit
            </a>
          </div>

          {/* Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-tech"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment & Security */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>RGPD</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>SSL</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span>Stripe Secure</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 NutriZen. Tous droits réservés.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer :</strong> NutriZen est un assistant d'organisation de repas, pas un professionnel de santé. 
            Les informations fournies ne constituent pas un avis médical. Consulte un médecin ou diététicien(ne) pour des conseils personnalisés.
          </p>
        </div>
      </div>
    </footer>
  );
};
