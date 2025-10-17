import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requirePaid?: boolean;
}

export const SubscriptionGuard = ({ children, requirePaid = false }: SubscriptionGuardProps) => {
  const { subscription, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Check if user has an active subscription
    const hasValidSubscription = subscription && 
      (subscription.status === 'trialing' || subscription.status === 'active');

    if (!hasValidSubscription) {
      navigate('/?expired=true', { replace: true });
      return;
    }

    // Check if trial has expired
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      if (trialEnd < new Date()) {
        navigate('/?expired=true', { replace: true });
        return;
      }
    }

    // If paid plan is required, check if user is not on trial
    if (requirePaid && subscription.status === 'trialing') {
      navigate('/app', { replace: true });
    }
  }, [subscription, loading, navigate, requirePaid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasValidSubscription = subscription && 
    (subscription.status === 'trialing' || subscription.status === 'active');

  if (!hasValidSubscription) {
    return null;
  }

  // Check trial expiration
  if (subscription.status === 'trialing' && subscription.trial_end) {
    const trialEnd = new Date(subscription.trial_end);
    if (trialEnd < new Date()) {
      return null;
    }
  }

  if (requirePaid && subscription.status === 'trialing') {
    return null;
  }

  return <>{children}</>;
};
