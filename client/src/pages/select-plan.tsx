import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2, MapPin, Zap, Building2, Gift, Sparkles } from "lucide-react";
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

export default function SelectPlan() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
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
        window.location.href = data.redirectTo || "/contact";
      } else if (data.free) {
        window.location.href = `/${language}${data.redirectTo || "/"}`;
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message || t("common.checkoutError"), variant: "destructive" });
    },
  });

  const handlePlanSelect = (planId: PlanId) => {
    checkoutMutation.mutate({ planId, billingCycle });
  };

  const getPrice = (planId: PlanId) => formatPrice(getPlanMonthlyEquivalent(planId, billingCycle), language);

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

  const ctaLabel = (planId: PlanId) => {
    if (planId === "free") return t("common.freePlanCta");
    if (PLANS[planId].trialAllowed) return t("common.startTrial");
    return t("selectPlan.subscribe");
  };

  return (
    <div className="page-texture min-h-screen">
      <LandingHeader showLoginButton={false} />
      <div className="flex flex-col items-center justify-center p-6">
        <div className="max-w-6xl w-full space-y-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("selectPlan.banner")}
            </Badge>
            <h1 className="text-3xl font-bold" data-testid="text-select-plan-title">{t("selectPlan.title")}</h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">{t("selectPlan.subtitle")}</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Label htmlFor="billing-toggle">{t("selectPlan.monthly")}</Label>
            <Switch
              id="billing-toggle"
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
              data-testid="switch-billing-cycle"
            />
            <Label htmlFor="billing-toggle">{t("selectPlan.yearly")} <Badge variant="secondary">{t("common.save20")}</Badge></Label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((planId) => {
              const plan = PLANS[planId];
              const Icon = planIcons[planId];
              const isFree = planId === "free";
              return (
                <Card key={planId} className={`relative flex flex-col h-full ${plan.isPopular ? "border-primary border-2" : ""}`} data-testid={`card-plan-${planId}`}>
                  {plan.isPopular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t("selectPlan.mostPopular")}</Badge>}
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${planColors[planId]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="mt-4">{getPlanName(planId)}</CardTitle>
                    <CardDescription className="min-h-[40px]">{getPlanDescription(planId)}</CardDescription>
                    <div className="mt-4 flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-3xl font-bold" data-testid={`text-price-${planId}`}>{t("common.freePrice")}</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold" data-testid={`text-price-${planId}`}>€{getPrice(planId)}</span>
                          <span className="text-muted-foreground">{t("selectPlan.perMonth")}</span>
                        </>
                      )}
                    </div>
                    {isFree && <p className="mt-1 text-xs text-muted-foreground">{t("selectPlan.plans.free.note")}</p>}
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow">
                    <ul className="space-y-2 flex-grow">
                      {getPlanFeatures(planId).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full mt-6"
                      variant={plan.isPopular ? "default" : isFree ? "outline" : "default"}
                      onClick={() => handlePlanSelect(planId)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-select-${planId}`}
                    >
                      {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {ctaLabel(planId)}
                    </Button>
                    {plan.trialAllowed && (
                      <p className="text-xs text-muted-foreground text-center mt-3" data-testid={`text-trial-note-${planId}`}>
                        {t("common.trialNote14")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
