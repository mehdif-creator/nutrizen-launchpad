import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function BlogPost() {
  const { slug } = useParams();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {user ? <AppHeader /> : <Header onCtaClick={() => {}} />}

      <main className="flex-1 container py-16">
        <div className="max-w-3xl mx-auto">
          <Link to="/blog">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au blog
            </Button>
          </Link>

          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              <Badge>Batch-cooking</Badge>
              <Badge>Astuces</Badge>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              🍳 Le guide ultime du batch-cooking
            </h1>
            <p className="text-muted-foreground">
              Publié le 15 janvier 2025 · 8 min de lecture
            </p>
          </div>

          <img
            src="/img/hero-default.png"
            alt="Article"
            className="w-full h-64 object-cover rounded-2xl mb-8"
          />

          <article className="prose prose-lg max-w-none">
            <p>
              Le batch-cooking, c'est l'art de préparer tous tes repas de la semaine
              en une seule session de cuisine. Une méthode qui peut te faire gagner
              plusieurs heures chaque semaine.
            </p>

            <h2>Pourquoi faire du batch-cooking ?</h2>
            <p>
              Le batch-cooking présente de nombreux avantages :
            </p>
            <ul>
              <li>Économie de temps : 90 minutes au lieu de 3h réparties sur la semaine</li>
              <li>Réduction du gaspillage alimentaire</li>
              <li>Économies sur le budget courses</li>
              <li>Moins de stress au quotidien</li>
            </ul>

            <h2>Comment organiser sa session ?</h2>
            <p>
              Voici les étapes clés pour une session de batch-cooking réussie :
            </p>
            <ol>
              <li>Planifier tes menus de la semaine</li>
              <li>Faire une liste de courses optimisée</li>
              <li>Préparer tous les ingrédients</li>
              <li>Cuire en parallèle (four + plaques)</li>
              <li>Stocker dans des contenants adaptés</li>
            </ol>

            <h2>Les erreurs à éviter</h2>
            <p>
              Pour que ton batch-cooking soit une réussite, évite ces pièges courants :
            </p>
            <ul>
              <li>Ne pas prévoir assez de contenants</li>
              <li>Oublier d'étiqueter tes plats</li>
              <li>Tout congeler (certains plats se conservent mieux au frigo)</li>
            </ul>
          </article>

          <div className="mt-12 p-6 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl">
            <h3 className="text-xl font-bold mb-2">
              Envie d'essayer NutriZen ?
            </h3>
            <p className="text-muted-foreground mb-4">
              Laisse-nous générer tes menus et ta liste de courses automatiquement.
            </p>
            <Button>Commencer gratuitement</Button>
          </div>
        </div>
      </main>

      {user ? <AppFooter /> : <Footer />}
    </div>
  );
}
