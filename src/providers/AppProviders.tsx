import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/sonner';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CookieConsent } from '@/components/common/CookieConsent';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Global providers wrapper
 * - ErrorBoundary for crash protection (especially mobile)
 * - TanStack Query for data fetching & caching
 * - Router for navigation
 * - Auth context for user authentication
 * - UI providers (tooltips, toasts)
 * - Cookie consent banner (GDPR/RGPD compliance)
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <TooltipProvider>
                  {children}
                  <ShadcnToaster />
                  <Toaster />
                  <CookieConsent />
                  {/* Only show React Query devtools in development */}
                  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
                </TooltipProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
