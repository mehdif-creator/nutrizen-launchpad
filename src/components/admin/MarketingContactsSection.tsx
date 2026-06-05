import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, RefreshCw, Download, Send, Database } from 'lucide-react';
import { callEdgeFunction } from '@/lib/edgeFn';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { broadcastAdminInvalidate } from '@/lib/adminLive';

interface Stats {
  auth_users: number;
  contacts_total: number;
  contacts_synced: number;
  contacts_pending: number;
  contacts_error: number;
  by_provider: Record<string, number>;
}

export function MarketingContactsSection() {
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();

  const {
    data: stats = null,
    isFetching: loading,
    refetch,
  } = useQuery<Stats | null>({
    queryKey: ['marketing-contacts', 'stats'],
    queryFn: async () => {
      const res = await callEdgeFunction<{ stats: Stats }>('marketing-contacts-admin', {
        action: 'stats',
      });
      return res.stats;
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const fetchStats = () => refetch();

  const run = async (action: string, label: string, payload: any = {}) => {
    setBusy(action);
    try {
      const res = await callEdgeFunction<any>('marketing-contacts-admin', { action, ...payload });
      toast.success(`${label}: ${JSON.stringify(res).slice(0, 200)}`);
      await qc.invalidateQueries({ queryKey: ['marketing-contacts'] });
      broadcastAdminInvalidate(`marketing-contacts:${action}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };


  const exportCsv = async () => {
    setBusy('export');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-contacts-admin`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: 'export_csv' }),
      });
      if (!resp.ok) throw new Error('Export échoué');
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'marketing_contacts.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Contacts marketing (Brevo)
        </h2>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Stat label="Utilisateurs Auth" value={stats?.auth_users} />
        <Stat label="Contacts" value={stats?.contacts_total} />
        <Stat label="Synchronisés" value={stats?.contacts_synced} variant="success" />
        <Stat label="En attente" value={stats?.contacts_pending} variant="warn" />
        <Stat label="Erreurs" value={stats?.contacts_error} variant="error" />
      </div>

      {stats?.by_provider && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(stats.by_provider).map(([k, v]) => (
            <Badge key={k} variant="outline">
              {k}: {v}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-3">
        Sync automatique activée : chaque nouveau contact est poussé vers Brevo via un
        trigger DB + edge function, avec une reprise automatique toutes les 5 minutes
        pour les statuts <em>pending</em> et <em>error</em>. Règle actuelle : tous les
        utilisateurs Auth sont synchronisés (pas d'opt-in UI à ce jour). Les boutons
        ci-dessous restent disponibles comme outils manuels de secours.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => run('backfill', 'Backfill terminé')}
          disabled={busy !== null}
        >
          <Database className="h-4 w-4 mr-1" />
          Backfill depuis Auth
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => run('sync_brevo', 'Sync Brevo', { only_pending: true })}
          disabled={busy !== null}
        >
          <Send className="h-4 w-4 mr-1" />
          Sync Brevo (pending/erreurs)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => run('sync_brevo', 'Sync Brevo (tous)', { only_pending: false })}
          disabled={busy !== null}
        >
          <Send className="h-4 w-4 mr-1" />
          Re-sync tous
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={busy !== null}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value?: number;
  variant?: 'success' | 'warn' | 'error';
}) {
  const color =
    variant === 'success'
      ? 'text-primary'
      : variant === 'warn'
        ? 'text-yellow-500'
        : variant === 'error'
          ? 'text-destructive'
          : 'text-foreground';
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value ?? '—'}</div>
    </div>
  );
}
