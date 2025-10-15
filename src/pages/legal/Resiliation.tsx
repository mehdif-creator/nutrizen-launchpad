import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function Resiliation() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => {}} />
      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <h1>Résiliation</h1>
          <h2>Comment résilier ?</h2>
          <p>Tu peux résilier ton abonnement en 3 clics depuis tes paramètres ou via le portail Stripe.</p>
          <h2>Quand la résiliation prend-elle effet ?</h2>
          <p>La résiliation est immédiate mais tu gardes l'accès jusqu'à la fin de ta période payée.</p>
          <h2>Remboursement</h2>
          <p>Garantie 30 jours satisfait ou remboursé si aucun temps gagné.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
