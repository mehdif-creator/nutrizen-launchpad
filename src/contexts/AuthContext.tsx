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
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const navigate = useNavigate();

  // Refs to deduplicate concurrent admin checks
  const adminCheckInFlight = useRef(false);
  const lastCheckedUserId = useRef<string | null>(null);

  // Stable reference — no reactive deps. Always receives userId as param.
  const checkAdminRole = useCallback(async (userId: string) => {
    if (adminCheckInFlight.current && lastCheckedUserId.current === userId) {
      logger.debug('Admin check already in flight, skipping duplicate');
      return;
    }

    adminCheckInFlight.current = true;
    lastCheckedUserId.current = userId;
    setAdminLoading(true);

    try {
      const { data, error } = await supabase.rpc('is_admin');

      if (error) {
        logger.error('Admin role check failed', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
        logger.debug('Admin check result', { userId: userId.substring(0, 8), isAdmin: data });
      }
    } catch (error) {
      logger.error('Admin role check exception', error instanceof Error ? error : new Error(String(error)));
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
      adminCheckInFlight.current = false;
    }
  }, []); // NO user?.id — stable forever

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

  useEffect(() => {
    let mounted = true;

    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        logger.warn('Auth loading timeout, forcing resolution');
        setLoading(false);
        setAdminLoading(false);
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
            // Only check admin if user changed or never checked
            if (lastCheckedUserId.current !== newSession.user.id) {
              await checkAdminRole(newSession.user.id);
            }
            refreshSubscription(newSession);
            trackDailyLogin(newSession.user.id);
          }
          // TOKEN_REFRESHED: session updated silently, no adminLoading flip
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
        // Only check admin if not already verified for this user
        if (lastCheckedUserId.current !== currentSession.user.id) {
          try {
            await checkAdminRole(currentSession.user.id);
          } catch (e) {
            logger.error('Admin check failed', e instanceof Error ? e : new Error(String(e)));
            setAdminLoading(false);
          }
        }
        if (mounted) {
          refreshSubscription(currentSession);
          trackDailyLogin(currentSession.user.id);
        }
      } else {
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
  }, []); // EMPTY deps — runs once, never re-registers

  const signOut = async () => {
    clearOnboardingCache();
    lastCheckedUserId.current = null;
    setSubscription(null);
    setIsAdmin(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, adminLoading, isAdmin, subscription,
      refreshSubscription: () => refreshSubscription(),
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
