import { useState, useRef } from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toParisISO } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  email: z.string().trim().email('Adresse email invalide').max(255),
  subject: z.string().trim().min(5, 'Le sujet doit contenir au moins 5 caractères').max(200),
  message: z.string().trim().min(20, 'Le message doit contenir au moins 20 caractères').max(5000),
});

export default function Contact() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  // Honeypot state — invisible to humans
  const [honeypot, setHoneypot] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = contactSchema.parse(formData);

      // Collect optional Turnstile token
      let turnstileToken: string | undefined;
      if (TURNSTILE_SITE_KEY && window.turnstile) {
        const widgetId = turnstileRef.current?.dataset.widgetId;
        if (widgetId) {
          turnstileToken = window.turnstile.getResponse(widgetId);
        }
      }

      const { data, error } = await supabase.functions.invoke('submit-contact', {
        body: {
          ...validatedData,
          timestamp: toParisISO(),
          // Honeypot field — bots fill this, humans don't see it
          website: honeypot,
          // Optional Turnstile token
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      });

      if (error) throw error;

      toast({
        title: 'Message envoyé !',
        description: 'Nous te répondrons dans les 24h.',
      });

      setFormData({ name: '', email: '', subject: '', message: '' });
      setHoneypot('');

      // Reset Turnstile widget if present
      if (TURNSTILE_SITE_KEY && window.turnstile) {
        const widgetId = turnstileRef.current?.dataset.widgetId;
        if (widgetId) window.turnstile.reset(widgetId);
      }
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
          description: "Impossible d'envoyer le message. Réessaye plus tard.",
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

            {/* Honeypot — hidden from humans, bots fill it */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Optional Turnstile widget */}
            {TURNSTILE_SITE_KEY && (
              <div
                ref={turnstileRef}
                className="cf-turnstile"
                data-sitekey={TURNSTILE_SITE_KEY}
                data-theme="auto"
              />
            )}

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

// Turnstile type declarations
declare global {
  interface Window {
    turnstile?: {
      getResponse: (widgetId: string) => string;
      reset: (widgetId: string) => void;
    };
  }
}
