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

const adminSections = [
  {
    title: "CRM de Ventas",
    description: "Pipeline Kanban de leads comerciales",
    href: "/admin/crm",
    icon: HandshakeIcon,
  },
  {
    title: "Contacts",
    description: "View and manage contact form submissions",
    href: "/admin/contacts",
    icon: Mail,
  },
  {
    title: "Reviews",
    description: "View all reviews across the platform",
    href: "/admin/reviews",
    icon: MessageSquare,
  },
  {
    title: "Analytics",
    description: "Traffic, billing, locations, and usage statistics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Affiliates",
    description: "Manage affiliate partners and their performance",
    href: "/admin/affiliates",
    icon: Users,
  },
  {
    title: "Promo Codes",
    description: "Create and manage discount codes",
    href: "/admin/promo-codes",
    icon: Ticket,
  },
  {
    title: "Blogs",
    description: "Create and manage blog posts for SEO",
    href: "/admin/blogs",
    icon: FileText,
  },
  {
    title: "QR Reviews",
    description: "Create and track Google Reviews QR codes",
    href: "/admin/qr-reviews",
    icon: QrCode,
  },
];

export default function AdminHome() {
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
        setLocation("/admin/login");
        return;
      }
    } catch (err) {
      setLocation("/admin/login");
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
      setLocation("/admin/login");
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
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                HolaRevi Administration
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
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {adminSections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card
                className="h-full cursor-pointer transition-colors hover-elevate"
                data-testid={`card-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <section.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Go to {section.title}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
