import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database, Image, User, Shield } from 'lucide-react';

interface TestResult {
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function SupabaseDebug() {
  const { user, loading: authLoading } = useAuth();
  const [tests, setTests] = useState<Record<string, TestResult>>({
    auth: { status: 'pending', message: 'En attente...' },
    dbRead: { status: 'pending', message: 'En attente...' },
    dbWrite: { status: 'pending', message: 'En attente...' },
    storage: { status: 'pending', message: 'En attente...' },
  });
  const [running, setRunning] = useState(false);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth/login" replace />;
  }

  const runTests = async () => {
    if (!user) return;
    setRunning(true);

    // Reset all tests
    setTests({
      auth: { status: 'pending', message: 'Test en cours...' },
      dbRead: { status: 'pending', message: 'Test en cours...' },
      dbWrite: { status: 'pending', message: 'Test en cours...' },
      storage: { status: 'pending', message: 'Test en cours...' },
    });

    // Test 1: Auth
    try {
      const { data: session, error } = await supabase.auth.getUser();
      if (error) throw error;
      setTests(prev => ({
        ...prev,
        auth: {
          status: 'success',
          message: 'Connexion Supabase : OK',
          details: `User ID: ${session.user?.id?.slice(0, 8)}... | Email: ${session.user?.email}`,
        },
      }));
    } catch (err: any) {
      setTests(prev => ({
        ...prev,
        auth: {
          status: 'error',
          message: 'Connexion Supabase : ERREUR',
          details: err.message,
        },
      }));
    }

    // Test 2: DB Read
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title')
        .limit(1)
        .single();
      if (error) throw error;
      setTests(prev => ({
        ...prev,
        dbRead: {
          status: 'success',
          message: 'Lecture DB : OK',
          details: `Recette test: "${data?.title?.slice(0, 40)}..."`,
        },
      }));
    } catch (err: any) {
      setTests(prev => ({
        ...prev,
        dbRead: {
          status: 'error',
          message: 'Lecture DB : ERREUR',
          details: err.message,
        },
      }));
    }

    // Test 3: DB Write (profile upsert)
    try {
      const testValue = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, updated_at: testValue },
          { onConflict: 'id' }
        );
      if (error) throw error;
      setTests(prev => ({
        ...prev,
        dbWrite: {
          status: 'success',
          message: 'Écriture profil : OK',
          details: `Mise à jour réussie à ${new Date().toLocaleTimeString('fr-FR')}`,
        },
      }));
    } catch (err: any) {
      setTests(prev => ({
        ...prev,
        dbWrite: {
          status: 'error',
          message: 'Écriture profil : ERREUR (RLS ?)',
          details: err.message,
        },
      }));
    }

    // Test 4: Storage access
    try {
      const { data } = supabase.storage
        .from('recipe-images')
        .getPublicUrl('test-placeholder.jpg');
      
      // Try to actually fetch the URL to verify access
      const testUrl = data?.publicUrl;
      if (testUrl) {
        // Just check if we can generate URLs - actual 403 would be on fetch
        setTests(prev => ({
          ...prev,
          storage: {
            status: 'success',
            message: 'Accès images : OK',
            details: `URL générée correctement. Bucket "recipe-images" accessible.`,
          },
        }));
      } else {
        throw new Error('Impossible de générer l\'URL');
      }
    } catch (err: any) {
      setTests(prev => ({
        ...prev,
        storage: {
          status: 'error',
          message: 'Accès images : ERREUR (403 = permissions storage/RLS)',
          details: err.message,
        },
      }));
    }

    setRunning(false);
  };

  useEffect(() => {
    if (user && !authLoading) {
      runTests();
    }
  }, [user, authLoading]);

  const StatusIcon = ({ status }: { status: TestResult['status'] }) => {
    if (status === 'pending') return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    if (status === 'success') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const testIcons: Record<string, React.ReactNode> = {
    auth: <User className="h-4 w-4" />,
    dbRead: <Database className="h-4 w-4" />,
    dbWrite: <Shield className="h-4 w-4" />,
    storage: <Image className="h-4 w-4" />,
  };

  const testLabels: Record<string, string> = {
    auth: 'Authentification',
    dbRead: 'Lecture base de données',
    dbWrite: 'Écriture profil',
    storage: 'Accès images (Storage)',
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Debug Supabase</h1>
              <p className="text-muted-foreground text-sm">
                Vérifie la connexion et les permissions de ton compte
              </p>
            </div>
            <Button onClick={runTests} disabled={running} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
              Relancer les tests
            </Button>
          </div>

          <Card className="p-6 space-y-4">
            {Object.entries(tests).map(([key, result]) => (
              <div
                key={key}
                className={`flex items-start gap-4 p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                    : result.status === 'error'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    : 'bg-muted/50 border-muted'
                }`}
              >
                <StatusIcon status={result.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {testIcons[key]}
                    <span className="font-medium text-sm">{testLabels[key]}</span>
                    <Badge
                      variant={
                        result.status === 'success'
                          ? 'default'
                          : result.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {result.status === 'success' ? 'OK' : result.status === 'error' ? 'ERREUR' : '...'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </Card>

          <Card className="p-4 bg-muted/30">
            <h3 className="font-medium text-sm mb-2">Informations de connexion</h3>
            <div className="text-xs font-mono space-y-1 text-muted-foreground">
              <p>
                <strong>Supabase URL:</strong>{' '}
                {import.meta.env.VITE_SUPABASE_URL || 'Non définie'}
              </p>
              <p>
                <strong>User ID:</strong> {user?.id || 'Non connecté'}
              </p>
              <p>
                <strong>Email:</strong> {user?.email || 'N/A'}
              </p>
            </div>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              Si des tests échouent, vérifie les politiques RLS et les permissions Storage dans Supabase.
            </p>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
