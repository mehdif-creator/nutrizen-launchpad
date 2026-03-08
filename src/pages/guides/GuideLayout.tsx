import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface GuidePoint {
  emoji: string;
  text: string;
}

interface GuideLayoutProps {
  title: string;
  subtitle: string;
  badgeColor: string;
  points: GuidePoint[];
  pdfUrl: string;
  metaTitle: string;
}

export default function GuideLayout({ title, subtitle, badgeColor, points, pdfUrl, metaTitle }: GuideLayoutProps) {
  useEffect(() => {
    document.title = metaTitle;
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      (meta as HTMLMetaElement).name = 'robots';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.title = 'NutriZen — Menus personnalisés';
      meta?.setAttribute('content', '');
    };
  }, [metaTitle]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 py-4">
        <div className="mx-auto max-w-[680px] px-4 flex items-center gap-2">
          <img src="/favicon.png" alt="NutriZen" className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">NutriZen</span>
        </div>
      </header>

      <main className="mx-auto max-w-[680px] px-4 py-12 space-y-10">
        {/* Hero */}
        <section className="text-center space-y-5">
          <Badge className="text-sm px-3 py-1 text-white" style={{ backgroundColor: badgeColor }}>
            Guide gratuit
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{title}</h1>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
            <Button size="lg" className="mt-2 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="mr-2 h-5 w-5" />
              📥 Télécharger mon guide PDF
            </Button>
          </a>
        </section>

        {/* Points clés */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Ce que vous allez découvrir</h2>
          <ul className="space-y-3">
            {points.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/90">
                <span className="text-xl leading-none mt-0.5">{p.emoji}</span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Second CTA */}
        <section className="text-center">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
            <Button size="lg" className="text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="mr-2 h-5 w-5" />
              📥 Télécharger maintenant — c'est gratuit
            </Button>
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
        © 2026 NutriZen · mynutrizen.fr · Ce guide est informatif et ne remplace pas un avis médical.
      </footer>
    </div>
  );
}
