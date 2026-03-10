import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AffiliateRow {
  affiliate_code: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  email?: string;
  total_commissions: number;
  pending_amount: number;
}

export default function AdminAffiliations() {
  const navigate = useNavigate();
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const db = supabase as any;

      const { data: affs, error } = await db
        .from('affiliates')
        .select('affiliate_code, user_id, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows: AffiliateRow[] = [];
      for (const aff of affs || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', aff.user_id)
          .maybeSingle();

        const { data: comms } = await db
          .from('affiliate_commissions')
          .select('commission_amount_cents, status')
          .eq('affiliate_code', aff.affiliate_code);

        const total = comms?.reduce((s: number, c: any) => s + c.commission_amount_cents, 0) || 0;
        const pending = comms?.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + c.commission_amount_cents, 0) || 0;

        rows.push({
          affiliate_code: aff.affiliate_code,
          user_id: aff.user_id,
          is_active: aff.is_active,
          created_at: aff.created_at,
          email: profile?.email || 'N/A',
          total_commissions: total,
          pending_amount: pending,
        });
      }

      setAffiliates(rows);
    } catch (err) {
      console.error('Error loading affiliates:', err);
      toast.error('Erreur chargement affiliés');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (affiliateCode: string) => {
    setPaying(affiliateCode);
    try {
      const { error } = await (supabase as any)
        .from('affiliate_commissions')
        .update({ status: 'paid' })
        .eq('affiliate_code', affiliateCode)
        .eq('status', 'pending');

      if (error) throw error;

      toast.success('Commissions marquées comme payées');
      await loadAffiliates();
    } catch (err) {
      console.error('Error marking as paid:', err);
      toast.error('Erreur lors du paiement');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Affiliations</h1>
            <p className="text-muted-foreground">Vue admin de tous les affiliés et commissions</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            ← Retour admin
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : affiliates.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucun affilié pour le moment.
          </Card>
        ) : (
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Total commissions</TableHead>
                  <TableHead className="text-right">En attente</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((aff) => (
                  <TableRow key={aff.affiliate_code}>
                    <TableCell className="font-mono text-sm">{aff.affiliate_code}</TableCell>
                    <TableCell>{aff.email}</TableCell>
                    <TableCell>
                      <Badge variant={aff.is_active ? 'default' : 'secondary'}>
                        {aff.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {(aff.total_commissions / 100).toFixed(2)}€
                    </TableCell>
                    <TableCell className="text-right font-medium text-accent">
                      {(aff.pending_amount / 100).toFixed(2)}€
                    </TableCell>
                    <TableCell className="text-right">
                      {aff.pending_amount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={paying === aff.affiliate_code}
                          onClick={() => markAsPaid(aff.affiliate_code)}
                        >
                          {paying === aff.affiliate_code ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Marquer payé
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
