import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2, MapPin, Zap, Building2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLANS, type PlanId, type BillingCycle } from "@shared/plans";
import { LandingHeader } from "@/components/landing-header";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";

const planIcons: Record<string, typeof MapPin> = {
  local: MapPin,
  pro: Zap,
  business: Building2,
};

const planColors: Record<string, string> = {
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
        billingCycle
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to start checkout");
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.enterprise) {
        window.location.href = data.redirectTo || `/${language}/contact`;
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message || "Failed to start checkout", variant: "destructive" });
    },
  });

  const handlePlanSelect = (planId: PlanId) => {
    if (!isAuthenticated) {
      setLocation(`/${language}/auth?plan=${planId}&cycle=${billingCycle}`);
      return;
    }
    checkoutMutation.mutate({ planId, billingCycle });
  };

  const getPrice = (planId: PlanId) => {
    const plan = PLANS[planId];
    if (billingCycle === "yearly") {
      return Math.round((plan.price.yearly / 12) * 100) / 100;
    }
    return plan.price.monthly;
  };

  const plans = ["local", "pro", "business"] as PlanId[];

  const getPlanName = (planId: PlanId) => {
    return t(`selectPlan.plans.${planId}.name`);
  };

  const getPlanDescription = (planId: PlanId) => {
    return t(`selectPlan.plans.${planId}.description`);
  };

  const getPlanFeatures = (planId: PlanId): string[] => {
    const featureKeys: Record<PlanId, string[]> = {
      local: ["location", "newReplies", "pastReplies", "mode", "analytics", "users"],
      pro: ["locations", "newReplies", "pastReplies", "analytics", "priority", "users"],
      business: ["locationsIncluded", "extraLocation", "dashboard", "team", "permissions", "sla"],
      enterprise: ["api", "crm", "automations", "auditLogs", "reporting", "sla"],
    };
    return featureKeys[planId].map(key => t(`selectPlan.plans.${planId}.features.${key}`));
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <LandingHeader />
      
      {/* Hero Section */}
      <div className="py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" data-testid="text-pricing-title">
          {t("pricing.hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-subtitle">
          {t("pricing.hero.subtitle")}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-6">
        <div className="max-w-6xl w-full space-y-12">
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

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((planId) => {
              const plan = PLANS[planId];
              const Icon = planIcons[planId];
              return (
                <Card 
                    key={planId} 
                    className={`relative flex flex-col h-full ${plan.isPopular ? "border-primary border-2 shadow-lg scale-105 z-10" : "border-border shadow-sm hover:shadow-md transition-shadow"}`}
                    data-testid={`card-plan-${planId}`}
                >
                  {plan.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1" data-testid="badge-most-popular">
                        {t("common.mostPopular")}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${planColors[planId]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{getPlanName(planId)}</CardTitle>
                    <CardDescription className="min-h-[40px]">{getPlanDescription(planId)}</CardDescription>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-bold" data-testid={`text-price-${planId}`}>€{getPrice(planId)}</span>
                      <span className="text-muted-foreground">{t("common.perMonth")}</span>
                    </div>
                    {billingCycle === "yearly" && (
                        <p className="text-xs text-primary font-medium mt-1">
                            {t("common.billedAnnually")}
                        </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-4 my-6">
                      {getPlanFeatures(planId).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <Check className="h-5 w-5 text-primary shrink-0 transition-transform hover:scale-110" />
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
                      {isAuthenticated ? (planId === "local" ? t("common.start3DayTrial") : t("common.subscribe")) : t("nav.getStarted")}
                    </Button>
                    {planId === "local" && (
                      <p className="text-xs text-muted-foreground text-center mt-4 italic">
                        {t("common.startFreeTrial")} · {t("common.trialLimitedReplies")}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center pt-12">
            <p className="text-muted-foreground">
                {t("pricing.footer.questions")}
            </p>
            <Button variant="link" asChild className="mt-2">
                <Link href={`/${language}/contact`}>{t("common.contact")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
