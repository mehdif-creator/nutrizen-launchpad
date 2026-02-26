import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { trackDailyLogin } from '@/utils/gamification';
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
      // cached false → don't use cache, retry the RPC
    }

    setAdminLoading(true);
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        logger.error('Admin role check failed', { message: error.message, code: error.code, details: error.details });
        console.error('[AdminCheck] RPC error:', JSON.stringify(error));
        setIsAdmin(false);
        // Do NOT cache failures — allow retry
        return false;
      }
      const result = data === true;
      setIsAdmin(result);
      if (result) {
        adminCheckResultRef.current.set(userId, true);
      }
      logger.debug('Admin check result', { userId: userId.substring(0, 8), isAdmin: result, rawData: data, dataType: typeof data });
      return result;
    } catch (error) {
      logger.error('Admin role check exception', error instanceof Error ? error : new Error(String(error)));
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
    trackDailyLogin(uid);
  }, [refreshSubscription]);

  useEffect(() => {
    let mounted = true;

    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        logger.warn('Auth loading timeout, forcing loading=false');
        setLoading(false);
        // DO NOT set adminLoading=false here — let checkAdminRole resolve naturally.
        // Setting adminLoading=false while isAdmin is still false causes false denials.
      }
    }, 8000);

    // Register listener FIRST so we never miss INITIAL_SESSION with PKCE
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        logger.debug('Auth event', { event, hasSession: !!newSession });

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            await checkAdminRole(newSession.user.id);
            runInitialSetupOnce(newSession);
          }
          // TOKEN_REFRESHED: session updated silently, no admin check
        } else {
          setIsAdmin(false);
          setAdminLoading(false);
          setSubscription(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        try {
          await checkAdminRole(currentSession.user.id);
        } catch (e) {
          logger.error('Admin check failed', e instanceof Error ? e : new Error(String(e)));
          setAdminLoading(false);
        }
        if (mounted) {
          runInitialSetupOnce(currentSession);
        }
      } else {
        // No session → admin check not needed, stop loading
        setAdminLoading(false);
      }

      if (mounted) setLoading(false);
    }).catch((err) => {
      logger.error('getSession failed', err instanceof Error ? err : new Error(String(err)));
      if (mounted) {
        setLoading(false);
        setAdminLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
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

  return (
    <AuthContext.Provider value={{
      user, session, loading, adminLoading, isAdmin, subscription,
      refreshSubscription: () => refreshSubscription(),
      recheckAdmin: () => user ? checkAdminRole(user.id, true) : Promise.resolve(false),
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
