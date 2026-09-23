import { Button } from "@/components/ui/button";
import { Star, Check, Shield, ArrowRight, TrendingDown } from "lucide-react";
import fitHeroImage from "@/assets/fit-hero.jpg";
import { HeroTopOffer, MobileHeroPromotion } from '@/components/landing/HeroTopOffer';

interface FitHeroProps {
  onCtaClick: () => void;
}

export const FitHero = ({ onCtaClick }: FitHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-[#0d1f1a] text-white">
      {/* Background image with fade */}
      <div className="absolute inset-0 z-0">
        <img
          src={fitHeroImage}
          alt="Sportif préparant un repas fit avec NutriZen"
          className="absolute right-0 top-0 h-full w-full object-cover object-right md:w-[65%] lg:w-[60%]"
          width={1280}
          height={1280}
          fetchPriority="high"
          decoding="sync"
          loading="eager"
        />
        {/* Gradient fade left -> image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #0d1f1a 0%, #0d1f1a 35%, rgba(13,31,26,0.85) 50%, rgba(13,31,26,0.2) 70%, rgba(13,31,26,0) 100%)",
          }}
        />
        {/* Mobile bottom fade */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-t from-[#0d1f1a] via-[#0d1f1a]/80 to-[#0d1f1a]/20" />
      </div>

      <div className="container relative z-10 py-8 md:py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="min-w-0 space-y-4 max-w-xl md:space-y-6">
            <HeroTopOffer />

            {/* Persona pills */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs md:text-sm">
              <span className="text-emerald-400 font-semibold">PERTE DE POIDS</span>
              <span className="text-white/30">•</span>
              <span className="text-orange-400 font-semibold">PRISE DE MUSCLE</span>
              <span className="text-white/30">•</span>
              <span className="text-emerald-400 font-semibold">PERFORMANCE</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Mange pour{" "}
              <span className="relative text-emerald-400">
                performer
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M0,5 Q50,0 100,4 T200,3"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-emerald-400"
                  />
                </svg>
              </span>
              .
              <br />
              Pas pour deviner.
            </h1>

            <p className="text-base md:text-lg text-white/70 leading-relaxed">
              NutriZen Fit crée des plans de nutrition adaptés à tes objectifs et à ton mode de vie, avec des recettes
              simples, un suivi intelligent et des ajustements en temps réel.
            </p>

            <MobileHeroPromotion />

            <ul className="space-y-3 pt-2">
              {[
                {
                  bold: "Objectifs sur mesure",
                  text: ": perte de poids, prise de muscle, maintien",
                },
                { bold: "Plans & recettes adaptés", text: " à tes goûts et ton emploi du temps" },
                { bold: "Suivi intelligent", text: ": calories, macros, progression, habitudes" },
                { bold: "Coaching IA", text: " qui s'ajuste à tes résultats" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm md:text-base">
                  <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </span>
                  <span className="text-white/90">
                    <strong className="text-white">{item.bold}</strong>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-2 space-y-3">
              <Button
                onClick={onCtaClick}
                size="lg"
                className="h-auto w-full max-w-full whitespace-normal sm:w-auto bg-gradient-to-r from-emerald-500 to-orange-500 hover:from-emerald-400 hover:to-orange-400 text-white font-semibold text-base md:text-lg px-8 py-6 rounded-xl shadow-[0_8px_30px_rgba(251,146,60,0.3)] active:scale-[0.99] transition-all min-h-[56px] group"
              >
                Créer mon plan nutritionnel personnalisé
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="flex items-center gap-2 text-sm text-white/70">
                <Shield className="w-4 h-4 text-white/50" />
                <span>Plan 100% adapté à toi</span>
                <span className="text-white/30">•</span>
                <span>Sans engagement</span>
              </div>
            </div>

            <div className="pt-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <span className="font-semibold text-white">4,8/5</span>
                <span className="text-white/60 text-sm"></span>
              </div>
              <p className="text-xs md:text-sm text-white/50">
                +2 000 utilisateurs accompagnés • Résultats concrets • N°1 en nutrition personnalisée
              </p>
            </div>
          </div>

          {/* Right: Floating badges over the image */}
          <div className="relative hidden lg:block h-[500px]">
            {/* Top right badge */}
            <div className="absolute top-4 right-0 bg-[#0d1f1a]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-2xl font-bold text-white">-10KG</div>
                  <div className="text-xs text-white/60">en 10 semaines</div>
                </div>
              </div>
            </div>

            {/* Bottom badge */}
            <div className="absolute bottom-4 left-1/4 bg-[#0d1f1a]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl animate-fade-in">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400">156g</div>
                <div className="text-xs text-white/70 mt-0.5">
                  Protéines
                  <br />
                  aujourd'hui
                </div>
                <div className="mt-2 h-1 w-20 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-emerald-500 to-orange-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
