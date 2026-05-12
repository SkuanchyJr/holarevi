import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Check,
  Loader2,
  MapPin,
  Zap,
  Building2,
  Gift,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Unlock,
  Headphones,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PLANS,
  formatPrice,
  getPlanMonthlyEquivalent,
  type PlanId,
  type BillingCycle,
} from "@shared/plans";
import { LandingHeader } from "@/components/landing-header";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";

const planIcons: Record<string, typeof MapPin> = {
  free: Gift,
  local: MapPin,
  pro: Zap,
  business: Building2,
};

const planColors: Record<string, string> = {
  free: "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800",
  local: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950",
  pro: "text-primary bg-primary/10",
  business: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950",
};

export default function Pricing() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle }) => {
      const response = await apiRequest("POST", "/api/checkout", {
        planId,
        billingCycle,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || t("common.checkoutError"));
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.enterprise) {
        window.location.href = data.redirectTo || `/${language}/contact`;
      } else if (data.free) {
        window.location.href = `/${language}${data.redirectTo || "/"}`;
      } else if (data.url) {
        window.location.href = data.url;
      } else if (data.upgraded) {
        toast({ title: data.message || t("common.success") });
        window.location.href = `/${language}/billing`;
      }
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message || t("common.checkoutError"), variant: "destructive" });
    },
  });

  const handlePlanSelect = (planId: PlanId) => {
    if (!isAuthenticated) {
      setLocation(`/${language}/auth?plan=${planId}&cycle=${billingCycle}`);
      return;
    }
    checkoutMutation.mutate({ planId, billingCycle });
  };

  const getPrice = (planId: PlanId) => formatPrice(getPlanMonthlyEquivalent(planId, billingCycle), language);
  const getYearlyTotal = (planId: PlanId) => formatPrice(PLANS[planId].price.yearly, language);

  const plans = ["free", "local", "pro", "business"] as PlanId[];

  const getPlanName = (planId: PlanId) => t(`selectPlan.plans.${planId}.name`);
  const getPlanDescription = (planId: PlanId) => t(`selectPlan.plans.${planId}.description`);

  const featureKeys: Record<PlanId, string[]> = {
    free: ["location", "dashboard", "sentiment", "summary", "weeklyEmail"],
    local: ["location", "newReplies", "pastReplies", "mode", "users", "alerts"],
    pro: ["locations", "newReplies", "dashboard", "users", "controls", "priority"],
    business: ["locations", "newReplies", "dashboard", "team", "channels", "sla"],
    enterprise: ["api", "crm", "automations", "auditLogs", "reporting", "sla"],
  };
  const getPlanFeatures = (planId: PlanId): string[] =>
    featureKeys[planId].map((key) => t(`selectPlan.plans.${planId}.features.${key}`));

  const trustItems = [
    { icon: <Unlock className="h-4 w-4" />, label: t("common.noCommitment") },
    { icon: <RotateCcw className="h-4 w-4" />, label: t("common.cancelAnytime") },
    { icon: <ShieldCheck className="h-4 w-4" />, label: t("common.securePayment") },
    { icon: <Zap className="h-4 w-4" />, label: t("common.instantSetup") },
    { icon: <Headphones className="h-4 w-4" />, label: t("common.humanSupport") },
  ];

  const ctaLabel = (planId: PlanId) => {
    if (planId === "free") return t("common.freePlanCta");
    if (PLANS[planId].trialAllowed) return t("common.startTrial");
    return t("common.subscribeNow");
  };

  return (
    <div className="page-texture min-h-screen pb-12">
      <LandingHeader hidePromoBar />

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16 pb-10 text-center">
        <Badge variant="secondary" className="mb-4 gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {t("pricing.hero.badge")}
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" data-testid="text-pricing-title">
          {t("pricing.hero.title")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-subtitle">
          {t("pricing.hero.subtitle")}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-4">
        <div className="max-w-6xl w-full space-y-10">
          <div className="flex items-center justify-center gap-3">
            <Label htmlFor="billing-toggle">{t("common.monthly")}</Label>
            <Switch
              id="billing-toggle"
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
              data-testid="switch-billing-cycle"
            />
            <Label htmlFor="billing-toggle">
              {t("common.yearly")} <Badge variant="secondary" className="ml-1">{t("common.save20")}</Badge>
            </Label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-2">
            {plans.map((planId) => {
              const plan = PLANS[planId];
              const Icon = planIcons[planId];
              const isFree = planId === "free";
              return (
                <Card
                  key={planId}
                  className={`relative flex flex-col h-full ${plan.isPopular ? "border-primary border-2 shadow-lg lg:scale-105 lg:z-10" : "border-border shadow-sm hover:shadow-md transition-shadow"}`}
                  data-testid={`card-plan-${planId}`}
                >
                  {plan.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1" data-testid="badge-most-popular">
                      {t("common.mostPopular")}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${planColors[planId]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold mt-4">{getPlanName(planId)}</CardTitle>
                    <CardDescription className="min-h-[40px]">{getPlanDescription(planId)}</CardDescription>
                    <div className="mt-5 flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-4xl font-bold" data-testid={`text-price-${planId}`}>{t("common.freePrice")}</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold" data-testid={`text-price-${planId}`}>€{getPrice(planId)}</span>
                          <span className="text-muted-foreground">{t("common.perMonth")}</span>
                        </>
                      )}
                    </div>
                    {!isFree && billingCycle === "yearly" && plan.hasYearly && (
                      <p className="text-xs text-muted-foreground mt-1">
                        €{getYearlyTotal(planId)} {t("common.billedAnnually")}
                      </p>
                    )}
                    {isFree && (
                      <p className="mt-1 text-xs text-muted-foreground">{t("selectPlan.plans.free.note")}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3.5 my-6">
                      {getPlanFeatures(planId).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <Check className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-foreground/90 leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto">
                    <Button
                      variant={plan.isPopular ? "default" : "outline"}
                      className="w-full py-6 text-base font-semibold transition-all group"
                      onClick={() => handlePlanSelect(planId)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-select-${planId}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-5 w-5 mr-0 opacity-0 -ml-5 group-hover:opacity-100 group-hover:mr-2 transition-all" />
                      )}
                      {ctaLabel(planId)}
                    </Button>
                    {plan.trialAllowed && (
                      <p className="text-xs text-muted-foreground text-center mt-4">
                        {t("common.trialNote14")}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
            {trustItems.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2">
                <span className="text-primary">{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>

          <div className="text-center pt-8">
            <p className="text-muted-foreground">{t("pricing.footer.questions")}</p>
            <Button variant="link" asChild className="mt-2">
              <Link href={`/${language}/contact`}>{t("common.contact")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
