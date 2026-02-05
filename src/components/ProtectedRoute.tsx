 import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
 import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
   skipOnboardingCheck?: boolean;
}

 export const ProtectedRoute = ({ 
   children, 
   requireAdmin = false,
   skipOnboardingCheck = false,
 }: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
   const location = useLocation();
   
   // Check onboarding status for non-admin routes
   // Skip check for admin routes, onboarding page, and when explicitly skipped
   const shouldCheckOnboarding = !requireAdmin && !skipOnboardingCheck && 
     location.pathname !== '/app/onboarding';
   
   const onboardingStatus = useOnboardingGuard(
     shouldCheckOnboarding ? user?.id : undefined
   );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

   // Wait for onboarding check to complete (if applicable)
   // The guard will handle redirects automatically
   if (shouldCheckOnboarding && onboardingStatus.state === 'loading') {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
  // Redirect admin to admin dashboard if they try to access /app
   if (!requireAdmin && isAdmin && location.pathname === '/app') {
    return <Navigate to="/admin" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
