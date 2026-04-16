import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LogOut,
  Loader2,
  Mail,
  BarChart3,
  Users,
  Ticket,
  Home,
  FileText,
  MessageSquare,
  QrCode,
  HandshakeIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const adminSections = [
  {
    titleKey: "admin.sections.crm",
    descriptionKey: "admin.sections.crmDesc",
    url: "/admin/crm",
    icon: HandshakeIcon,
  },
  {
    titleKey: "admin.sections.contacts",
    descriptionKey: "admin.sections.contactsDesc",
    url: "/admin/contacts",
    icon: Mail,
  },
  {
    titleKey: "admin.sections.reviews",
    descriptionKey: "admin.sections.reviewsDesc",
    url: "/admin/reviews",
    icon: MessageSquare,
  },
  {
    titleKey: "admin.sections.analytics",
    descriptionKey: "admin.sections.analyticsDesc",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    titleKey: "admin.sections.affiliates",
    descriptionKey: "admin.sections.affiliatesDesc",
    url: "/admin/affiliates",
    icon: Users,
  },
  {
    titleKey: "admin.sections.promoCodes",
    descriptionKey: "admin.sections.promoCodesDesc",
    url: "/admin/promo-codes",
    icon: Ticket,
  },
  {
    titleKey: "admin.sections.blogs",
    descriptionKey: "admin.sections.blogsDesc",
    url: "/admin/blogs",
    icon: FileText,
  },
  {
    titleKey: "admin.sections.qrReviews",
    descriptionKey: "admin.sections.qrReviewsDesc",
    url: "/admin/qr-reviews",
    icon: QrCode,
  },
];

export default function AdminHome() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/session", {
        credentials: "include",
      });
      const data = await response.json();

      if (!data.authenticated) {
        setLocation(`/${language}/admin/login`);
        return;
      }
    } catch (err) {
      setLocation(`/${language}/admin/login`);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation(`/${language}/admin/login`);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-title">
                {t("admin.dashboard.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("admin.dashboard.subtitle")}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-1" />
            {t("admin.dashboard.logout")}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {adminSections.map((section) => {
            const prefixedUrl = `/${language}${section.url}`;
            return (
              <Link key={section.url} href={prefixedUrl}>
                <Card
                  className="h-full cursor-pointer transition-colors hover-elevate"
                  data-testid={`card-${section.titleKey.split(".").pop()}`}
                >
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t(section.titleKey)}</CardTitle>
                      <CardDescription>{t(section.descriptionKey)}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      {t("admin.goTo", { section: t(section.titleKey) })}
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
