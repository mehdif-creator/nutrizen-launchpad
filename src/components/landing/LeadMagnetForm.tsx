import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email();

interface LeadMagnetFormProps {
  listId: number;
  title: string;
  text: string;
  buttonLabel?: string;
  placeholder?: string;
  successMessage?: string;
  source?: string;
}

export const LeadMagnetForm = ({
  listId,
  title,
  text,
  buttonLabel = 'Recevoir mon guide gratuit →',
  placeholder = 'Votre adresse email',
  successMessage = "C'est parti ! Vérifiez votre boîte mail 📩",
  source = 'landing_lead_magnet',
}: LeadMagnetFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!firstName.trim()) {
      setErrorMsg("Merci d'entrer votre prénom.");
      setStatus('error');
      return;
    }

    if (!emailSchema.safeParse(email).success) {
      setErrorMsg("Merci d'entrer une adresse email valide.");
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const trimmedEmail = email.toLowerCase().trim();

      const { error } = await supabase.functions.invoke('brevo-add-contact', {
        body: {
          email: trimmedEmail,
          listIds: [listId],
          attributes: { PRENOM: firstName.trim(), SOURCE: 'lead_magnet' },
        },
      });

      if (error) {
        console.warn('[Brevo] lead magnet sync failed:', error);
      }

      setStatus('success');
      setFirstName('');
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(
        err?.message?.includes('already exist')
          ? 'Vous êtes déjà inscrit(e) ! Vérifiez votre boîte mail.'
          : 'Une erreur est survenue. Réessayez dans quelques instants.'
      );
    }
  };

  if (status === 'success') {
    return (
      <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container">
          <Card className="max-w-3xl mx-auto p-8 md:p-12 shadow-glow border-primary/10 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-xl font-semibold text-foreground">{successMessage}</p>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container">
        <Card className="max-w-3xl mx-auto p-8 md:p-12 shadow-glow border-primary/10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mb-4">
              <Download className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              📘 {title}
            </h2>
            <p className="text-lg text-muted-foreground">{text}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder={placeholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                disabled={status === 'loading'}
                className="flex-1 h-12 text-base"
              />
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="h-12 bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-base font-medium whitespace-nowrap"
              >
                {status === 'loading' ? 'Envoi…' : buttonLabel}
              </Button>
            </div>

            {status === 'error' && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {errorMsg}
              </p>
            )}

            <p className="text-sm text-muted-foreground text-center pt-2">
              En vous inscrivant, vous acceptez de recevoir des emails de NutriZen. Désinscription en 1 clic.
            </p>
          </form>
        </Card>
      </div>
    </section>
  );
};
