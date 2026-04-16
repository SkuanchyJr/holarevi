import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  MessageSquare,
  Store,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Palette,
  BarChart3,
  MapPin,
  Sparkles,
  QrCode,
  Star,
  ChevronUp,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Review } from "@shared/schema";
import type { PlanId } from "@shared/plans";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Restaurant } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  titleKey: string;
  url: string;
  icon: typeof LayoutDashboard;
  requiresPlan?: PlanId[];
}

const navigationItems: NavItem[] = [
  {
    titleKey: "sidebar.nav.dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    titleKey: "sidebar.nav.reviews",
    url: "/reviews",
    icon: MessageSquare,
  },
  {
    titleKey: "sidebar.nav.reviewSummary",
    url: "/review-summary",
    icon: Sparkles,
  },
  {
    titleKey: "sidebar.nav.restaurants",
    url: "/restaurants",
    icon: Store,
  },
  {
    titleKey: "sidebar.nav.locations",
    url: "/locations",
    icon: MapPin,
    requiresPlan: ["business", "enterprise"],
  },
  {
    titleKey: "sidebar.nav.analytics",
    url: "/analytics",
    icon: BarChart3,
    requiresPlan: ["pro", "business", "enterprise"],
  },
  {
    titleKey: "sidebar.nav.qrReviews",
    url: "/qr-reviews",
    icon: QrCode,
  },
];

const managementItems: NavItem[] = [
  {
    titleKey: "sidebar.nav.team",
    url: "/team",
    icon: Users,
  },
  {
    titleKey: "sidebar.nav.tonePresets",
    url: "/tone-presets",
    icon: Palette,
  },
  {
    titleKey: "sidebar.nav.billing",
    url: "/billing",
    icon: CreditCard,
  },
  {
    titleKey: "sidebar.nav.settings",
    url: "/settings",
    icon: Settings,
  },
];

interface PlanInfo {
  planId: PlanId;
  features: {
    hasAdvancedAnalytics: boolean;
    hasMultiLocationDashboard: boolean;
  };
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { t, language } = useLanguage();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: planInfo } = useQuery<PlanInfo>({
    queryKey: ["/api/plan-info"],
  });

  const totalReviews = reviews?.length || 0;
  const pendingReviews = reviews?.filter(r => r.replyStatus === "pending").length || 0;
  const currentPlan = planInfo?.planId || "local";

  const filteredNavItems = navigationItems.filter((item) => {
    if (!item.requiresPlan) return true;
    return item.requiresPlan.includes(currentPlan);
  });

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <Sidebar>
      {/* Logo */}
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <Link href={`/${language}/`}>
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <img
                src="/favicon.png"
                alt="HolaRevi"
                className="h-5 w-5 rounded"
              />
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-sm text-foreground tracking-tight">
                HolaRevi
              </span>
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Review stats pill — collapsed: just show number */}
        {!isCollapsed && (
          <div className="mx-2 mb-3 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-medium text-foreground" data-testid="text-total-reviews-count">
                {totalReviews}
              </span>
              <span className="text-xs text-muted-foreground">{t("sidebar.totalReviewsLabel")}</span>
            </div>
            {pendingReviews > 0 && (
              <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                {pendingReviews}
              </span>
            )}
          </div>
        )}

        {!user?.onboardingCompleted && (
          <Button
            asChild
            className={cn(
              "mx-2 mb-3 w-[calc(100%-1rem)] shadow-md animate-pulse hover:animate-none",
              isCollapsed && "justify-center px-2"
            )}
            data-testid="button-tutorial"
          >
            <Link href={`/${language}/onboarding`}>
              <GraduationCap className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{t("sidebar.tutorial")}</span>}
            </Link>
          </Button>
        )}

        {/* Main navigation */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {!isCollapsed && t("sidebar.navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {filteredNavItems.map((item) => {
                const prefixedUrl = `/${language}${item.url === "/" ? "" : item.url}`;
                const isActive = location === prefixedUrl;
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={prefixedUrl}
                        data-testid={`nav-link-${item.url.replace("/", "") || "dashboard"}`}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>{t(item.titleKey)}</span>}
                        {!isCollapsed && item.url === "/reviews" && pendingReviews > 0 && (
                          <span className={cn(
                            "ml-auto text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none",
                            isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                          )}>
                            {pendingReviews}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management navigation */}
        <SidebarGroup className="p-0 mt-4">
          <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {!isCollapsed && t("sidebar.management")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {managementItems.map((item) => {
                const prefixedUrl = `/${language}${item.url === "/" ? "" : item.url}`;
                const isActive = location === prefixedUrl;
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={prefixedUrl}
                        data-testid={`nav-link-${item.url.replace("/", "")}`}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>{t(item.titleKey)}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: user menu */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left",
                isCollapsed && "justify-center p-2"
              )}
              data-testid="button-user-menu"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage
                  src={user?.profileImageUrl || undefined}
                  alt={user?.firstName || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate w-full leading-tight">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate w-full leading-tight">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-[200px] mb-1">
            <DropdownMenuItem asChild>
              <Link href={`/${language}/settings`} data-testid="menu-item-settings">
                <Settings className="mr-2 h-4 w-4" />
                {t("sidebar.nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="menu-item-logout"
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
