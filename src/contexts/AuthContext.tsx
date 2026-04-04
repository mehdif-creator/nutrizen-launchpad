import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { createLogger } from '@/lib/logger';
import { clearOnboardingCache } from '@/lib/onboarding/status';

const logger = createLogger('AuthContext');

interface SubscriptionInfo {
  subscribed: boolean;
  plan: string | null;
  status: string;
  subscription_end: string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminLoading: boolean;
  isAdmin: boolean;
  subscription: SubscriptionInfo | null;
  refreshSubscription: () => Promise<void>;
  recheckAdmin: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // A) Start true so ProtectedRoute never redirects before first check
  const [adminLoading, setAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const navigate = useNavigate();

  // B) Cache resolved admin check results per userId (avoids re-checking on re-renders)
  const adminCheckResultRef = useRef<Map<string, boolean>>(new Map());
  // De-dupe initial session side effects (subscription refresh + daily login) per user
  const initialSetupDoneForUser = useRef<string | null>(null);

  const checkAdminRole = useCallback(async (userId: string, forceRefresh = false): Promise<boolean> => {
    if (!userId) {
      setIsAdmin(false);
      setAdminLoading(false);
      return false;
    }

    // Only return cached result if it was TRUE (never cache false — allows retry)
    if (!forceRefresh && adminCheckResultRef.current.has(userId)) {
      const cached = adminCheckResultRef.current.get(userId)!;
      if (cached === true) {
        setIsAdmin(true);
        setAdminLoading(false);
        return true;
      }
    }

    setAdminLoading(true);
    try {
      console.log('[checkAdminRole] Checking admin for userId:', userId);

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      console.log('[checkAdminRole] Result:', { data, error });

      if (error) {
        console.error('[checkAdminRole] Query error:', error.message, error.code);
        setIsAdmin(false);
        return false;
      }

      if (!data) {
        console.warn('[checkAdminRole] No admin row found for:', userId);
        setIsAdmin(false);
        return false;
      }

      const result = data.role === 'admin';
      console.log('[checkAdminRole] isAdmin:', result);
      setIsAdmin(result);
      if (result) adminCheckResultRef.current.set(userId, true);
      return result;
    } catch (err) {
      console.error('[checkAdminRole] Unexpected error:', err instanceof Error ? err.message : err);
      setIsAdmin(false);
      return false;
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async (sessionOverride?: Session | null) => {
    const currentSession = sessionOverride !== undefined ? sessionOverride : session;
    if (!currentSession) {
      setSubscription(null);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      if (error) {
        logger.error('Error checking subscription', error);
        return;
      }
      setSubscription(data);
    } catch (error) {
      logger.error('Error refreshing subscription', error instanceof Error ? error : new Error(String(error)));
    }
  }, [session]);

  // C) Run subscription refresh + daily login exactly once per user
  const runInitialSetupOnce = useCallback((sess: Session) => {
    const uid = sess.user.id;
    if (initialSetupDoneForUser.current === uid) return;
    initialSetupDoneForUser.current = uid;

    refreshSubscription(sess);

    // Award daily login via V2 gamification system (idempotent per day)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    (supabase.rpc as Function)('fn_emit_gamification_event', {
      p_event_type: 'APP_OPEN',
      p_meta: {},
      p_idempotency_key: `app_open:${uid}:${today}`,
    }).then(({ error }: any) => {
      if (error) logger.warn('Daily login gamification event failed', error);
    });
  }, [refreshSubscription]);

  useEffect(() => {
    let mounted = true;
    // Track whether the listener already resolved auth so getSession doesn't double-fire
    let resolvedByListener = false;

    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        logger.warn('Auth loading timeout, forcing loading=false');
        setLoading(false);
        setAdminLoading(false);
      }
    }, 10000);

    const handleSession = async (
      newSession: Session | null,
      event: string,
      source: string,
    ) => {
      if (!mounted) return;
      clearTimeout(loadingTimeout);

      console.log(`[AuthContext] ${source} event:`, event, 'User:', newSession?.user?.email);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user && newSession?.access_token) {
        try {
          // Wait for JWT to propagate to PostgREST before querying RLS-protected tables
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            await new Promise((r) => setTimeout(r, 500));
          }
          if (!mounted) return;
          await checkAdminRole(newSession.user.id);
        } catch (e) {
          logger.error('Admin check failed', e instanceof Error ? e : new Error(String(e)));
          setAdminLoading(false);
        }

        if (mounted && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          runInitialSetupOnce(newSession);
        }
      } else {
        setIsAdmin(false);
        setAdminLoading(false);
        setSubscription(null);
      }

      if (mounted) setLoading(false);
    };

    // Register listener FIRST so we never miss INITIAL_SESSION with PKCE
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        // PKCE/session restore can briefly emit INITIAL_SESSION with no session yet.
        // Do not resolve auth from that placeholder event; let fallback getSession confirm.
        if (event === 'INITIAL_SESSION' && !newSession) {
          logger.warn('INITIAL_SESSION arrived without session, waiting for fallback getSession');
          return;
        }

        resolvedByListener = true;

        window.setTimeout(() => {
          if (!mounted) return;
          void handleSession(newSession, event, 'listener');
        }, 0);
      }
    );

    // Fallback: if the listener hasn't fired after a short delay, use getSession
    const fallbackTimer = setTimeout(() => {
      if (resolvedByListener || !mounted) return;
      supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
        if (resolvedByListener || !mounted) return;
        await handleSession(currentSession, 'FALLBACK', 'getSession');
      }).catch((err) => {
        logger.error('getSession failed', err instanceof Error ? err : new Error(String(err)));
        if (mounted) {
          setLoading(false);
          setAdminLoading(false);
        }
      });
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimer);
      authSub.unsubscribe();
    };
  }, []); // EMPTY deps — runs once

  const signOut = async () => {
    try {
      clearOnboardingCache();
      initialSetupDoneForUser.current = null;
      adminCheckResultRef.current.clear();
      setSubscription(null);
      setIsAdmin(false);
      setAdminLoading(false);
      await supabase.auth.signOut();
    } catch (error) {
      logger.error('Sign out error', error instanceof Error ? error : new Error(String(error)));
      console.error('[SignOut] Error:', error);
      // Force clear local state even if signOut API fails
      setUser(null);
      setSession(null);
    } finally {
      navigate('/');
    }
  };

  const recheckAdmin = useCallback((): Promise<boolean> => {
    if (!user) return Promise.resolve(false);
    return checkAdminRole(user.id, true);
  }, [user, checkAdminRole]);

  return (
    <AuthContext.Provider value={{
      user, session, loading, adminLoading, isAdmin, subscription,
      refreshSubscription: () => refreshSubscription(),
      recheckAdmin,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
