import { useEffect, useState } from 'react';
import { PushToggle } from '@/components/common/PushToggle';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Clock, Send, User, CheckCircle2 } from 'lucide-react';

interface TicketMessage {
  role: string;
  content: string;
  at?: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  messages: TicketMessage[] | null;
}

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      )('rpc_admin_list_support_tickets');
      if (error) throw error;
      setTickets((data as unknown as Ticket[]) || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (ticketId: string, close = false) => {
    const message = (replies[ticketId] || '').trim();
    if (!message) return;
    setSendingId(ticketId);
    try {
      const { data, error } = await supabase.functions.invoke('support-ticket-reply', {
        body: { ticket_id: ticketId, message, close },
      });
      if (error) throw error;
      toast({
        title: 'Réponse envoyée',
        description: (data as { emailed?: boolean })?.emailed
          ? 'Le client a reçu votre réponse par email.'
          : "Réponse enregistrée (email non envoyé — vérifiez la configuration d'envoi).",
      });
      setReplies((prev) => ({ ...prev, [ticketId]: '' }));
      await loadTickets();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erreur',
        description: "La réponse n'a pas pu être envoyée",
        variant: 'destructive',
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="mb-6">
          <Link to="/admin">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au dashboard
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">Tickets de support</h1>

        <Card className="p-4 mb-6">
          <PushToggle
            title="Alertes nouveaux tickets sur cet appareil"
            description="Recevez une notification dès qu'un client envoie un message."
          />
        </Card>



        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : tickets.length === 0 ? (
          <Card className="p-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun ticket pour le moment</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
              return (
                <Card key={ticket.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {ticket.user_name ? `${ticket.user_name} · ` : ''}
                          {ticket.user_email ? (
                            <a className="underline" href={`mailto:${ticket.user_email}`}>
                              {ticket.user_email}
                            </a>
                          ) : (
                            'Email inconnu'
                          )}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Reçu le {formatDateTime(ticket.created_at)}
                          {ticket.updated_at && ticket.updated_at !== ticket.created_at
                            ? ` · dernière activité ${formatDateTime(ticket.updated_at)}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                      {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                    </Badge>
                  </div>

                  {messages.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {messages.map((m, i) => (
                        <div
                          key={i}
                          className={
                            m.role === 'user'
                              ? 'rounded-lg bg-muted/40 p-3'
                              : m.role === 'admin'
                                ? 'rounded-lg bg-primary/10 p-3'
                                : 'rounded-lg bg-muted/20 p-3'
                          }
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {m.role === 'user'
                              ? (ticket.user_email ?? 'Client')
                              : m.role === 'admin'
                                ? 'Vous'
                                : 'Assistant'}{' '}
                            · {formatDateTime(m.at)}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Textarea
                      value={replies[ticket.id] || ''}
                      onChange={(e) =>
                        setReplies((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                      }
                      placeholder="Écrivez votre réponse au client…"
                      rows={3}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => sendReply(ticket.id)}
                        disabled={!replies[ticket.id]?.trim() || sendingId === ticket.id}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer la réponse
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => sendReply(ticket.id, true)}
                        disabled={!replies[ticket.id]?.trim() || sendingId === ticket.id}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Répondre et clôturer
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
