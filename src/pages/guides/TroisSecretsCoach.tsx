import GuideLayout from './GuideLayout';

export default function TroisSecretsCoach() {
  return (
    <GuideLayout
      metaTitle="Les 3 Secrets de Coach — NutriZen"
      title="Les 3 Secrets de Coach pour Manger Sain au Quotidien"
      subtitle="Planification, assiette équilibrée, écoute de soi — sans régime ni frustration"
      badgeColor="#1A2E35"
      pdfUrl="https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/guides/Les%203%20secrets%20de%20coach%20pour%20manger%20sain%20au%20quotidien.pdf"
      points={[
        { emoji: '🗓️', text: "Secret #1 — Prévoir, c'est la clé : le meal planning en 30 min le dimanche" },
        { emoji: '🍽️', text: "Secret #2 — L'assiette idéalement équilibrée : la méthode ½ légumes · ¼ protéines · ¼ féculents" },
        { emoji: '🧠', text: "Secret #3 — Écouter son corps (pas les calories) : l'échelle de la faim et le mindful eating" },
      ]}
    />
  );
}
