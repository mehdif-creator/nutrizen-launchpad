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

    // Check if user has any subscription (trial or active)
    if (!subscription || (subscription.status !== 'trialing' && subscription.status !== 'active')) {
      navigate('/', { replace: true });
      return;
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

  if (!subscription || (subscription.status !== 'trialing' && subscription.status !== 'active')) {
    return null;
  }

  if (requirePaid && subscription.status === 'trialing') {
    return null;
  }

  return <>{children}</>;
};
