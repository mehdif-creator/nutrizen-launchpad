import { Link } from 'react-router-dom';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BlogIndex() {
  const { user } = useAuth();
  const posts = [
    {
      slug: 'batch-cooking-guide',
      title: '🍳 Le guide ultime du batch-cooking',
      excerpt: 'Prépare tous tes repas de la semaine en 90 minutes chrono.',
      cover: '/img/hero-default.png',
      tags: ['Batch-cooking', 'Astuces'],
      date: '15 janvier 2025',
    },
    {
      slug: 'economies-courses',
      title: '💰 Comment économiser 200€/mois sur tes courses',
      excerpt: 'Les secrets pour réduire ton budget alimentation sans sacrifier la qualité.',
      cover: '/img/hero-default.png',
      tags: ['Budget', 'Conseils'],
      date: '10 janvier 2025',
    },
    {
      slug: 'nutrition-sportifs',
      title: '💪 Nutrition pour sportifs : les essentiels',
      excerpt: 'Comment adapter ton alimentation à tes entraînements.',
      cover: '/img/hero-default.png',
      tags: ['Sport', 'Nutrition'],
      date: '5 janvier 2025',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {user ? <AppHeader /> : <Header onCtaClick={() => {}} />}

      <main className="flex-1 container py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Blog NutriZen</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Conseils nutrition, astuces cuisine et guides pratiques
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`}>
                <Card className="overflow-hidden hover:shadow-glow transition-all h-full">
                  <img
                    src={post.cover}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <div className="flex gap-2 mb-3">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="text-2xl font-bold mb-2 hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                    <p className="text-sm text-muted-foreground">{post.date}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {user ? <AppFooter /> : <Footer />}
    </div>
  );
}
