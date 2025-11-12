import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useReferralTracking } from "@/hooks/useReferralTracking";

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

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";

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
import PostCheckout from "./pages/PostCheckout";
import PostCheckoutProfile from "./pages/PostCheckoutProfile";

const App = () => {
  // Track referral codes from URL
  useReferralTracking();

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
            
            {/* Admin (Protected + Admin Only) */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            
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
            <Route path="/post-checkout" element={<PostCheckout />} />
            <Route path="/post-checkout-profile" element={<ProtectedRoute><PostCheckoutProfile /></ProtectedRoute>} />
            
    <Route path="*" element={<NotFound />} />
  </Routes>
  );
};

export default App;
