import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';

// Eager: always needed on first render
import Index from './pages/Index';
import NotFound from './pages/NotFound';

// Auth
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const Verify = lazy(() => import('./pages/auth/Verify'));
const Reset = lazy(() => import('./pages/auth/Reset'));
const Callback = lazy(() => import('./pages/auth/Callback'));

// App
const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const MealPlan = lazy(() => import('./pages/app/MealPlan'));
const Profile = lazy(() => import('./pages/app/Profile'));
const Settings = lazy(() => import('./pages/app/Settings'));
const Support = lazy(() => import('./pages/app/Support'));
const Referral = lazy(() => import('./pages/app/Referral'));
const AITools = lazy(() => import('./pages/app/AITools'));
const ScanRepas = lazy(() => import('./pages/app/ScanRepas'));
const InspiFrigo = lazy(() => import('./pages/app/InspiFrigo'));
const RecipeDetail = lazy(() => import('./pages/app/RecipeDetail'));
const MenuHistory = lazy(() => import('./pages/app/MenuHistory'));
const Gamification = lazy(() => import('./pages/app/Gamification'));
const Onboarding = lazy(() => import('./pages/app/Onboarding'));
const ShoppingList = lazy(() => import('./pages/app/ShoppingList'));
const SupabaseDebug = lazy(() => import('./pages/app/SupabaseDebug'));
const FamillePlus = lazy(() => import('./pages/app/FamillePlus'));
const DayMenu = lazy(() => import('./pages/app/DayMenu'));
const ScanBarcode = lazy(() => import('./pages/app/ScanBarcode'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminOnboarding = lazy(() => import('./pages/admin/AdminOnboarding'));
const AdminTickets = lazy(() => import('./pages/admin/AdminTickets'));
const AdminDiagnostics = lazy(() => import('./pages/admin/AdminDiagnostics'));
const AdminReferrals = lazy(() => import('./pages/admin/AdminReferrals'));
const AdminConversion = lazy(() => import('./pages/admin/AdminConversion'));
const AdminMacrosMaintenance = lazy(() => import('./pages/admin/AdminMacrosMaintenance'));
const AdminHealth = lazy(() => import('./pages/admin/AdminHealth'));
const AutomationIndex = lazy(() => import('./pages/admin/AutomationIndex'));
const AdminSeoFactory = lazy(() => import('./pages/admin/AdminSeoFactory'));

// KPI Detail Pages
const KpiMrr = lazy(() => import('./pages/admin/kpis/KpiMrr'));
const KpiArpu = lazy(() => import('./pages/admin/kpis/KpiArpu'));
const KpiConversion = lazy(() => import('./pages/admin/kpis/KpiConversion'));
const KpiChurn = lazy(() => import('./pages/admin/kpis/KpiChurn'));
const KpiUsersTotal = lazy(() => import('./pages/admin/kpis/KpiUsersTotal'));
const KpiSubscribersActive = lazy(() => import('./pages/admin/kpis/KpiSubscribersActive'));
const KpiNewUsers = lazy(() => import('./pages/admin/kpis/KpiNewUsers'));
const KpiTicketsOpen = lazy(() => import('./pages/admin/kpis/KpiTicketsOpen'));
const KpiMenusCreated = lazy(() => import('./pages/admin/kpis/KpiMenusCreated'));
const KpiMenusPerUser = lazy(() => import('./pages/admin/kpis/KpiMenusPerUser'));
const KpiRatings = lazy(() => import('./pages/admin/kpis/KpiRatings'));
const KpiPointsTotal = lazy(() => import('./pages/admin/kpis/KpiPointsTotal'));

// Recipes
const RecipeMacros = lazy(() => import('./pages/recipes/RecipeMacros'));

// Blog
const BlogIndex = lazy(() => import('./pages/blog/BlogIndex'));
const BlogPost = lazy(() => import('./pages/blog/BlogPost'));

// Legal
const MentionsLegales = lazy(() => import('./pages/legal/MentionsLegales'));
const CGV = lazy(() => import('./pages/legal/CGV'));
const Confidentialite = lazy(() => import('./pages/legal/Confidentialite'));
const Resiliation = lazy(() => import('./pages/legal/Resiliation'));

// Other
const Contact = lazy(() => import('./pages/Contact'));
const Fit = lazy(() => import('./pages/Fit'));
const Mum = lazy(() => import('./pages/Mum'));
const Pro = lazy(() => import('./pages/Pro'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const PostCheckout = lazy(() => import('./pages/PostCheckout'));
const PostCheckoutProfile = lazy(() => import('./pages/PostCheckoutProfile'));
const Credits = lazy(() => import('./pages/Credits'));
const About = lazy(() => import('./pages/About'));
const PinterestOAuthCallback = lazy(() => import('./pages/oauth/PinterestOAuthCallback'));
const SharedWeekPlan = lazy(() => import('./pages/share/SharedWeekPlan'));

// Guides (lead magnets)
const Defi7Jours = lazy(() => import('./pages/guides/Defi7Jours'));
const Programme21Jours = lazy(() => import('./pages/guides/Programme21Jours'));
const FrigoZen = lazy(() => import('./pages/guides/FrigoZen'));
const TroisSecretsCoach = lazy(() => import('./pages/guides/TroisSecretsCoach'));

const App = () => {
  // Track referral codes from URL
  useReferralTracking();
  // Track affiliate codes from URL
  useAffiliateTracking();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <Routes>
        <Route path="/" element={<Index />} />

        {/* Auth */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/verify" element={<Verify />} />
        <Route path="/auth/reset" element={<Reset />} />
        <Route path="/auth/callback" element={<Callback />} />

        {/* App (Protected) */}
        <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/app/onboarding" element={<ProtectedRoute skipOnboardingCheck><Onboarding /></ProtectedRoute>} />
        <Route path="/app/meal-plan" element={<ProtectedRoute><ErrorBoundary><MealPlan /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/app/menu-history" element={<ProtectedRoute><MenuHistory /></ProtectedRoute>} />
        <Route path="/app/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/app/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="/app/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
        <Route path="/app/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
        <Route path="/app/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
        <Route path="/app/scan-repas" element={<ProtectedRoute><ErrorBoundary><ScanRepas /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/app/inspi-frigo" element={<ProtectedRoute><ErrorBoundary><InspiFrigo /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/app/recipes/:id" element={<ProtectedRoute><ErrorBoundary><RecipeDetail /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/app/shopping-list" element={<ProtectedRoute><ErrorBoundary><ShoppingList /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/app/supabase-debug" element={<ProtectedRoute requireAdmin><SupabaseDebug /></ProtectedRoute>} />
        <Route path="/app/famille-plus" element={<ProtectedRoute><FamillePlus /></ProtectedRoute>} />
        <Route path="/app/day-menu/:date" element={<ProtectedRoute><DayMenu /></ProtectedRoute>} />
        <Route path="/app/scan-barcode" element={<ProtectedRoute><ErrorBoundary><ScanBarcode /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/pricing" element={<FamillePlus />} />

        {/* Admin (Protected + Admin Only) */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/onboarding" element={<ProtectedRoute requireAdmin><AdminOnboarding /></ProtectedRoute>} />
        <Route path="/admin/tickets" element={<ProtectedRoute requireAdmin><AdminTickets /></ProtectedRoute>} />
        <Route path="/admin/diagnostics" element={<ProtectedRoute requireAdmin><AdminDiagnostics /></ProtectedRoute>} />
        <Route path="/admin/referrals" element={<ProtectedRoute requireAdmin><AdminReferrals /></ProtectedRoute>} />
        <Route path="/admin/conversion" element={<ProtectedRoute requireAdmin><AdminConversion /></ProtectedRoute>} />
        <Route path="/admin/macros-maintenance" element={<ProtectedRoute requireAdmin><AdminMacrosMaintenance /></ProtectedRoute>} />
        <Route path="/admin/health" element={<ProtectedRoute requireAdmin><AdminHealth /></ProtectedRoute>} />
        <Route path="/admin/automation/*" element={<ProtectedRoute requireAdmin><AutomationIndex /></ProtectedRoute>} />
        <Route path="/admin/seo-factory" element={<ProtectedRoute requireAdmin><AdminSeoFactory /></ProtectedRoute>} />

        {/* Admin KPI Detail Pages */}
        <Route path="/admin/kpis/mrr" element={<ProtectedRoute requireAdmin><KpiMrr /></ProtectedRoute>} />
        <Route path="/admin/kpis/arpu" element={<ProtectedRoute requireAdmin><KpiArpu /></ProtectedRoute>} />
        <Route path="/admin/kpis/conversion" element={<ProtectedRoute requireAdmin><KpiConversion /></ProtectedRoute>} />
        <Route path="/admin/kpis/churn" element={<ProtectedRoute requireAdmin><KpiChurn /></ProtectedRoute>} />
        <Route path="/admin/kpis/users-total" element={<ProtectedRoute requireAdmin><KpiUsersTotal /></ProtectedRoute>} />
        <Route path="/admin/kpis/subscribers-active" element={<ProtectedRoute requireAdmin><KpiSubscribersActive /></ProtectedRoute>} />
        <Route path="/admin/kpis/new-users" element={<ProtectedRoute requireAdmin><KpiNewUsers /></ProtectedRoute>} />
        <Route path="/admin/kpis/tickets-open" element={<ProtectedRoute requireAdmin><KpiTicketsOpen /></ProtectedRoute>} />
        <Route path="/admin/kpis/menus-created" element={<ProtectedRoute requireAdmin><KpiMenusCreated /></ProtectedRoute>} />
        <Route path="/admin/kpis/menus-per-user" element={<ProtectedRoute requireAdmin><KpiMenusPerUser /></ProtectedRoute>} />
        <Route path="/admin/kpis/ratings" element={<ProtectedRoute requireAdmin><KpiRatings /></ProtectedRoute>} />
        <Route path="/admin/kpis/points-total" element={<ProtectedRoute requireAdmin><KpiPointsTotal /></ProtectedRoute>} />

        {/* Recipes */}
        <Route path="/recipes/macros" element={<ProtectedRoute><RecipeMacros /></ProtectedRoute>} />

        {/* Blog */}
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogPost />} />

        {/* Legal */}
        <Route path="/legal/mentions" element={<MentionsLegales />} />
        <Route path="/legal/cgv" element={<CGV />} />
        <Route path="/legal/confidentialite" element={<Confidentialite />} />
        <Route path="/legal/resiliation" element={<Resiliation />} />

        {/* Share (public, no auth wall) */}
        <Route path="/share/week/:token" element={<SharedWeekPlan />} />

        {/* OAuth Callbacks (public, no auth wall) */}
        <Route path="/oauth/pinterest/callback" element={<PinterestOAuthCallback />} />

        {/* Guides (lead magnets — noindex, direct link only) */}
        <Route path="/guides/defi-7-jours" element={<Defi7Jours />} />
        <Route path="/guides/programme-21-jours" element={<Programme21Jours />} />
        <Route path="/guides/frigo-zen" element={<FrigoZen />} />
        <Route path="/guides/3-secrets-coach" element={<TroisSecretsCoach />} />

        {/* Other */}
        <Route path="/contact" element={<Contact />} />
        <Route path="/fit" element={<Fit />} />
        <Route path="/mum" element={<Mum />} />
        <Route path="/pro" element={<Pro />} />
        <Route path="/affiliate" element={<Affiliate />} />
        <Route path="/post-checkout" element={<PostCheckout />} />
        <Route path="/post-checkout-profile" element={<ProtectedRoute skipOnboardingCheck><PostCheckoutProfile /></ProtectedRoute>} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/a-propos" element={<About />} />
        <Route path="/about" element={<About />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default App;
