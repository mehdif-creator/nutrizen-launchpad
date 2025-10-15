import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Users, Ticket, DollarSign, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">Administration</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-3xl font-bold">1,247</p>
                <p className="text-sm text-green-600">+12% ce mois</p>
              </div>
              <Users className="h-10 w-10 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abonnés actifs</p>
                <p className="text-3xl font-bold">892</p>
                <p className="text-sm text-green-600">+8% ce mois</p>
              </div>
              <TrendingUp className="h-10 w-10 text-accent" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenus (MRR)</p>
                <p className="text-3xl font-bold">17,8k€</p>
                <p className="text-sm text-green-600">+15% ce mois</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tickets ouverts</p>
                <p className="text-3xl font-bold">23</p>
                <p className="text-sm text-amber-600">-3 depuis hier</p>
              </div>
              <Ticket className="h-10 w-10 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Gestion</h2>
            <div className="space-y-3">
              <Link to="/admin/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Gérer les utilisateurs
                </Button>
              </Link>
              <Link to="/admin/tickets">
                <Button variant="outline" className="w-full justify-start">
                  <Ticket className="mr-2 h-4 w-4" />
                  Gérer les tickets
                </Button>
              </Link>
              <Link to="/admin/billing">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Facturation
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Configuration</h2>
            <div className="space-y-3">
              <Link to="/admin/feature-flags">
                <Button variant="outline" className="w-full justify-start">
                  Feature Flags
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                Analytics
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
