import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const LeadMagnet = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: '📥 Guide envoyé !',
      description: 'Vérifie ta boîte mail (et les spams).',
    });
    setEmail('');
  };

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container">
        <Card className="max-w-3xl mx-auto p-8 md:p-12 bg-background border-border shadow-card">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mb-4">
              <Download className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Télécharge le guide gratuit
              </h2>
              <p className="text-lg text-muted-foreground">
                <strong>"Batch-cooking 90 min"</strong> — prépare ta semaine en une session
              </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
              <Input
                type="email"
                placeholder="ton@email.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-center"
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech"
                size="lg"
              >
                Recevoir le guide gratuit
              </Button>
            </form>

            <p className="text-xs text-muted-foreground">
              Zéro spam. 1 ressource utile par semaine.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};
