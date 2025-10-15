import { useState } from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toParisISO } from '@/lib/date-utils';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  email: z.string().trim().email('Adresse email invalide').max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  subject: z.string().trim().min(5, 'Le sujet doit contenir au moins 5 caractères').max(200, 'Le sujet ne peut pas dépasser 200 caractères'),
  message: z.string().trim().min(20, 'Le message doit contenir au moins 20 caractères').max(5000, 'Le message ne peut pas dépasser 5000 caractères')
});

export default function Contact() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input data
      const validatedData = contactSchema.parse(formData);
      
      const webhookUrl = 'https://n8n.srv1005117.hstgr.cloud/webhook/contact';
      
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validatedData,
          timestamp: toParisISO(),
        }),
      });

      toast({
        title: 'Message envoyé !',
        description: 'Nous te répondrons dans les 24h.',
      });

      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erreur de validation',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible d\'envoyer le message. Réessaye plus tard.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCtaClick={() => navigate('/auth/signup')} />
      <main className="flex-1 container py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Contacte-nous</h1>
            <p className="text-lg text-muted-foreground">
              Une question ? Une suggestion ? On est là pour toi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nom</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ton nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="ton.email@exemple.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sujet</label>
              <Input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                placeholder="De quoi veux-tu parler ?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                placeholder="Ton message..."
                rows={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] transition-tech"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le message'}
            </Button>
          </form>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <h2 className="font-semibold mb-4">Autres moyens de contact</h2>
            <div className="space-y-2 text-sm">
              <p>
                📧 Email : <a href="mailto:contact@nutrizen.fr" className="text-primary hover:underline">contact@nutrizen.fr</a>
              </p>
              <p>
                💬 Support : <a href="mailto:support@nutrizen.fr" className="text-primary hover:underline">support@nutrizen.fr</a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
