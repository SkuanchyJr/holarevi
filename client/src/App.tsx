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
import { HelmetProvider } from "react-helmet-async";

import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
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
import AdminCRM from "@/pages/admin-crm";
import AdminHome from "@/pages/admin-home";
import AdminSettings from "@/pages/admin-settings";
import Prelaunch from "@/pages/prelaunch";
import OnboardingPage from "@/pages/onboarding";
import SelectPlan from "@/pages/select-plan";
import Paywall from "@/pages/paywall";
import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
import Pricing from "@/pages/pricing";
import NFCStand from "@/pages/nfc-stand";
import NFCCheckout from "@/pages/nfc-checkout";
import NFCOrderSuccess from "@/pages/nfc-order-success";
import NFCPanel from "@/pages/nfc-panel";
import NotFound from "@/pages/not-found";
import { InvitationPopup } from "@/components/invitation-popup";
import { TrialBanner } from "@/components/trial-banner";
import { DemoBanner } from "@/components/demo-banner";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40 h-12">
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
            />
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <DemoBanner />
          <TrialBanner />
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
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    </div>
  );
}

function usePrelaunchGuard() {
  const [location, setLocation] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  const allowedPaths = ["/prelaunch", "/contact", "/privacy", "/terms", "/google-permissions", "/nfc"];
  const isAllowedPath = isAdminRoute || allowedPaths.some(p => location.includes(p));

  const { data: prelaunchStatus, isFetched, isFetching } = useQuery<{ success: boolean; prelaunchEnabled: boolean }>({
    queryKey: ["/api/prelaunch-status"],
    staleTime: 30000,
    retry: false,
  });

  const isPrelaunchActive = prelaunchStatus?.success && prelaunchStatus?.prelaunchEnabled;
  
  useEffect(() => {
    if (isPrelaunchActive && !isAllowedPath && isFetched && !isFetching && location !== "/prelaunch") {
      setLocation("/prelaunch");
    }
  }, [isPrelaunchActive, isAllowedPath, isFetched, isFetching, location, setLocation]);

  return { isLoading: !isFetched || isFetching };
}

function Router() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const { isLoading: prelaunchLoading } = usePrelaunchGuard();

  useEffect(() => {
    const isPrefixed = location.startsWith("/en") || location.startsWith("/es");
    if (!isPrefixed && !location.startsWith("/api")) {
      const targetLang = language || "es";
      // Use replace: true to avoid polluting history with redirects
      setLocation(`/${targetLang}${location === "/" ? "" : location}`, { replace: true });
    }
  }, [location, language, setLocation]);

  if (prelaunchLoading) return <LoadingScreen />;

  const currentPath = location.replace(/^\/(en|es)/, "") || "/";

  return (
    <Switch>
      <Route path="/:lang(en|es)/admin/login" component={AdminLogin} />
      <Route path="/:lang(en|es)/admin" component={AdminHome} />
      <Route path="/:lang(en|es)/admin/contacts" component={AdminContacts} />
      <Route path="/:lang(en|es)/admin/affiliates" component={AdminAffiliates} />
      <Route path="/:lang(en|es)/admin/analytics" component={AdminAnalytics} />
      <Route path="/:lang(en|es)/admin/analytics/traffic" component={AdminAnalyticsTraffic} />
      <Route path="/:lang(en|es)/admin/analytics/billing" component={AdminAnalyticsBilling} />
      <Route path="/:lang(en|es)/admin/analytics/locations" component={AdminAnalyticsLocations} />
      <Route path="/:lang(en|es)/admin/analytics/usage" component={AdminAnalyticsUsage} />
      <Route path="/:lang(en|es)/admin/promo-codes" component={AdminPromoCodes} />
      <Route path="/:lang(en|es)/admin/blogs" component={AdminBlogs} />
      <Route path="/:lang(en|es)/admin/reviews" component={AdminReviews} />
      <Route path="/:lang(en|es)/admin/qr-reviews" component={AdminQRReviews} />
      <Route path="/:lang(en|es)/admin/crm" component={AdminCRM} />
      <Route path="/:lang(en|es)/admin/settings" component={AdminSettings} />
      
      <Route path="/:lang(en|es)/affiliate/login" component={AffiliateLogin} />
      <Route path="/:lang(en|es)/affiliate/dashboard" component={AffiliateDashboard} />

      <Route path="/:lang(en|es)/*">
        {() => <LocalizedRouter currentPath={currentPath} />}
      </Route>
      
      {/* Fallback for naked routes */}
      <Route path="*">
        <Redirect to={`/${language}/`} />
      </Route>
    </Switch>
  );
}

function LocalizedRouter({ currentPath }: { currentPath: string }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();

  if (authLoading && user === undefined) return <LoadingScreen />;

  const subscriptionStatus = user?.subscriptionStatus?.trim();
  const isPublicRoute = currentPath === "/" || currentPath === "/auth" || currentPath === "/prelaunch" || currentPath.startsWith("/blog") || currentPath === "/contact" || currentPath === "/select-plan" || currentPath === "/pricing" || currentPath === "/nfc" || currentPath === "/nfc/checkout" || currentPath === "/nfc/order-success";

  // SUBSCRIPTION CHECK MUST COME FIRST
  // A new user with subscriptionStatus="pending" must select a plan before onboarding
  if (subscriptionStatus === "pending") {
    const normalizedPath = currentPath.replace("_", "-");
    if (normalizedPath !== "/select-plan") {
      return <Redirect to={`/${language}/select-plan`} />;
    }
    return <SelectPlan />;
  }

  // Unauthenticated users see public pages
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/:lang/auth" component={AuthPage} />
        <Route path="/:lang/" component={Landing} />
        <Route path="/:lang/contact" component={Contact} />
        <Route path="/:lang/privacy" component={PrivacyPolicy} />
        <Route path="/:lang/terms" component={TermsOfService} />
        <Route path="/:lang/blog/:slug" component={BlogPostPage} />
        <Route path="/:lang/blog" component={BlogPage} />
        <Route path="/:lang/pricing" component={Pricing} />
        <Route path="/:lang/nfc" component={NFCStand} />
        <Route path="/:lang/nfc/checkout" component={NFCCheckout} />
        <Route path="/:lang/nfc/order-success" component={NFCOrderSuccess} />
        <Route path="/:lang/google-permissions" component={GooglePermissions} />
        <Route path="/:lang/prelaunch" component={Prelaunch} />
        <Route path="/:lang/*" component={NotFound} />
      </Switch>
    );
  }

  // Onboarding is no longer forced — users see a Tutorial button in the sidebar instead

  if (currentPath === "/select-plan" || currentPath === "/auth") return <Redirect to={`/${language}/`} />;

  const isTrialExpired = (subscriptionStatus === "trial" || subscriptionStatus === "trialing") &&
    user?.trialEndsAt && new Date(user.trialEndsAt) < new Date();
  const isSubscriptionInactive = subscriptionStatus === "canceled" || subscriptionStatus === "past_due";
  
  if (isTrialExpired || isSubscriptionInactive) {
    if (currentPath !== "/paywall" && currentPath !== "/billing") return <Redirect to={`/${language}/paywall`} />;
    if (currentPath === "/paywall") return <Paywall />;
    return <AuthenticatedLayout><Billing /></AuthenticatedLayout>;
  }

  if (currentPath === "/paywall") return <Redirect to={`/${language}/`} />;

  return (
    <Switch>
      <Route path="/:lang/blog/:slug" component={BlogPostPage} />
      <Route path="/:lang/blog" component={BlogPage} />
      <Route path="/:lang/nfc" component={NFCStand} />
      <Route path="/:lang/nfc/checkout" component={NFCCheckout} />
      <Route path="/:lang/nfc/order-success" component={NFCOrderSuccess} />
      <Route>
        <AuthenticatedLayout>
          <InvitationPopup />
          <Switch>
            <Route path="/:lang/onboarding" component={OnboardingPage} />
            <Route path="/:lang/" component={Dashboard} />
            <Route path="/:lang/dashboard" component={Dashboard} />
            <Route path="/:lang/reviews" component={Reviews} />
            <Route path="/:lang/review-summary" component={ReviewSummary} />
            <Route path="/:lang/restaurants" component={Restaurants} />
            <Route path="/:lang/locations" component={Locations} />
            <Route path="/:lang/analytics" component={Analytics} />
            <Route path="/:lang/qr-reviews" component={QRReviews} />
            <Route path="/:lang/team" component={Team} />
            <Route path="/:lang/tone-presets" component={TonePresets} />
            <Route path="/:lang/nfc-panel" component={NFCPanel} />
            <Route path="/:lang/billing" component={Billing} />
            <Route path="/:lang/settings" component={Settings} />
            <Route path="/:lang/contact" component={Contact} />
            <Route path="/:lang/*" component={NotFound} />
          </Switch>
        </AuthenticatedLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <PageTracker />
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function PageTracker() {
  usePageTracking();
  return null;
}

export default App;
