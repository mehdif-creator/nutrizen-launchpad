import GuideLayout from './GuideLayout';

export default function FrigoZen() {
  return (
    <GuideLayout
      metaTitle="Le Frigo Zen — NutriZen"
      title="Le Frigo Zen"
      subtitle="20 aliments à toujours avoir pour improviser des repas sains en 5 minutes"
      badgeColor="#2A7D6F"
      pdfUrl="LIEN_PDF_FRIGO_ZEN"
      points={[
        { emoji: '✅', text: 'Les 10 indispensables du frigo' },
        { emoji: '✅', text: 'Les 10 essentiels du placard' },
        { emoji: '✅', text: '7 idées repas prêtes en 5 à 10 minutes' },
        { emoji: '✅', text: 'Le plan Batch 60 min = 3 dîners' },
        { emoji: '✅', text: 'La checklist imprimable à coller sur le frigo' },
      ]}
    />
  );
}
