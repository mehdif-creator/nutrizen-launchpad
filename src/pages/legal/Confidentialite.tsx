import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function Confidentialite() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => {}} />
      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <h1>Politique de confidentialité</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 1er janvier 2025</p>
          <h2>1. Collecte des données</h2>
          <p>Nous collectons les données suivantes : email, nom, préférences alimentaires.</p>
          <h2>2. Utilisation des données</h2>
          <p>Vos données sont utilisées uniquement pour fournir nos services.</p>
          <h2>3. Sécurité</h2>
          <p>Nous utilisons le chiffrement SSL et sommes conformes RGPD.</p>
          <h2>4. Vos droits</h2>
          <p>Vous pouvez accéder, modifier ou supprimer vos données à tout moment.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
