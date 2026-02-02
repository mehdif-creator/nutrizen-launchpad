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
          <p>NutriZen propose :</p>
          <ul>
            <li>Un compte gratuit à vie avec accès aux fonctionnalités de base</li>
            <li>Des packs de Crédits Zen pour débloquer les fonctionnalités avancées</li>
          </ul>

          <h2>3. Compte gratuit</h2>
          <p>Tous les utilisateurs bénéficient d'un compte gratuit à vie incluant la génération de menus hebdomadaires, l'accès aux recettes, et la liste de courses.</p>

          <h2>4. Modalités de paiement</h2>
          <p>
            Les paiements sont sécurisés et traités par Stripe. Les modes de paiement acceptés incluent les cartes
            bancaires (Visa, Mastercard, American Express).
          </p>

          <h2>5. Crédits Zen</h2>
          <p>
            Les Crédits Zen sont des packs à paiement unique. Les crédits achetés n'expirent jamais et restent disponibles dans votre compte.
          </p>

          <h2>6. Droit de rétractation</h2>
          <p>
            Conformément à la loi, vous disposez d'un délai de 14 jours pour exercer votre droit de rétractation à
            compter de l'achat de Crédits Zen.
          </p>

          <h2>7. Remboursement</h2>
          <p>
            Les Crédits Zen non utilisés peuvent être remboursés dans les 14 jours suivant l'achat. Contactez le support pour toute demande.
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
