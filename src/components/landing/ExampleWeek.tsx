import dashboardPreview from '@/assets/dashboard-preview.png';

export const ExampleWeek = () => {
  return (
    <section id="exemples" className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">À quoi ressemble une semaine ?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez un aperçu réel de votre tableau de bord NutriZen : menus de la semaine,
            recettes, macros et liste de courses — le tout personnalisé.
          </p>
        </div>

        {/* Dashboard preview — framed mockup, height-capped so it ne prend pas tout l'écran */}
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-xl border border-border bg-background shadow-card overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-muted-foreground truncate">
                mynutrizen.fr / tableau-de-bord
              </span>
            </div>

            {/* Image scrollable, hauteur limitée pour ne pas envahir l'écran */}
            <div className="max-h-[70vh] overflow-y-auto bg-background">
              <img
                src={dashboardPreview}
                alt="Aperçu du tableau de bord NutriZen avec les menus de la semaine, recettes et liste de courses"
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>

            {/* Fondu en bas pour suggérer le scroll */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Vos menus sont adaptés à vos objectifs et préférences. Vous pouvez changer chaque repas.
          </p>
        </div>
      </div>
    </section>
  );
};
