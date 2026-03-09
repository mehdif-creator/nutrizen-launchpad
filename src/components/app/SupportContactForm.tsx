import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle } from 'lucide-react';
import { callEdgeFunction } from '@/lib/edgeFn';
import { toast } from 'sonner';

export function SupportContactForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    try {
      await callEdgeFunction('send-support-email', {
        subject: subject.trim(),
        message: message.trim(),
      });
      setSent(true);
      setSubject('');
      setMessage('');
      toast.success('Message envoyé !');
    } catch (err: any) {
      console.error('[SupportContactForm]', err);
      toast.error('Une erreur est survenue. Réessayez dans quelques instants.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle className="h-10 w-10 text-primary" />
        <p className="text-sm font-medium">
          Votre message a bien été envoyé. Nous vous répondrons sous 24h.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>
          Envoyer un autre message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="support-subject">Sujet</Label>
        <Input
          id="support-subject"
          placeholder="Votre sujet"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="support-message">Message</Label>
        <Textarea
          id="support-message"
          placeholder="Décrivez votre problème..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={5000}
          rows={5}
          required
        />
      </div>
      <Button type="submit" disabled={sending} className="w-full sm:w-auto">
        <Send className="mr-2 h-4 w-4" />
        {sending ? 'Envoi en cours…' : 'Envoyer le message'}
      </Button>
    </form>
  );
}
