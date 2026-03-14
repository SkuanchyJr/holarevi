import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Loader2 } from "lucide-react";

import Landing from "@/pages/landing";
import Contact from "@/pages/contact";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import GooglePermissions from "@/pages/google-permissions";
import Dashboard from "@/pages/dashboard";
import Reviews from "@/pages/reviews";
import ReviewSummary from "@/pages/review-summary";
import Restaurants from "@/pages/restaurants";
import Billing from "@/pages/billing";
import Settings from "@/pages/settings";
import Team from "@/pages/team";
import TonePresets from "@/pages/tone-presets";
import Analytics from "@/pages/analytics";
import Locations from "@/pages/locations";
import QRReviews from "@/pages/qr-reviews";
import AdminLogin from "@/pages/admin-login";
import AdminContacts from "@/pages/admin-contacts";
import AdminAffiliates from "@/pages/admin-affiliates";
import AffiliateLogin from "@/pages/affiliate-login";
import AffiliateDashboard from "@/pages/affiliate-dashboard";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminAnalyticsTraffic from "@/pages/admin-analytics-traffic";
import AdminAnalyticsBilling from "@/pages/admin-analytics-billing";
import AdminAnalyticsLocations from "@/pages/admin-analytics-locations";
import AdminAnalyticsUsage from "@/pages/admin-analytics-usage";
import AdminPromoCodes from "@/pages/admin-promo-codes";
import AdminBlogs from "@/pages/admin-blogs";
import AdminReviews from "@/pages/admin-reviews";
import AdminQRReviews from "@/pages/admin-qr-reviews";
import AdminHome from "@/pages/admin-home";
import Prelaunch from "@/pages/prelaunch";
import Onboarding from "@/pages/onboarding";
import SelectPlan from "@/pages/select-plan";
import Paywall from "@/pages/paywall";
import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
import NotFound from "@/pages/not-found";
import { InvitationPopup } from "@/components/invitation-popup";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  const { t } = useLanguage();
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    </div>
  );
}

function usePrelaunchGuard() {
  const [location, setLocation] = useLocation();

  // Check if current path is an admin route - these are ALWAYS excluded from prelaunch
  const isAdminRoute = location.startsWith("/admin");

  // Other paths that should be accessible during prelaunch
  const allowedPaths = [
    "/prelaunch",
    "/contact",
    "/privacy",
    "/terms",
    "/google-permissions",
  ];
  const isAllowedPath = isAdminRoute || allowedPaths.some(
    (p) => location === p || location.startsWith(p + "/"),
  );

  const {
    data: prelaunchStatus,
    isFetched,
    isFetching,
  } = useQuery<{ success: boolean; prelaunchEnabled: boolean }>({
    queryKey: ["/api/prelaunch-status"],
    staleTime: 30000,
    retry: false,
  });

  const isPrelaunchActive =
    prelaunchStatus?.success && prelaunchStatus?.prelaunchEnabled;
  const shouldBlockRoute = isPrelaunchActive && !isAllowedPath;

  const isLoading = !isFetched || isFetching;

  // If we should block the route, redirect to /prelaunch instead of just rendering it
  // This ensures the URL changes as well
  if (shouldBlockRoute && isFetched && !isFetching) {
    setLocation("/prelaunch");
  }

  return {
    isPrelaunchActive: isPrelaunchActive ?? false,
    shouldBlockRoute,
    isLoading,
  };
}

function PageTracker() {
  // Track page views for analytics (separate component to avoid hook issues)
  usePageTracking();
  return null;
}

function Router() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { isLoading: prelaunchLoading } = usePrelaunchGuard();
  const [location] = useLocation();

  // Show loading screen while checking prelaunch status
  if (prelaunchLoading) {
    return <LoadingScreen />;
  }

  // Note: shouldBlockRoute now triggers a redirect in usePrelaunchGuard,
  // so we no longer need to render Prelaunch here - the redirect handles it

  // Admin routes and prelaunch are handled separately from the main app auth
  return (
    <Switch>
      {/* Admin routes - independent from main app auth */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminHome} />
      <Route path="/admin/contacts" component={AdminContacts} />
      <Route path="/admin/affiliates" component={AdminAffiliates} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/analytics/traffic" component={AdminAnalyticsTraffic} />
      <Route path="/admin/analytics/billing" component={AdminAnalyticsBilling} />
      <Route path="/admin/analytics/locations" component={AdminAnalyticsLocations} />
      <Route path="/admin/analytics/usage" component={AdminAnalyticsUsage} />
      <Route path="/admin/promo-codes" component={AdminPromoCodes} />
      <Route path="/admin/blogs" component={AdminBlogs} />
      <Route path="/admin/reviews" component={AdminReviews} />
      <Route path="/admin/qr-reviews" component={AdminQRReviews} />
      {/* Affiliate routes - independent from main app auth */}
      <Route path="/affiliate/login" component={AffiliateLogin} />
      <Route path="/affiliate/dashboard" component={AffiliateDashboard} />


      {/* Prelaunch page - accessible anytime */}
      <Route path="/prelaunch" component={Prelaunch} />

      {/* Main app routes */}
      <Route>
        {() => {
          if (authLoading) {
            return <LoadingScreen />;
          }

          if (!isAuthenticated) {
            return (
              <Switch>
                <Route path="/" component={Landing} />
                <Route path="/contact" component={Contact} />
                <Route path="/privacy" component={PrivacyPolicy} />
                <Route path="/terms" component={TermsOfService} />
                <Route path="/blog/:slug" component={BlogPostPage} />
                <Route path="/blog" component={BlogPage} />
                <Route
                  path="/google-permissions"
                  component={GooglePermissions}
                />
                <Route component={Landing} />
              </Switch>
            );
          }

          // Check if user needs to select a plan (pending status)
          if (user?.subscriptionStatus === "pending") {
            // Pending users can only access /select-plan
            if (location !== "/select-plan") {
              return <Redirect to="/select-plan" />;
            }
            return <SelectPlan />;
          }

          // Non-pending users should not access /select-plan - redirect to dashboard
          if (location === "/select-plan") {
            return <Redirect to="/" />;
          }

          // Check if trial has expired and user has no active subscription
          const isTrialExpired = (user?.subscriptionStatus === "trial" || user?.subscriptionStatus === "trialing") && 
            user?.trialEndsAt && 
            new Date(user.trialEndsAt) < new Date();
          
          const isSubscriptionInactive = user?.subscriptionStatus === "canceled" || 
            user?.subscriptionStatus === "past_due";
          
          const needsPaywall = isTrialExpired || isSubscriptionInactive;

          // Expired trial users can only access /paywall and /billing
          if (needsPaywall) {
            const allowedPaywallPaths = ["/paywall", "/billing"];
            const isAllowedPath = allowedPaywallPaths.some(p => location === p || location.startsWith(p + "/"));
            
            if (!isAllowedPath) {
              return <Redirect to="/paywall" />;
            }
            
            // Render paywall or billing page without sidebar for paywall
            if (location === "/paywall") {
              return <Paywall />;
            }
            
            // Allow billing page with sidebar
            return (
              <AuthenticatedLayout>
                <Billing />
              </AuthenticatedLayout>
            );
          }

          // Active users should not access /paywall - redirect to dashboard
          if (location === "/paywall") {
            return <Redirect to="/" />;
          }

          return (
            <Switch>
              {/* Blog pages - public content, no sidebar */}
              <Route path="/blog/:slug" component={BlogPostPage} />
              <Route path="/blog" component={BlogPage} />
              
              {/* Onboarding page - no sidebar layout */}
              <Route path="/onboarding" component={Onboarding} />
              
              {/* Main authenticated app with sidebar */}
              <Route>
                {() => (
                  <AuthenticatedLayout>
                    <InvitationPopup />
                    <Switch>
                      <Route path="/" component={Dashboard} />
                      <Route path="/reviews" component={Reviews} />
                      <Route path="/review-summary" component={ReviewSummary} />
                      <Route path="/restaurants" component={Restaurants} />
                      <Route path="/locations" component={Locations} />
                      <Route path="/analytics" component={Analytics} />
                      <Route path="/qr-reviews" component={QRReviews} />
                      <Route path="/team" component={Team} />
                      <Route path="/tone-presets" component={TonePresets} />
                      <Route path="/billing" component={Billing} />
                      <Route path="/settings" component={Settings} />
                      <Route path="/contact" component={Contact} />
                      <Route component={NotFound} />
                    </Switch>
                  </AuthenticatedLayout>
                )}
              </Route>
            </Switch>
          );
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <PageTracker />
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
