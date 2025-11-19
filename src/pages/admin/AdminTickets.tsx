import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Clock } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  user_id: string;
  messages: any;
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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

        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : tickets.length === 0 ? (
          <Card className="p-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun ticket pour le moment</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                    {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                  </Badge>
                </div>
                
                {ticket.messages && Array.isArray(ticket.messages) && ticket.messages.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 mt-4">
                    <p className="text-sm whitespace-pre-wrap">
                      {ticket.messages[0].text}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
