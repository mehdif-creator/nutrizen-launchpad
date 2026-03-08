import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, RefreshCw, CheckCircle, Clock, AlertCircle, Settings } from 'lucide-react';
import { callEdgeFunction } from '@/lib/edgeFn';
import { toast } from 'sonner';

interface TemplateInfo {
  key: string;
  name: string;
  subject: string;
  preheader: string;
  delay_days: number;
}

interface EmailEvent {
  id: string;
  user_id: string;
  event_type: string;
  status: string;
  created_at: string;
  provider_message_id?: string;
  error?: string;
}

interface ScheduledEmail {
  id: string;
  user_id: string;
  template_key: string;
  status: string;
  scheduled_at: string;
  sent_at?: string;
}

interface CampaignStatus {
  templates: TemplateInfo[];
  recent_events: EmailEvent[];
  scheduled: ScheduledEmail[];
}

export function EmailCampaignSection({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await callEdgeFunction<CampaignStatus & { success: boolean }>('brevo-onboarding', {
        action: 'get_status',
      });
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch email status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSetupTemplates = async () => {
    setSetupLoading(true);
    try {
      const result = await callEdgeFunction('brevo-onboarding', {
        action: 'setup_templates',
      });
      toast.success('Templates créés dans Brevo !');
      console.log('Setup result:', result);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création des templates');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSendScheduled = async () => {
    try {
      const result = await callEdgeFunction('brevo-onboarding', {
        action: 'send_scheduled',
      });
      toast.success(`${(result as any).sent || 0} email(s) envoyé(s)`);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'sent': return <Badge className="bg-primary/10 text-primary border-primary/20"><CheckCircle className="w-3 h-3 mr-1" />Envoyé</Badge>;
      case 'pending': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'error': return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erreur</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const delayLabel = (days: number) => {
    if (days === 0) return 'Immédiat';
    return `J+${days}`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Campagne Onboarding Brevo
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Templates */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Templates d'emails</h3>
          <Button variant="outline" size="sm" onClick={handleSetupTemplates} disabled={setupLoading}>
            <Settings className="h-4 w-4 mr-1" />
            {setupLoading ? 'Création...' : 'Créer dans Brevo'}
          </Button>
        </div>
        <div className="space-y-2">
          {(status?.templates || []).map((tmpl) => (
            <div key={tmpl.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs shrink-0">{delayLabel(tmpl.delay_days)}</Badge>
                  <span className="font-medium text-sm truncate">{tmpl.subject}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{tmpl.preheader}</p>
              </div>
            </div>
          ))}
          {!status?.templates?.length && (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          )}
        </div>
      </div>

      {/* Scheduled emails */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Emails planifiés ({status?.scheduled?.filter(s => s.status === 'pending').length || 0} en attente)
          </h3>
          <Button variant="outline" size="sm" onClick={handleSendScheduled}>
            <Send className="h-4 w-4 mr-1" />
            Envoyer les emails dus
          </Button>
        </div>
        {status?.scheduled && status.scheduled.length > 0 ? (
          <div className="space-y-1">
            {status.scheduled.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded border text-sm">
                <div className="flex items-center gap-2">
                  {statusBadge(s.status)}
                  <span className="text-muted-foreground">{s.template_key}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {s.status === 'sent' && s.sent_at
                    ? `Envoyé le ${new Date(s.sent_at).toLocaleDateString('fr-FR')}`
                    : `Prévu le ${new Date(s.scheduled_at).toLocaleDateString('fr-FR')}`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun email planifié</p>
        )}
      </div>

      {/* Recent events */}
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
          Derniers envois ({status?.recent_events?.length || 0})
        </h3>
        {status?.recent_events && status.recent_events.length > 0 ? (
          <div className="space-y-1">
            {status.recent_events.slice(0, 8).map((evt) => (
              <div key={evt.id} className="flex items-center justify-between py-2 px-3 rounded border text-sm">
                <div className="flex items-center gap-2">
                  {statusBadge(evt.status)}
                  <span className="text-muted-foreground">{evt.event_type}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(evt.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun envoi récent</p>
        )}
      </div>
    </Card>
  );
}
