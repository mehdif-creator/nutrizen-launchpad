import { supabase } from '@/integrations/supabase/client';

/**
 * Call a Supabase Edge Function with explicit auth headers.
 * Uses fetch directly to ensure the JWT is always passed reliably.
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Aucune session active. Reconnecte-toi.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: payload ? JSON.stringify(payload) : '{}',
  });

  const text = await response.text();

  let data: T;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Réponse invalide de ${functionName}: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const msg = (data as any)?.error ?? (data as any)?.message ?? `Erreur ${response.status}`;
    throw new Error(msg);
  }

  return data;
}
