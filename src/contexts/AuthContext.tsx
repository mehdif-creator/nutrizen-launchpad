import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { trackDailyLogin } from '@/utils/gamification';

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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const navigate = useNavigate();

  const checkAdminRole = useCallback(async (userId: string) => {
    setAdminLoading(true);
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    const currentSession = session;
    if (!currentSession) {
      setSubscription(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;

    // Timeout fallback: ensure loading states resolve within 8 seconds
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthContext] Loading timeout reached, forcing loading=false');
        setLoading(false);
        setAdminLoading(false);
      }
    }, 8000);

    // Check for existing session first
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        // Await admin check before marking loading as done
        try {
          await checkAdminRole(currentSession.user.id);
        } catch (e) {
          console.error('[AuthContext] Admin check failed:', e);
          setAdminLoading(false);
        }
        if (mounted) {
          refreshSubscription();
          trackDailyLogin(currentSession.user.id);
        }
      } else {
        setAdminLoading(false);
      }
      
      if (mounted) setLoading(false);
    }).catch((err) => {
      console.error('[AuthContext] getSession failed:', err);
      if (mounted) {
        setLoading(false);
        setAdminLoading(false);
      }
    });

    // Set up auth state listener for future changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await checkAdminRole(newSession.user.id);
          refreshSubscription();
        } else {
          setIsAdmin(false);
          setAdminLoading(false);
          setSubscription(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      authSub.unsubscribe();
    };
  }, [checkAdminRole]);

  const signOut = async () => {
    setSubscription(null);
    setIsAdmin(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, adminLoading, isAdmin, subscription, refreshSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
