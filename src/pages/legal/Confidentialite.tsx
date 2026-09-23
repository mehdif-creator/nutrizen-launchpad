import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function Confidentialite() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => {}} />

      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto space-y-5 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:pt-5 [&_h3]:font-semibold [&_h3]:pt-3 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
          <h1>Politique de confidentialité – NutriZen</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 23 septembre 2026</p>

          <h2>1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles collectées via le site et l’application Android{' '}
            <strong>mynutrizen.fr</strong> est :
          </p>
          <address>
            <p>
              <strong>Aimy Digital</strong> – Auto-entrepreprise
              <br />
              <strong>Nom :</strong> Aimy Digital
              <br />
              <strong>Adresse :</strong> France
              <br />
              <strong>SIRET :</strong> 515 191 401 00022
              <br />
              <strong>Email :</strong>{' '}
              <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a>
            </p>
          </address>

          <h2>2. Données personnelles collectées</h2>
          <p>
            NutriZen peut collecter, selon l’usage du Service, les catégories de données suivantes :
          </p>
          <ul>
            <li>
              <strong>Données d’identification</strong> : nom, prénom (si fourni), adresse email,
              identifiants de compte.
            </li>
            <li>
              <strong>Données de profil et préférences</strong> : objectifs alimentaires,
              préférences, allergies/intolérances, contraintes, taille, poids et informations de santé que vous choisissez de renseigner.
            </li>
            <li>
              <strong>Données d’usage</strong> : navigation, interactions, historique d’utilisation,
              paramètres, logs techniques.
            </li>
            <li>
              <strong>Données de paiement</strong> : achats web traités par Stripe et achats Android par Google Play. RevenueCat et NutriZen traitent les identifiants de transaction, les produits, les dates et l’état des abonnements et crédits associés au compte. NutriZen ne stocke pas les numéros de carte bancaire.
            </li>
            <li>
              <strong>Données de support</strong> : échanges et demandes envoyées via les
              formulaires ou email.
            </li>
          </ul>
          <p>
            Certaines informations saisies peuvent relever de données sensibles (ex. allergies,
            intolérances, informations liées à l’alimentation). Elles ne sont collectées{' '}
            <strong>que si l’utilisateur les renseigne volontairement</strong> et uniquement pour
            fournir les fonctionnalités associées.
          </p>

          <h3>Photos, caméra et assistance par intelligence artificielle</h3>
          <p>Si vous utilisez l’analyse d’un repas ou du réfrigérateur, la photo sélectionnée ou prise à votre demande est envoyée à nos services pour analyse. Les informations nécessaires à la génération de menus et aux réponses de l’assistant (préférences, ingrédients et messages) sont également traitées. Évitez d’inclure des personnes, documents ou informations sans rapport avec votre demande dans vos photos et messages.</p>
          <p>Le scanner de codes-barres utilise la caméra avec votre autorisation pour lire un produit. NutriZen ne demande pas l’accès à vos contacts ni à votre localisation pour ces fonctionnalités.</p>

          <h2>3. Finalités de traitement</h2>
          <p>Les données personnelles sont traitées pour :</p>
          <ul>
            <li>Créer et gérer le compte utilisateur.</li>
            <li>
              Fournir et personnaliser les fonctionnalités du Service (menus, recettes,
              recommandations).
            </li>
            <li>Améliorer la qualité, la sécurité et les performances du Service.</li>
            <li>Gérer les abonnements, paiements, factures et accès Premium.</li>
            <li>Assurer le support client et répondre aux demandes.</li>
            <li>Mesurer l’audience et analyser l’utilisation (si activé, via cookies/traceurs).</li>
            <li>Respecter les obligations légales et réglementaires.</li>
          </ul>

          <h2>4. Bases légales</h2>
          <p>Les traitements reposent sur :</p>
          <ul>
            <li>
              <strong>L’exécution du contrat</strong> (CGU/CGV) : création de compte, fourniture du
              service, gestion de l’abonnement.
            </li>
            <li>
              <strong>Le consentement</strong> : cookies non essentiels, certaines fonctionnalités
              optionnelles, communications si applicable.
            </li>
            <li>
              <strong>L’intérêt légitime</strong> : sécurité, prévention des fraudes, amélioration
              continue, mesure de performance (selon configuration).
            </li>
            <li>
              <strong>Les obligations légales</strong> : conservation comptable/fiscale, demandes
              des autorités.
            </li>
          </ul>

          <h2>5. Destinataires des données</h2>
          <p>Les données sont accessibles :</p>
          <ul>
            <li>
              à l’éditeur et, le cas échéant, à ses sous-traitants strictement nécessaires à
              l’exploitation du Service ;
            </li>
            <li>
              aux prestataires techniques (hébergement, email, analytics, paiement), dans la limite
              de leurs missions.
            </li>
          </ul>

          <h3>5.1. Paiement</h3>
          <p>
            Les paiements sur le site web sont traités par <strong>Stripe Payments Europe, Ltd.</strong>. L’éditeur
            ne stocke pas les informations de carte bancaire.
          </p>

          <h3>5.2. Application Android et prestataires techniques</h3>
          <ul>
            <li><strong>Supabase</strong> : authentification, base de données et fonctions serveur nécessaires au compte, aux préférences et aux crédits.</li>
            <li><strong>Google Play et RevenueCat</strong> : traitement et vérification des achats Android, renouvellements, restaurations et remboursements. L’identifiant interne du compte permet de rattacher ces opérations à votre accès NutriZen.</li>
            <li><strong>OpenAI et la passerelle IA de Lovable, utilisant notamment des modèles Google Gemini</strong> : traitement des demandes de génération ou d’analyse, selon la fonctionnalité utilisée.</li>
            <li><strong>Brevo</strong> : messages transactionnels, demandes de support et communications selon vos préférences.</li>
          </ul>
          <p>Les données transmises dépendent de la fonctionnalité demandée. Les informations bancaires saisies dans Google Play sont gérées par Google ; elles ne sont pas transmises à NutriZen sous forme de numéro de carte.</p>

          <h3>5.3. Hébergement du site</h3>
          <p>
            Le site est publié via <strong>Lovable</strong>. L’authentification, la base de données et les fonctions serveur reposent sur <strong>Supabase</strong>.
          </p>

          <h2>6. Transferts hors Union Européenne</h2>
          <p>
            Certains prestataires peuvent être situés hors de l’Union Européenne, notamment aux
            États-Unis. Dans ce cas, des garanties appropriées sont mises en place (ex. clauses
            contractuelles types, cadres de transfert applicables), afin d’assurer un niveau de
            protection conforme au RGPD.
          </p>

          <h2>7. Durée de conservation</h2>
          <p>
            Les données sont conservées selon les durées suivantes (sauf obligation légale
            différente) :
          </p>
          <ul>
            <li>
              <strong>Données de compte</strong> : conservées tant que le compte est actif, puis
              supprimées/anonymisées dans un délai raisonnable après suppression.
            </li>
            <li>
              <strong>Données liées à l’abonnement/facturation</strong> : conservées selon les
              obligations comptables et fiscales applicables.
            </li>
            <li>
              <strong>Données de support</strong> : durée nécessaire au traitement de la demande,
              puis archivage limité si besoin.
            </li>
            <li>
              <strong>Logs techniques</strong> : durée limitée à des fins de sécurité et diagnostic.
            </li>
            <li>
              <strong>Cookies</strong> : selon la durée indiquée dans le bandeau de consentement
              et/ou la configuration du navigateur.
            </li>
          </ul>

          <h2>8. Sécurité</h2>
          <p>
            L’éditeur met en œuvre des mesures techniques et organisationnelles raisonnables pour
            protéger les données personnelles (contrôles d’accès, chiffrement lorsque pertinent,
            journalisation, surveillance, minimisation des données).
          </p>
          <p>
            Malgré ces mesures, aucun système n’étant infaillible, l’éditeur ne peut garantir une
            sécurité absolue.
          </p>

          <h2>9. Droits des utilisateurs</h2>
          <p>Conformément au RGPD, l’utilisateur dispose des droits suivants :</p>
          <ul>
            <li>droit d’accès ;</li>
            <li>droit de rectification ;</li>
            <li>droit d’effacement ;</li>
            <li>droit d’opposition ;</li>
            <li>droit à la limitation du traitement ;</li>
            <li>droit à la portabilité des données ;</li>
            <li>
              droit de retirer son consentement à tout moment (pour les traitements basés sur le
              consentement).
            </li>
          </ul>
          <p>
            Toute demande peut être adressée à :{' '}
            <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a>
          </p>
          <p>
            En cas de difficulté, l’utilisateur peut déposer une réclamation auprès de la CNIL :{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
              https://www.cnil.fr
            </a>
          </p>

          <h3>Suppression de votre compte</h3>
          <p>Vous pouvez demander la suppression de votre compte et des données associées depuis les paramètres de l’application ou depuis notre <a href="/legal/suppression-compte">page de demande de suppression de compte</a>, accessible sans connexion. Une vérification de l’adresse du compte peut être nécessaire pour éviter une suppression non autorisée.</p>

          <h2>10. Cookies et traceurs</h2>
          <p>Le site peut utiliser des cookies ou technologies similaires pour :</p>
          <ul>
            <li>assurer le fonctionnement technique du Service ;</li>
            <li>mémoriser des préférences ;</li>
            <li>mesurer l’audience et améliorer l’expérience (si activé).</li>
          </ul>
          <p>
            L’utilisateur peut accepter ou refuser les cookies non essentiels via le bandeau de
            consentement lorsqu’il est présent, et/ou configurer son navigateur.
          </p>

          <p>La version Android native ne charge pas les traceurs marketing du site (Google Tag Manager, Meta, Pinterest ou Microsoft Clarity). Elle utilise les composants nécessaires à l’authentification, aux achats et au fonctionnement du service.</p>

          <h2>11. Mineurs</h2>
          <p>
            L’application Android distribuée sur Google Play est réservée aux personnes de 18 ans et plus. Le site web n’est pas destiné aux mineurs sans l’autorisation et la supervision d’un
            représentant légal. Si un utilisateur estime qu’un mineur a fourni des données
            personnelles sans autorisation, il peut contacter l’éditeur afin de demander la
            suppression des données concernées.
          </p>

          <h2>12. Modification de la politique</h2>
          <p>
            L’éditeur se réserve le droit de modifier la présente politique de confidentialité à
            tout moment. La version applicable est celle en vigueur à la date de consultation. La
            date de mise à jour est indiquée en en-tête.
          </p>

          <h2>13. Contact</h2>
          <p>
            Pour toute question relative à la protection des données personnelles :{' '}
            <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
