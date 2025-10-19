export const PreHeader = () => {
  return (
    <div className="w-full bg-gradient-to-r from-primary to-accent text-white">
      <div className="container py-2.5 flex items-center justify-center md:justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <span className="font-semibold">
            Essai gratuit 7 jours — Aucune CB requise — Garantie temps-gagné 30j
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <a href="/#faq" className="hover:underline text-white/90 transition-colors">
            FAQ
          </a>
          <a href="/auth/login" className="hover:underline text-white/90 transition-colors">
            Se connecter
          </a>
        </div>
      </div>
    </div>
  );
};
