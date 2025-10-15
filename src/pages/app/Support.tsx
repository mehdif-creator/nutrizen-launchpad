import { useState } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ticketSchema = z.object({
  subject: z.string()
    .trim()
    .min(5, 'Le sujet doit contenir au moins 5 caractères')
    .max(200, 'Le sujet ne peut pas dépasser 200 caractères'),
  message: z.string()
    .trim()
    .min(20, 'Le message doit contenir au moins 20 caractères')
    .max(5000, 'Le message ne peut pas dépasser 5000 caractères'),
});

export default function Support() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Tu dois être connecté pour créer un ticket.',
        variant: 'destructive',
      });
      return;
    }

    // Validate input
    const validation = ticketSchema.safeParse({ subject, message });
    if (!validation.success) {
      toast({
        title: 'Erreur de validation',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check rate limit: 5 tickets per 24 hours
      const { count, error: countError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (countError) throw countError;

      if (count && count >= 5) {
        toast({
          title: 'Limite atteinte',
          description: 'Tu peux créer maximum 5 tickets par jour. Notre équipe traitera tes demandes existantes bientôt.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Insert ticket
      const { error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: validation.data.subject,
          messages: [
            {
              from: 'user',
              text: validation.data.message,
              timestamp: new Date().toISOString(),
            },
          ],
          status: 'open',
        });

      if (insertError) throw insertError;

      toast({
        title: '✅ Ticket créé',
        description: 'Notre équipe te répondra sous 24h ouvrées.',
      });

      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le ticket. Réessaye plus tard.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Centre d'aide</h1>
          <p className="text-muted-foreground mb-8">
            Nous sommes là pour t'aider
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Réponse rapide</h3>
              <p className="text-sm text-muted-foreground">Sous 24h ouvrées</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl mb-2">📧</div>
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-sm text-muted-foreground">support@nutrizen.fr</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-semibold mb-1">Chat</h3>
              <p className="text-sm text-muted-foreground">Lun-Ven 9h-18h</p>
            </Card>
          </div>

          {/* FAQ */}
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Comment annuler mon abonnement ?</AccordionTrigger>
                <AccordionContent>
                  Tu peux annuler ton abonnement à tout moment depuis tes paramètres
                  en cliquant sur "Gérer mon abonnement". L'annulation est effective
                  immédiatement mais tu garderas l'accès jusqu'à la fin de ta période payée.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Comment fonctionnent les swaps ?</AccordionTrigger>
                <AccordionContent>
                  Les swaps te permettent de remplacer un repas par un autre de ton choix.
                  Chaque plan inclut un quota mensuel de swaps qui se renouvelle chaque mois.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Puis-je changer de plan ?</AccordionTrigger>
                <AccordionContent>
                  Oui, tu peux upgrader ou downgrader ton plan à tout moment depuis
                  le portail Stripe. Les changements sont proratisés automatiquement.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Mes données sont-elles sécurisées ?</AccordionTrigger>
                <AccordionContent>
                  Absolument. Nous utilisons le chiffrement SSL et sommes conformes RGPD.
                  Tes données ne sont jamais partagées avec des tiers.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Contact Form */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Ouvrir un ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  placeholder="Ex: Problème avec mon menu"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Décris ton problème en détail..."
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Envoi...' : 'Envoyer le ticket'}
              </Button>
            </form>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
