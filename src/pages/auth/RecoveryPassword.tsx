import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RecoveryPassword() {
  const { user, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    setError('');
    if (password.length < 12) { setError('Utilisez au moins 12 caractères.'); return; }
    if (password !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword('');
      setConfirmation('');
      setSaved(true);
    } catch {
      setError('Le mot de passe n’a pas pu être enregistré. Vérifiez que le lien est encore valide et choisissez un mot de passe différent de l’ancien.');
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen flex items-center justify-center bg-background p-4">
    <section className="w-full max-w-md rounded-2xl border bg-card p-6 space-y-5">
      <h1 className="text-2xl font-bold">Définir mon mot de passe NutriZen</h1>
      {loading ? <p role="status">Vérification du lien…</p> : saved ? <>
        <p role="status">Votre mot de passe NutriZen a été enregistré.</p>
        <Link className="text-primary underline" to="/auth/login">Aller à la connexion</Link>
      </> : !user ? <>
        <p role="alert">Ce lien est invalide ou a expiré. Demandez un nouveau lien pour continuer.</p>
        <Link className="text-primary underline" to="/auth/reset">Demander un nouveau lien</Link>
      </> : <form onSubmit={submit} className="space-y-4">
        <p>Compte : {user.email}. Ce mot de passe concerne uniquement NutriZen.</p>
        <div className="space-y-2"><Label htmlFor="recovery-password">Nouveau mot de passe</Label>
          <Input id="recovery-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="recovery-confirmation">Confirmer le mot de passe</Label>
          <Input id="recovery-confirmation" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></div>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button className="w-full" disabled={busy} type="submit">{busy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</Button>
      </form>}
    </section>
  </main>;
}
