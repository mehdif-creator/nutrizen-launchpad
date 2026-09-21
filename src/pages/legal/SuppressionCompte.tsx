import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function SuppressionCompte() {
  const subject = encodeURIComponent('Demande de suppression du compte NutriZen');
  const body = encodeURIComponent('Bonjour,\nJe souhaite supprimer mon compte NutriZen et les données associées.\nAdresse email du compte : \nMerci de me confirmer le traitement de ma demande.');
  return <div className="min-h-screen flex flex-col">
    <Header onCtaClick={() => {}} />
    <main className="flex-1 container py-16">
      <article className="max-w-3xl mx-auto space-y-5 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:pt-5 [&_h3]:font-semibold [&_h3]:pt-3 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
        <h1>Supprimer mon compte NutriZen</h1>
        <p>Cette page concerne NutriZen (MyNutriZen sur Google Play), édité par Aimy Digital. Vous pouvez demander la suppression de votre compte et des données associées sans réinstaller l’application ni vous connecter.</p>
        <h2>Envoyer une demande</h2>
        <p>Écrivez depuis l’adresse email liée à votre compte à <a href={"mailto:contact@aimy-digital.fr?subject=" + subject + "&body=" + body}>contact@aimy-digital.fr — demander la suppression</a>, avec l’objet « Demande de suppression du compte NutriZen ». Indiquez uniquement l’adresse du compte ; ne communiquez jamais votre mot de passe.</p>
        <p>Si aucun logiciel de messagerie ne s’ouvre, copiez cette adresse dans votre messagerie. Vous pouvez aussi envoyer la demande depuis Paramètres → Supprimer mon compte dans l’application.</p>
        <h2>Données concernées</h2>
        <p>La demande porte sur le compte, le profil et les préférences, les menus et contenus personnels enregistrés ainsi que les données d’utilisation rattachées au compte. Le traitement est effectué par notre support, après vérification de votre identité si nécessaire ; l’envoi de l’email ne supprime pas instantanément le compte.</p>
        <p>Les pièces de facturation et éléments nécessaires au respect d’une obligation légale ou au traitement d’un litige peuvent être conservés pour la durée applicable. Le support vous précise les éventuelles données conservées et leur durée lors du traitement de votre demande.</p>
        <h2>Abonnements et achats</h2>
        <p>La suppression du compte ne résilie pas automatiquement un abonnement Google Play. Pour arrêter les renouvellements, ouvrez <a href="https://play.google.com/store/account/subscriptions">les abonnements Google Play</a>. Pour un abonnement souscrit sur notre site, utilisez la gestion de l’abonnement dans votre compte ou contactez le support.</p>
        <p>Consultez notre <a href="/legal/confidentialite">politique de confidentialité</a> pour en savoir plus sur le traitement des données.</p>
      </article>
    </main>
    <Footer />
  </div>;
}
