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
      title: '✅ Guide envoyé !',
      description: 'Vérifie ta boîte mail, ton guide arrive dans quelques instants.',
    });
    setEmail('');
  };

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container">
        <Card className="max-w-3xl mx-auto p-8 md:p-12 shadow-glow border-primary/10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mb-4">
              <Download className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              📘 Télécharge ton guide gratuit
            </h2>
            <p className="text-xl text-muted-foreground mb-2">
              <strong>"Batch-cooking 90 minutes"</strong>
            </p>
            <p className="text-lg text-muted-foreground">
              Prépare ta semaine en une session, gagne du temps et de l'énergie.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="ton@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 text-base"
            />
            
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-base font-medium"
            >
              Recevoir le guide gratuit
            </Button>

            <p className="text-sm text-muted-foreground text-center pt-2">
              Zéro spam. 1 ressource utile par semaine.
            </p>
          </form>
        </Card>
      </div>
    </section>
  );
};
