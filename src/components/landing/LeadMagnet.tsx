import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import type { LeadMagnetCopy } from '@/config/marketingCopy';

const leadSchema = z.object({
  email: z.string().email('Email invalide'),
});

interface LeadMagnetProps {
  copy?: LeadMagnetCopy;
}

export const LeadMagnet = ({ copy }: LeadMagnetProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const title = copy?.title || 'Batch-cooking 90 minutes';
  const text = copy?.text || 'Prépare ta semaine en une session, gagne du temps et de l\'énergie.';
  const cta = copy?.cta || 'Recevoir le guide gratuit';
  const source = copy?.source || 'landing_lead_magnet';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      leadSchema.parse({ email });
    } catch (error) {
      toast({ title: "Erreur", description: "Veuillez entrer un email valide", variant: "destructive" });
      return;
    }

    const lastSubmissions = localStorage.getItem('lead_submissions');
    const now = Date.now();
    let submissions: number[] = lastSubmissions ? JSON.parse(lastSubmissions) : [];
    submissions = submissions.filter(time => now - time < 3600000);

    if (submissions.length >= 3) {
      toast({ title: "Trop de tentatives", description: "Veuillez réessayer dans une heure", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('submit-lead', {
        body: { email, source, timestamp: new Date().toISOString() },
      });

      if (error) throw error;

      submissions.push(now);
      localStorage.setItem('lead_submissions', JSON.stringify(submissions));

      toast({ title: '✅ Guide envoyé !', description: 'Vérifie ta boîte mail, ton guide arrive dans quelques instants.' });
      setEmail('');
    } catch (error: any) {
      console.error('Error submitting lead:', error);
      toast({ title: "Erreur", description: error.message || "Une erreur est survenue. Veuillez réessayer.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
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
              📘 {title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {text}
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
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-base font-medium"
            >
              {isSubmitting ? 'Envoi...' : cta}
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
