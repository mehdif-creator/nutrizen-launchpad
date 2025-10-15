export const PreHeader = () => {
  return (
    <div className="w-full bg-gradient-to-r from-primary to-accent text-white">
      <div className="container py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <span className="font-medium">
            Première semaine gratuite — aucune CB requise
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <a href="#faq" className="hover:underline text-white/90">
            FAQ
          </a>
          <a href="/auth" className="hover:underline text-white/90">
            Se connecter
          </a>
        </div>
      </div>
    </div>
  );
};
