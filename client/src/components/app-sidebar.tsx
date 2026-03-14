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
} from "lucide-react";
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
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: planInfo } = useQuery<PlanInfo>({
    queryKey: ["/api/plan-info"],
  });

  const totalReviews = reviews?.length || 0;

  const currentPlan = planInfo?.planId || "local";

  const filteredNavItems = navigationItems.filter((item) => {
    if (!item.requiresPlan) return true;
    return item.requiresPlan.includes(currentPlan);
  });

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      "U"
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 hover-elevate rounded-md p-2 -m-2 cursor-pointer">
            <div className="flex items-center gap-2 hover-elevate rounded-md p-2 -m-2 cursor-pointer">
              <img
                src="/favicon.png"
                alt="HolaRevi Logo"
                className="h-8 w-8 rounded-md"
              />
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.totalReviews")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <div
              className="flex w-full items-center gap-3 rounded-md border border-sidebar-border bg-sidebar p-3"
              data-testid="sidebar-total-reviews"
            >
              <Star className="h-5 w-5 text-yellow-500" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold" data-testid="text-total-reviews-count">
                  {totalReviews}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("sidebar.totalReviewsLabel")}
                </span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link
                      href={item.url}
                      data-testid={`nav-link-${item.url.replace("/", "") || "dashboard"}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.management")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link
                      href={item.url}
                      data-testid={`nav-link-${item.url.replace("/", "")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-3 rounded-md p-2 hover-elevate"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user?.profileImageUrl || undefined}
                  alt={user?.firstName || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user?.email}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem asChild>
              <Link href="/settings" data-testid="menu-item-settings">
                <Settings className="mr-2 h-4 w-4" />
                {t("sidebar.nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/api/logout" data-testid="menu-item-logout">
                <LogOut className="mr-2 h-4 w-4" />
                {t("common.logout")}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
