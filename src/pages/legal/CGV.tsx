import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function CGV() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => {}} />

      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <h1>Conditions Générales d’Utilisation (CGU) &amp; Conditions Générales de Vente (CGV) – NutriZen</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 03 février 2026</p>

          <h2>1. Informations légales – Éditeur</h2>
          <p>
            Le site <strong>mynutrizen.fr</strong> est édité par :
          </p>
          <address>
            <p>
              <strong>Aimy Digital</strong> – Auto-entrepreneur
              <br />
              <strong>Nom :</strong> Mehdi Farhane
              <br />
              <strong>Adresse :</strong> 23 rue Pierre Jeissou, 79700 Saint-Amand-sur-Sèvre – France
              <br />
              <strong>SIRET :</strong> 515 191 401 00022
              <br />
              <strong>Email :</strong> <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a>
              <br />
              <strong>Téléphone :</strong> <a href="tel:+33652597780">06 52 59 77 80</a>
              <br />
              <strong>Responsable de la publication :</strong> Mehdi Farhane
            </p>
          </address>

          <h2>2. Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <address>
            <p>
              <strong>Vercel Inc.</strong>
              <br />
              340 S Lemon Ave #4133
              <br />
              Walnut, CA 91789
              <br />
              États-Unis
              <br />
              <strong>Site web :</strong>{" "}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
                https://vercel.com
              </a>
            </p>
          </address>

          <h2>3. Définitions</h2>
          <ul>
            <li>
              <strong>Service</strong> : l’application web NutriZen accessible via mynutrizen.fr et ses fonctionnalités.
            </li>
            <li>
              <strong>Utilisateur</strong> : toute personne naviguant sur le site et/ou utilisant le Service.
            </li>
            <li>
              <strong>Compte</strong> : espace personnel créé par l’Utilisateur pour accéder au Service.
            </li>
            <li>
              <strong>Offre Gratuite</strong> : accès sans paiement, avec fonctionnalités limitées.
            </li>
            <li>
              <strong>Offre Premium</strong> : accès payant par abonnement mensuel, donnant accès à des fonctionnalités
              avancées.
            </li>
            <li>
              <strong>Contenus</strong> : textes, interfaces, résultats, recommandations et éléments affichés ou générés
              via le Service.
            </li>
            <li>
              <strong>Stripe</strong> : prestataire de paiement gérant la facturation et les transactions.
            </li>
          </ul>

          <h2>4. Champ d’application</h2>
          <p>
            Les présentes CGU régissent l’accès et l’utilisation du Service. Les présentes CGV régissent la
            souscription, le paiement et la gestion de l’Offre Premium.
          </p>
          <p>
            L’utilisation du Service implique l’acceptation sans réserve des présentes CGU, et la souscription à l’Offre
            Premium implique l’acceptation sans réserve des présentes CGV.
          </p>

          <h2>5. CGU – Accès au Service et création de compte</h2>

          <h3>5.1. Conditions d’accès</h3>
          <p>
            Le Service est accessible en ligne. Certaines fonctionnalités nécessitent la création d’un Compte.
            L’Utilisateur garantit fournir des informations exactes et à jour.
          </p>

          <h3>5.2. Sécurité du Compte</h3>
          <p>
            L’Utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis
            son Compte. En cas de suspicion d’accès non autorisé, l’Utilisateur s’engage à contacter l’éditeur sans
            délai.
          </p>

          <h3>5.3. Disponibilité</h3>
          <p>
            L’éditeur met en œuvre des moyens raisonnables pour assurer l’accessibilité du Service, sans garantir une
            disponibilité continue (maintenance, mises à jour, incidents, etc.).
          </p>

          <h2>6. CGU – Usage autorisé et règles de conduite</h2>

          <h3>6.1. Usage conforme</h3>
          <p>
            L’Utilisateur s’engage à utiliser le Service conformément aux lois et règlements en vigueur, et à ne pas
            porter atteinte aux droits de tiers ou au bon fonctionnement du Service.
          </p>

          <h3>6.2. Interdictions</h3>
          <ul>
            <li>tenter d’accéder illégalement à des systèmes, données ou comptes tiers ;</li>
            <li>perturber le Service (attaque, injection, scraping abusif, surcharge, etc.) ;</li>
            <li>
              copier, reproduire ou détourner tout ou partie du Service (code, interface, algorithmes, contenus) sans
              autorisation ;
            </li>
            <li>utiliser le Service à des fins frauduleuses ou trompeuses.</li>
          </ul>

          <h3>6.3. Sanctions</h3>
          <p>
            En cas de violation des présentes, l’éditeur se réserve le droit de suspendre ou supprimer le Compte, sans
            préavis, et/ou de refuser l’accès au Service.
          </p>

          <h2>7. CGU – Propriété intellectuelle</h2>
          <p>
            Le Service et l’ensemble de ses éléments (textes, interfaces, code, graphismes, logos, algorithmes,
            structure générale, contenus générés, etc.) sont protégés par le droit de la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, par
            quelque procédé que ce soit, sans autorisation écrite préalable, est interdite.
          </p>

          <h2>8. CGU – Informations nutritionnelles et avertissement santé</h2>
          <p>
            NutriZen propose des recommandations et contenus automatisés à titre informatif et d’accompagnement. Le
            Service ne constitue pas un dispositif médical et ne remplace pas un avis médical, diététique ou d’un
            professionnel de santé.
          </p>
          <p>
            En cas de pathologie, allergie, intolérance, grossesse, traitement médical ou situation particulière,
            l’Utilisateur est invité à consulter un professionnel de santé avant toute décision.
          </p>

          <h2>9. CGU – Responsabilité</h2>
          <p>
            L’éditeur met en œuvre des moyens raisonnables pour assurer l’exactitude et la mise à jour des informations
            diffusées. Toutefois, il ne saurait être tenu responsable :
          </p>
          <ul>
            <li>des erreurs ou omissions ;</li>
            <li>d’une indisponibilité temporaire du Service ;</li>
            <li>d’un mauvais usage du Service ou des informations fournies ;</li>
            <li>des décisions prises par l’Utilisateur sur la base des contenus proposés.</li>
          </ul>
          <p>
            L’Utilisateur demeure seul responsable de l’utilisation qu’il fait du Service et de ses fonctionnalités.
          </p>

          <h2>10. CGV – Offres, tarifs et facturation</h2>

          <h3>10.1. Offres</h3>
          <p>
            Le Service est proposé sous forme d’une Offre Gratuite (fonctionnalités limitées) et d’une Offre Premium par
            abonnement mensuel, sans engagement de durée.
          </p>

          <h3>10.2. Tarifs</h3>
          <p>
            Les tarifs sont indiqués en euros (€), toutes taxes comprises (TTC), sauf mention contraire. Le prix
            applicable est celui affiché au moment de la souscription.
          </p>
          <p>
            L’éditeur se réserve le droit de modifier les tarifs à tout moment. Toute modification s’applique uniquement
            aux nouveaux abonnements ou lors du renouvellement, après information préalable de l’Utilisateur.
          </p>

          <h3>10.3. Factures</h3>
          <p>
            Les factures et justificatifs de paiement sont mis à disposition via l’interface de facturation (Stripe)
            et/ou l’espace Utilisateur, selon les options disponibles.
          </p>

          <h2>11. CGV – Paiement (Stripe)</h2>

          <h3>11.1. Prestataire de paiement</h3>
          <p>
            Les paiements sont traités de manière sécurisée par un prestataire tiers certifié :
            <strong> Stripe Payments Europe, Ltd.</strong>
          </p>
          <p>L’éditeur n’a à aucun moment accès aux coordonnées bancaires de l’Utilisateur.</p>

          <h3>11.2. Moyens de paiement</h3>
          <ul>
            <li>Carte bancaire (Visa, Mastercard, etc.)</li>
            <li>Tout autre moyen proposé par Stripe au moment du paiement</li>
          </ul>

          <h3>11.3. Exigibilité</h3>
          <p>Le paiement est exigible immédiatement lors de la souscription à l’abonnement.</p>

          <h2>12. CGV – Abonnement et reconduction automatique</h2>
          <p>
            L’abonnement NutriZen est conclu sous forme de <strong>renouvellement automatique mensuel</strong>. Sauf
            résiliation par l’Utilisateur avant la date de renouvellement :
          </p>
          <ul>
            <li>l’abonnement est automatiquement reconduit ;</li>
            <li>le montant correspondant est prélevé à chaque échéance mensuelle.</li>
          </ul>
          <p>Aucun rappel individuel n’est envoyé avant chaque renouvellement, conformément aux usages SaaS.</p>

          <h2>13. CGV – Résiliation</h2>
          <p>L’Utilisateur peut résilier son abonnement à tout moment, sans justification :</p>
          <ul>
            <li>depuis son espace personnel (si disponible),</li>
            <li>ou via son portail de facturation Stripe.</li>
          </ul>
          <p>
            La résiliation prend effet à la fin de la période de facturation en cours. Aucun remboursement partiel ou
            prorata temporis n’est effectué pour une période entamée.
          </p>
          <p>L’accès aux fonctionnalités Premium est maintenu jusqu’à la date effective de fin d’abonnement.</p>

          <h2>14. CGV – Échec de paiement</h2>
          <p>En cas d’échec de paiement (carte expirée, fonds insuffisants, rejet bancaire) :</p>
          <ul>
            <li>Stripe peut tenter automatiquement un ou plusieurs nouveaux prélèvements ;</li>
            <li>l’accès au Service peut être temporairement suspendu ;</li>
            <li>l’abonnement peut être résilié automatiquement en cas de non-régularisation.</li>
          </ul>
          <p>L’Utilisateur reste responsable de la mise à jour de ses informations de paiement.</p>

          <h2>15. CGV – Droit de rétractation</h2>
          <p>
            Conformément à l’article L221-28 du Code de la consommation, le droit de rétractation ne s’applique pas
            lorsque :
          </p>
          <ul>
            <li>l’exécution du Service a commencé immédiatement après la souscription,</li>
            <li>avec l’accord exprès de l’Utilisateur,</li>
            <li>et renonciation explicite à son droit de rétractation.</li>
          </ul>
          <p>En souscrivant à NutriZen, l’Utilisateur reconnaît et accepte cette condition.</p>

          <h2>16. Suspension ou résiliation par l’éditeur</h2>
          <p>L’éditeur se réserve le droit de suspendre ou résilier un Compte, sans préavis, en cas :</p>
          <ul>
            <li>de fraude ou tentative de fraude,</li>
            <li>d’utilisation abusive ou détournée du Service,</li>
            <li>de non-respect des présentes CGU/CGV.</li>
          </ul>
          <p>Aucune indemnité ne pourra être réclamée dans ce cadre.</p>

          <h2>17. Données personnelles</h2>
          <p>
            Le Service peut collecter des données personnelles nécessaires à son fonctionnement (création de compte,
            formulaires, utilisation). Ces données sont traitées conformément à la réglementation en vigueur, notamment
            le RGPD.
          </p>
          <p>
            L’Utilisateur dispose d’un droit d’accès, de rectification, de suppression et d’opposition. Toute demande
            peut être adressée à : <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a>
          </p>

          <h2>18. Cookies</h2>
          <p>
            Le site peut utiliser des cookies ou technologies similaires à des fins de fonctionnement, de mesure
            d’audience ou d’amélioration de l’expérience utilisateur.
          </p>
          <p>
            L’Utilisateur peut configurer ou refuser les cookies via les paramètres de son navigateur ou via le bandeau
            de consentement lorsqu’il est présent.
          </p>

          <h2>19. Modifications des CGU/CGV</h2>
          <p>
            L’éditeur se réserve le droit de modifier les présentes CGU/CGV à tout moment. La version applicable est
            celle en vigueur au moment de l’utilisation du Service et/ou de la souscription.
          </p>

          <h2>20. Droit applicable et litiges</h2>
          <p>
            Les présentes CGU/CGV sont soumises au droit français. En cas de litige, et à défaut de résolution amiable,
            les tribunaux français seront seuls compétents.
          </p>

          <h2>21. Contact</h2>
          <p>
            Pour toute question, demande d’assistance ou réclamation :{" "}
            <a href="mailto:contact@aimy-digital.fr">contact@aimy-digital.fr</a>
          </p>

          <hr />

          <h2>Sommaire</h2>
          <ul>
            <li>
              <a href="#editeur">1. Informations légales</a>
            </li>
            <li>
              <a href="#hebergement">2. Hébergement</a>
            </li>
            <li>
              <a href="#definitions">3. Définitions</a>
            </li>
            <li>
              <a href="#champ-application">4. Champ d’application</a>
            </li>
            <li>
              <a href="#cgu-acces-compte">5. CGU – Accès / Compte</a>
            </li>
            <li>
              <a href="#cgu-usage">6. CGU – Usage autorisé</a>
            </li>
            <li>
              <a href="#cgu-pi">7. CGU – Propriété intellectuelle</a>
            </li>
            <li>
              <a href="#cgu-sante">8. Avertissement santé</a>
            </li>
            <li>
              <a href="#cgu-responsabilite">9. Responsabilité</a>
            </li>
            <li>
              <a href="#cgv-offres-tarifs">10. CGV – Offres / Tarifs</a>
            </li>
            <li>
              <a href="#cgv-paiement">11. Paiement</a>
            </li>
            <li>
              <a href="#cgv-renouvellement">12. Reconduction</a>
            </li>
            <li>
              <a href="#cgv-resiliation">13. Résiliation</a>
            </li>
            <li>
              <a href="#cgv-echec-paiement">14. Échec de paiement</a>
            </li>
            <li>
              <a href="#cgv-retractation">15. Rétractation</a>
            </li>
            <li>
              <a href="#suspension-editeur">16. Suspension</a>
            </li>
            <li>
              <a href="#donnees-personnelles">17. Données personnelles</a>
            </li>
            <li>
              <a href="#cookies">18. Cookies</a>
            </li>
            <li>
              <a href="#modifications">19. Modifications</a>
            </li>
            <li>
              <a href="#droit-applicable">20. Droit applicable</a>
            </li>
            <li>
              <a href="#contact">21. Contact</a>
            </li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
