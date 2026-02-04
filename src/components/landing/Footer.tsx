import { Shield, Lock, CreditCard, Cookie } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { openCookieSettings } from '@/components/common/CookieConsent';

export const Footer = () => {
  const { t } = useLanguage();
  
  const footerSections = [
    {
      title: t('footer.resources'),
      links: [
        { label: t('footer.blog'), href: '/blog' },
        { label: t('footer.faq'), href: '/#faq' },
        { label: t('footer.contact'), href: '/contact' }
      ]
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.cgv'), href: '/legal/cgv' },
        { label: t('footer.privacy'), href: '/legal/confidentialite' },
        { label: t('footer.mentions'), href: '/legal/mentions' }
      ]
    },
    {
      title: t('footer.company'),
      links: [
        { label: t('footer.about'), href: '/#' },
        { label: t('footer.contact'), href: '/contact' },
        { label: 'Programme d\'affiliation', href: '/affiliate' }
      ]
    },
    {
      title: t('footer.offers'),
      links: [
        { label: t('footer.fit'), href: '/fit' },
        { label: t('footer.mum'), href: '/mum' },
        { label: t('footer.pro'), href: '/pro' }
      ]
    }
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand - spanning 2 columns on desktop */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src={new URL('@/assets/nutrizen-main-logo.png', import.meta.url).href}
                alt="NutriZen Logo" 
                className="h-16 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Links - 2 columns layout */}
          <div className="grid grid-cols-2 sm:col-span-2 lg:col-span-4 gap-8">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="font-semibold mb-4 text-sm md:text-base">{section.title}</h3>
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
        </div>

        {/* Payment & Security */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t">
          <div className="flex items-center gap-4 flex-wrap">
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
            <button
              onClick={openCookieSettings}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Paramètres des cookies"
            >
              <Cookie className="w-4 h-4" />
              <span>Paramètres cookies</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('footer.copyright')}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer :</strong> {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
};
