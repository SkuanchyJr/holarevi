import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  MapPin,
  Reply,
  BarChart3,
  User,
  Palette,
  Users,
  Headphones,
  LayoutDashboard,
  Shield,
  FileCheck,
  UserCheck,
  Building2,
  Zap,
  Settings,
  Sparkles,
  Gauge,
  Globe,
  Star,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { Link } from "wouter";
import { ReviewDemo } from "@/components/review-demo";
import { useLanguage } from "@/lib/i18n";

type BillingCycle = "monthly" | "yearly";

const PRICING = {
  local: { monthly: 49, yearly: 470.4 },
  pro: { monthly: 99, yearly: 950.4 },
  business: { monthly: 199, yearly: 1909.6 },
};

export default function Prelaunch() {
  const { t, language } = useLanguage();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleComingSoon = () => {
    setShowComingSoon(true);
  };

  useEffect(() => {
    const target = new Date("2025-12-10T10:00:00+01:00").getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(t("prelaunch.launching"));
        clearInterval(timer);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [t]);

  const getPrice = (planKey: keyof typeof PRICING) => {
    if (billingCycle === "yearly") {
      return Math.round(PRICING[planKey].yearly / 12);
    }
    return PRICING[planKey].monthly;
  };

  const getYearlyTotal = (planKey: keyof typeof PRICING) => {
    return PRICING[planKey].yearly;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center py-4">
            <img
              src="/holarevi-dark.png"
              alt="HolaRevi Logo"
              className="h-10 w-auto block dark:hidden object-contain"
            />
            <img
              src="/holarevi-light.png"
              alt="HolaRevi Logo"
              className="h-10 w-auto hidden dark:block object-contain"
            />
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link href="/contact">{t("common.contact")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
                {t("prelaunch.launchDate")}
              </p>
              <div
                className="inline-block px-8 py-4 rounded-2xl border border-primary/40 
                              bg-primary/5 backdrop-blur-sm
                              shadow-[0_0_25px_5px_rgba(0,113,255,0.35)]
                              transition-all"
              >
                <p className="text-5xl sm:text-6xl font-mono font-semibold text-primary drop-shadow-[0_0_8px_rgba(0,113,255,0.6)]">
                  {timeLeft}
                </p>
              </div>
            </div>

            <div className="space-y-12">
              <div className="text-center lg:text-left space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                  {t("prelaunch.heroTitle")}{" "}
                  <span className="text-primary">{t("prelaunch.heroTitleHighlight")}</span>
                </h1>

                <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                  {t("prelaunch.heroDescription")}
                  <span className="font-semibold text-foreground">
                    {" "}
                    {t("prelaunch.heroDescriptionBold")}
                  </span>{" "}
                  {t("prelaunch.heroDescriptionEnd")}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="p-6 rounded-xl bg-muted/30 backdrop-blur border hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                      <Reply className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("prelaunch.features.humanReplies.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("prelaunch.features.humanReplies.desc")}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-muted/30 backdrop-blur border hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                      <Gauge className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("prelaunch.features.saveTime.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("prelaunch.features.saveTime.desc")}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-muted/30 backdrop-blur border hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("prelaunch.features.multilingual.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("prelaunch.features.multilingual.desc")}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-muted/30 backdrop-blur border hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("prelaunch.features.reputation.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("prelaunch.features.reputation.desc")}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-muted/30 backdrop-blur border hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("prelaunch.features.control.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("prelaunch.features.control.desc")}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-muted/30 backdrop-blur border hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("prelaunch.features.realBusiness.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("prelaunch.features.realBusiness.desc")}
                  </p>
                </div>
              </div>

              <div className="pt-8 w-full flex flex-col items-center lg:items-start gap-6">
                <Button
                  size="lg"
                  className="px-10 py-6 rounded-xl shadow-[0_0_25px_rgba(0,113,255,0.35)] hover:shadow-[0_0_35px_rgba(0,113,255,0.5)] transition text-base font-semibold"
                  asChild
                >
                  <Link href="/contact" className="flex items-center gap-3">
                    {t("prelaunch.ctaButton")}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 text-sm">
                  <div className="px-4 py-2 rounded-md bg-primary/10 border border-primary/20 text-primary font-medium">
                    {t("prelaunch.benefits.frozen")}
                  </div>

                  <div className="px-4 py-2 rounded-md bg-primary/10 border border-primary/20 text-primary font-medium">
                    {t("prelaunch.benefits.earlyAccess")}
                  </div>

                  <div className="px-4 py-2 rounded-md bg-primary/10 border border-primary/20 text-primary font-medium">
                    {t("prelaunch.benefits.prioritySupport")}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground max-w-md text-center lg:text-left">
                  {t("prelaunch.urgencyText")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/20 py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <ReviewDemo />
          </div>
        </section>

        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="secondary" className="mb-4">
                {t("pricing.badge")}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("pricing.title")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("pricing.subtitle")}
              </p>

              <div className="mt-8 flex items-center justify-center gap-4">
                <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
                  {t("pricing.monthly")}
                </span>
                <button
                  onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${billingCycle === "yearly" ? "bg-primary" : "bg-primary/20"}`}
                  data-testid="toggle-billing"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className={`text-sm ${billingCycle === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {t("pricing.yearly")} <span className="text-primary font-medium">{t("pricing.save20")}</span>
                </span>
              </div>
            </div>

            {showComingSoon && (
              <div className="mx-auto mt-8 max-w-2xl" data-testid="prelaunch-notice">
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 text-center backdrop-blur-sm">
                  <h3 className="text-xl font-semibold text-primary">
                    {t("prelaunch.notice.title")}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {t("prelaunch.notice.subtitle")}
                  </p>
                  <div className="mt-4 inline-block rounded-lg bg-primary/10 px-4 py-2">
                    <span className="text-sm font-medium text-primary">
                      {t("prelaunch.notice.countdown")} {timeLeft}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-4">
              {/* LOCAL Plan */}
              <Card className="relative flex flex-col" data-testid="card-pricing-local">
                <CardHeader className="pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-3">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <CardTitle>{t("pricing.local.name")}</CardTitle>
                  <CardDescription>
                    {t("pricing.local.description")}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">€{getPrice("local")}</span>
                    <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
                    {billingCycle === "yearly" && (
                      <p className="text-xs text-muted-foreground mt-1">€{getYearlyTotal("local").toFixed(0)} {t("pricing.billedAnnually")}</p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400"><MapPin className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.local.features.location")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400"><Sparkles className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.local.features.unlimitedNewReplies")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400"><Reply className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.local.features.pastReplies")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400"><Settings className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.local.features.mode")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400"><BarChart3 className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.local.features.analytics")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400"><User className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.local.features.users")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400"><Palette className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.local.features.presets")}</span>
                    </li>
                  </ul>

                  <Button 
                    className="mt-8 w-full" 
                    variant="outline" 
                    onClick={handleComingSoon}
                    data-testid="button-choose-local"
                  >
                    {t("pricing.startFreeTrial")}
                  </Button>
                </CardContent>
              </Card>

              {/* PRO Plan */}
              <Card className="relative flex flex-col border-primary shadow-lg scale-[1.02]" data-testid="card-pricing-pro">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>{t("pricing.mostPopular")}</Badge>
                </div>

                <CardHeader className="pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Zap className="h-5 w-5" />
                  </div>
                  <CardTitle>{t("pricing.pro.name")}</CardTitle>
                  <CardDescription>
                    {t("pricing.pro.description")}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">€{getPrice("pro")}</span>
                    <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
                    {billingCycle === "yearly" && (
                      <p className="text-xs text-muted-foreground mt-1">€{getYearlyTotal("pro").toFixed(0)} {t("pricing.billedAnnually")}</p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><MapPin className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.locations")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><Sparkles className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.unlimitedNewReplies")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><Reply className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.pastReplies")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><BarChart3 className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.analytics")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><Zap className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.priority")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><Users className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.users")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><Palette className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.presets")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-primary"><Headphones className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.pro.features.support")}</span>
                    </li>
                  </ul>

                  <Button 
                    className="mt-8 w-full" 
                    onClick={handleComingSoon}
                    data-testid="button-choose-pro"
                  >
                    {t("pricing.startFreeTrial")}
                  </Button>
                </CardContent>
              </Card>

              {/* BUSINESS Plan */}
              <Card className="relative flex flex-col" data-testid="card-pricing-business">
                <CardHeader className="pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mb-3">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <CardTitle>{t("pricing.business.name")}</CardTitle>
                  <CardDescription>
                    {t("pricing.business.description")}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">€{getPrice("business")}</span>
                    <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
                    {billingCycle === "yearly" && (
                      <p className="text-xs text-muted-foreground mt-1">€{getYearlyTotal("business").toFixed(0)} {t("pricing.billedAnnually")}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{t("pricing.extraLocation")}</p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><MapPin className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.locationsIncluded")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><MapPin className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.extraLocation")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><LayoutDashboard className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.dashboard")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><Users className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.team")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><Shield className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.permissions")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><Headphones className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.sla")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><FileCheck className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.gdpr")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><UserCheck className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.onboarding")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-amber-600 dark:text-amber-400"><User className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.business.features.manager")}</span>
                    </li>
                  </ul>

                  <Button 
                    className="mt-8 w-full" 
                    variant="outline" 
                    onClick={handleComingSoon}
                    data-testid="button-choose-business"
                  >
                    {t("pricing.startFreeTrial")}
                  </Button>
                </CardContent>
              </Card>

              {/* ENTERPRISE Plan */}
              <Card className="relative flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" data-testid="card-pricing-enterprise">
                <CardHeader className="pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mb-3">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <CardTitle>{t("pricing.enterprise.name")}</CardTitle>
                  <CardDescription>
                    {t("pricing.enterprise.description")}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{t("pricing.custom")}</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><Settings className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.api")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><LayoutDashboard className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.crm")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><Zap className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.automations")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><FileCheck className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.auditLogs")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><BarChart3 className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.reporting")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><Shield className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.sla")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><User className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.accountManager")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400"><UserCheck className="h-4 w-4" /></span>
                      <span className="text-sm">{t("pricing.enterprise.features.onboarding")}</span>
                    </li>
                  </ul>

                  <Button className="mt-8 w-full" variant="outline" asChild data-testid="button-choose-enterprise">
                    <Link href="/contact">{t("pricing.contactUs")}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 py-2">
              <img
                src="/holarevi-dark.png"
                alt="HolaRevi Logo"
                className="h-10 w-auto block dark:hidden object-contain"
              />
              <img
                src="/holarevi-light.png"
                alt="HolaRevi Logo"
                className="h-10 w-auto hidden dark:block object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">
                {t("landing.footer.privacy")}
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-terms">
                {t("landing.footer.terms")}
              </Link>
              <Link href="/google-permissions" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-google-permissions">
                Google Permissions
              </Link>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-contact">
                {t("landing.footer.contact")}
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HolaRevi. {t("landing.footer.rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
