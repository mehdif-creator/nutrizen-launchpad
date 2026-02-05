import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { useAffiliateTracking } from "@/hooks/useAffiliateTracking";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Verify from "./pages/auth/Verify";
import Reset from "./pages/auth/Reset";
import Callback from "./pages/auth/Callback";

// App
import Dashboard from "./pages/app/Dashboard";
import MealPlan from "./pages/app/MealPlan";
import Profile from "./pages/app/Profile";
import Settings from "./pages/app/Settings";
import Support from "./pages/app/Support";
import Referral from "./pages/app/Referral";
import AITools from "./pages/app/AITools";
import ScanRepas from "./pages/app/ScanRepas";
import InspiFrigo from "./pages/app/InspiFrigo";
import RecipeDetail from "./pages/app/RecipeDetail";
import MenuHistory from "./pages/app/MenuHistory";
import Gamification from "./pages/app/Gamification";
import Onboarding from "./pages/app/Onboarding";
import ShoppingList from "./pages/app/ShoppingList";
import SupabaseDebug from "./pages/app/SupabaseDebug";
import FamillePlus from "./pages/app/FamillePlus";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOnboarding from "./pages/admin/AdminOnboarding";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminDiagnostics from "./pages/admin/AdminDiagnostics";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminConversion from "./pages/admin/AdminConversion";
import AdminMacrosMaintenance from "./pages/admin/AdminMacrosMaintenance";

// KPI Detail Pages
import KpiMrr from "./pages/admin/kpis/KpiMrr";
import KpiArpu from "./pages/admin/kpis/KpiArpu";
import KpiConversion from "./pages/admin/kpis/KpiConversion";
import KpiChurn from "./pages/admin/kpis/KpiChurn";
import KpiUsersTotal from "./pages/admin/kpis/KpiUsersTotal";
import KpiSubscribersActive from "./pages/admin/kpis/KpiSubscribersActive";
import KpiNewUsers from "./pages/admin/kpis/KpiNewUsers";
import KpiTicketsOpen from "./pages/admin/kpis/KpiTicketsOpen";
import KpiMenusCreated from "./pages/admin/kpis/KpiMenusCreated";
import KpiMenusPerUser from "./pages/admin/kpis/KpiMenusPerUser";
import KpiRatings from "./pages/admin/kpis/KpiRatings";
import KpiPointsTotal from "./pages/admin/kpis/KpiPointsTotal";

// Recipes
import RecipeMacros from "./pages/recipes/RecipeMacros";

// Blog
import BlogIndex from "./pages/blog/BlogIndex";
import BlogPost from "./pages/blog/BlogPost";

// Legal
import MentionsLegales from "./pages/legal/MentionsLegales";
import CGV from "./pages/legal/CGV";
import Confidentialite from "./pages/legal/Confidentialite";
import Resiliation from "./pages/legal/Resiliation";

// Other
import Contact from "./pages/Contact";
import Fit from "./pages/Fit";
import Mum from "./pages/Mum";
import Pro from "./pages/Pro";
import Affiliate from "./pages/Affiliate";
import PostCheckout from "./pages/PostCheckout";
import PostCheckoutProfile from "./pages/PostCheckoutProfile";
import Credits from "./pages/Credits";

const App = () => {
  // Track referral codes from URL
  useReferralTracking();
  // Track affiliate codes from URL
  useAffiliateTracking();

  return (
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
          <Route path="/app/meal-plan" element={<ProtectedRoute><MealPlan /></ProtectedRoute>} />
          <Route path="/app/menu-history" element={<ProtectedRoute><MenuHistory /></ProtectedRoute>} />
          <Route path="/app/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/app/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/app/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
            <Route path="/app/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
          <Route path="/app/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
          <Route path="/app/scan-repas" element={<ProtectedRoute><ScanRepas /></ProtectedRoute>} />
          <Route path="/app/inspi-frigo" element={<ProtectedRoute><InspiFrigo /></ProtectedRoute>} />
          <Route path="/app/recipes/:id" element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
          <Route path="/app/shopping-list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
          <Route path="/app/debug" element={<ProtectedRoute><SupabaseDebug /></ProtectedRoute>} />
          <Route path="/app/famille-plus" element={<ProtectedRoute><FamillePlus /></ProtectedRoute>} />
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
            
            {/* Other */}
            <Route path="/contact" element={<Contact />} />
            <Route path="/fit" element={<Fit />} />
            <Route path="/mum" element={<Mum />} />
            <Route path="/pro" element={<Pro />} />
            <Route path="/affiliate" element={<Affiliate />} />
            <Route path="/post-checkout" element={<PostCheckout />} />
            <Route path="/credits" element={<Credits />} />
            
    <Route path="*" element={<NotFound />} />
  </Routes>
  );
};

export default App;
