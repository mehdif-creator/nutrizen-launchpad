import GuideLayout from './GuideLayout';

export default function Programme21Jours() {
  return (
    <GuideLayout
      metaTitle="Programme 21 Jours en Forme — NutriZen"
      title="Programme 21 Jours en Forme"
      subtitle="3 semaines pour retrouver la forme et le sourire"
      badgeColor="#E07B39"
      pdfUrl="https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/guides/Programme%2021%20Jours%20en%20Forme.pdf"
      points={[
        { emoji: '🌱', text: 'Semaine 1 — Les Fondations : hydratation, légumes, protéines' },
        { emoji: '🔥', text: 'Semaine 2 — Montée en Puissance : renforcement, batch cooking, cardio' },
        { emoji: '🏆', text: 'Semaine 3 — Consolidation : autonomie, zéro ultra-transformé, repas plaisir' },
        { emoji: '📋', text: 'Tableaux de suivi hebdomadaires inclus' },
        { emoji: '🥗', text: 'Recette express Salade Énergie au Quinoa offerte' },
      ]}
    />
  );
}
