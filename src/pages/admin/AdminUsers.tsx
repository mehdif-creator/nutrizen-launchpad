import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, UserX, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toFrenchDate } from '@/lib/date-utils';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  subscription_status?: string;
  subscription_plan?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('user_id, status, plan');

      if (subsError) throw subsError;

      const usersWithSubs = profiles?.map(profile => {
        const sub = subscriptions?.find(s => s.user_id === profile.id);
        return {
          ...profile,
          subscription_status: sub?.status || 'none',
          subscription_plan: sub?.plan || null,
        };
      }) || [];

      setUsers(usersWithSubs);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Actif', className: 'bg-green-500/20 text-green-700' },
      trialing: { label: 'Essai', className: 'bg-blue-500/20 text-blue-700' },
      canceled: { label: 'Annulé', className: 'bg-red-500/20 text-red-700' },
      none: { label: 'Aucun', className: 'bg-gray-500/20 text-gray-700' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.none;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Utilisateurs</h1>
            <p className="text-muted-foreground">Gérer tous les utilisateurs de la plateforme</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {users.length} utilisateurs
          </Badge>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou nom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Envoyer un email groupé
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>
                      {toFrenchDate(user.created_at)}
                    </TableCell>
                    <TableCell>{getStatusBadge(user.subscription_status || 'none')}</TableCell>
                    <TableCell className="capitalize">
                      {user.subscription_plan || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}
