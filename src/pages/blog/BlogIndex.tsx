import { Link } from 'react-router-dom';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlogArticles } from '@/hooks/useBlogArticles';
import { useSeoMeta } from '@/hooks/useSeoMeta';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function BlogIndex() {
  const { user } = useAuth();
  const { articles, loading } = useBlogArticles();

  useSeoMeta(
    'Blog NutriZen — Conseils nutrition & recettes healthy',
    'Découvrez nos articles nutrition, astuces cuisine et guides pratiques pour manger sainement au quotidien.'
  );

  return (
    <div className="min-h-screen flex flex-col">
      {user ? <AppHeader /> : <Header onCtaClick={() => {}} />}

      <main className="flex-1 container py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Blog NutriZen</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Conseils nutrition, astuces cuisine et guides pratiques
          </p>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Aucun article publié pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {articles.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all h-full">
                    {post.cover_url && (
                      <img
                        src={post.cover_url}
                        alt={post.title}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex gap-2 mb-3">
                        {post.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-2xl font-bold mb-2 hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{formatDate(post.published_at)}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {user ? <AppFooter /> : <Footer />}
    </div>
  );
}
