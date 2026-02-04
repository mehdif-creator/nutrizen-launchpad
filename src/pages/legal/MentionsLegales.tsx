import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => {}} />

      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <h1>Mentions légales</h1>

          <h2>Éditeur du site</h2>
          <p>Le site <strong>mynutrizen.fr</strong> est édité par :</p>

          <address>
            <p>
              <strong>Aimy Digital</strong><br />
              Auto-entrepreneur<br />
              <strong>Nom :</strong> Mehdi Farhane<br />
              <strong>Adresse :</strong> 23 rue Pierre Jeissou, 79700 Saint-Amand-sur-Sèvre – France<br />
              <strong>SIRET :</strong> 515 191 401 00022<br />
              <strong>Email :</strong> <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a><br />
              <strong>Téléphone :</strong> <a href="tel:+33652597780">06 52 59 77 80</a>
            </p>
          </address>

          <p><strong>Responsable de la publication :</strong> Mehdi Farhane</p>

          <h2>Activité du site</h2>
          <p>
            NutriZen est une application web dédiée à la génération de menus, recettes et outils nutritionnels personnalisés
            à l'aide d'algorithmes et de technologies d'intelligence artificielle.
          </p>
          <p>
            Les informations fournies sur le site ont un but informatif et d'accompagnement, et ne se substituent en aucun cas
            à un avis médical, diététique ou professionnel de santé.
          </p>

          <h2>Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <address>
            <p>
              <strong>Vercel Inc.</strong><br />
              340 S Lemon Ave #4133<br />
              Walnut, CA 91789<br />
              États-Unis<br />
              <strong>Site web :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">https://vercel.com</a>
            </p>
          </address>

          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments présents sur le site <strong>mynutrizen.fr</strong> (textes, interfaces, code, graphismes, logos,
            algorithmes, contenus générés, structure générale, etc.) est protégé par le droit de la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, de ces éléments,
            par quelque procédé que ce soit, sans l'autorisation écrite préalable de l'éditeur, est strictement interdite.
          </p>

          <h2>Responsabilité</h2>
          <p>
            L'éditeur met tout en œuvre pour assurer l'exactitude et la mise à jour des informations diffusées sur le site.
            Toutefois, il ne saurait être tenu responsable :
          </p>
          <ul>
            <li>des erreurs ou omissions,</li>
            <li>d'une indisponibilité temporaire du service,</li>
            <li>d'un mauvais usage de l'application ou des informations fournies,</li>
            <li>des décisions prises par l'utilisateur sur la base des contenus proposés.</li>
          </ul>
          <p>
            L'utilisateur demeure seul responsable de l'utilisation qu'il fait du site et de ses fonctionnalités.
          </p>

          <h2>Données personnelles</h2>
          <p>
            Le site peut être amené à collecter des données personnelles dans le cadre de son fonctionnement
            (création de compte, formulaires, utilisation de l'application).
          </p>
          <p>
            Ces données sont traitées conformément à la réglementation en vigueur, notamment le
            Règlement Général sur la Protection des Données (RGPD).
          </p>
          <p>
            L'utilisateur dispose d'un droit d'accès, de rectification, de suppression et d'opposition concernant ses données personnelles.
            Toute demande peut être adressée à : <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a>
          </p>

          <h2>Cookies</h2>
          <p>
            Le site <strong>mynutrizen.fr</strong> peut utiliser des cookies ou technologies similaires à des fins de fonctionnement,
            de mesure d'audience ou d'amélioration de l'expérience utilisateur.
          </p>
          <p>
            L'utilisateur peut configurer ou refuser les cookies via les paramètres de son navigateur ou via le bandeau de consentement
            lorsqu'il est présent.
          </p>

          <h2>Droit applicable</h2>
          <p>
            Le présent site est soumis au droit français.<br />
            En cas de litige, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
