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
          <p>
            NutriZen SAS<br />
            Capital social : 10 000 €<br />
            RCS : [Numéro RCS]<br />
            Siège social : [Adresse]<br />
            Email : contact@nutrizen.fr<br />
            Téléphone : [Téléphone]
          </p>

          <h2>Directeur de la publication</h2>
          <p>[Nom du directeur]</p>

          <h2>Hébergement</h2>
          <p>
            Ce site est hébergé par :<br />
            Vercel Inc.<br />
            340 S Lemon Ave #4133<br />
            Walnut, CA 91789<br />
            États-Unis
          </p>

          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu de ce site (textes, images, vidéos, etc.)
            est la propriété exclusive de NutriZen ou fait l'objet d'une
            autorisation d'utilisation. Toute reproduction, même partielle,
            est strictement interdite sans autorisation préalable.
          </p>

          <h2>Responsabilité</h2>
          <p>
            NutriZen s'efforce d'assurer l'exactitude et la mise à jour des
            informations diffusées sur ce site. Toutefois, nous ne pouvons
            garantir l'exactitude, la précision ou l'exhaustivité des
            informations mises à disposition.
          </p>

          <h2>Cookies</h2>
          <p>
            Ce site utilise des cookies pour améliorer l'expérience
            utilisateur. Pour plus d'informations, consultez notre
            politique de confidentialité.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
