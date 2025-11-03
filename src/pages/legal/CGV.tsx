import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function CGV() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => {}} />

      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <h1>Conditions Générales de Vente</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 1er janvier 2025</p>

          <h2>1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent la vente des services proposés par NutriZen sur
            le site nutrizen.fr.
          </p>

          <h2>2. Services proposés</h2>
          <p>NutriZen propose trois formules d'abonnement mensuel :</p>
          <ul>
            <li>Essentiel : 14,99 € / mois</li>
            <li>Équilibre : 19,99 € / mois</li>
            <li>Premium : 29,99 € / mois</li>
          </ul>

          <h2>3. Période d'essai</h2>
          <p>Tous les nouveaux utilisateurs bénéficient d'une période d'essai gratuite de 7 jours.</p>

          <h2>4. Modalités de paiement</h2>
          <p>
            Les paiements sont sécurisés et traités par Stripe. Les modes de paiement acceptés incluent les cartes
            bancaires (Visa, Mastercard, American Express).
          </p>

          <h2>5. Renouvellement et résiliation</h2>
          <p>
            L'abonnement est reconduit tacitement chaque mois. Vous pouvez résilier à tout moment depuis votre espace
            personnel. La résiliation prend effet à la fin de la période en cours.
          </p>

          <h2>6. Droit de rétractation</h2>
          <p>
            Conformément à la loi, vous disposez d'un délai de 14 jours pour exercer votre droit de rétractation à
            compter de la souscription.
          </p>

          <h2>7. Garantie satisfaction</h2>
          <p>
            Nous offrons une garantie "satisfait ou remboursé" de 30 jours. Si tu n'as gagné aucun temps grâce à
            NutriZen, nous te remboursons intégralement.
          </p>

          <h2>8. Responsabilité</h2>
          <p>
            NutriZen n'est pas un service médical. Les conseils nutritionnels fournis sont à titre informatif
            uniquement. Consultez un professionnel de santé pour des conseils personnalisés.
          </p>

          <h2>9. Protection des données</h2>
          <p>
            Vos données personnelles sont traitées conformément au RGPD. Consultez notre politique de confidentialité
            pour plus d'informations.
          </p>

          <h2>10. Loi applicable</h2>
          <p>
            Les présentes CGV sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
