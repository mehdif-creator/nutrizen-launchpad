import GuideLayout from './GuideLayout';

export default function Defi7Jours() {
  return (
    <GuideLayout
      metaTitle="Défi Healthy 7 Jours — NutriZen"
      title="Défi Healthy : 7 Jours pour une Nouvelle Habitude"
      subtitle="Relève le défi et prends soin de toi en une semaine !"
      badgeColor="#2A7D6F"
      pdfUrl="LIEN_PDF_DEFI_7_JOURS"
      points={[
        { emoji: '💧', text: 'Jour 1 — Hydratation & vitamines' },
        { emoji: '🍫', text: 'Jour 2 — Réduire le sucre ajouté' },
        { emoji: '🧘', text: 'Jour 3 — Manger en pleine conscience' },
        { emoji: '🏃', text: 'Jour 4 — Bouger +20 minutes' },
        { emoji: '🍳', text: 'Jour 5 — Cuisiner maison' },
        { emoji: '🥗', text: 'Jour 6 — Découverte nutrition' },
        { emoji: '🏆', text: 'Jour 7 — Bilan bien-être' },
      ]}
    />
  );
}
