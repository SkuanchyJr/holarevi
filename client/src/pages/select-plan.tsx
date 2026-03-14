import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2, MapPin, Zap, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLANS, type PlanId, type BillingCycle } from "@shared/plans";
import { LandingHeader } from "@/components/landing-header";
import { useLanguage } from "@/lib/i18n";

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

export default function SelectPlan() {
  const { toast } = useToast();
  const { t } = useLanguage();
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
        window.location.href = data.redirectTo || "/contact";
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message || "Failed to start checkout", variant: "destructive" });
    },
  });

  const handlePlanSelect = (planId: PlanId) => {
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
    <div className="min-h-screen bg-background">
      <LandingHeader showLoginButton={false} />
      <div className="flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold" data-testid="text-select-plan-title">{t("selectPlan.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("selectPlan.subtitle")}</p>
          </div>
        
        <div className="flex items-center justify-center gap-3">
          <Label htmlFor="billing-toggle">{t("selectPlan.monthly")}</Label>
          <Switch
            id="billing-toggle"
            checked={billingCycle === "yearly"}
            onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
            data-testid="switch-billing-cycle"
          />
          <Label htmlFor="billing-toggle">{t("selectPlan.yearly")} <Badge variant="secondary">{t("selectPlan.save20")}</Badge></Label>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((planId) => {
            const plan = PLANS[planId];
            const Icon = planIcons[planId];
            return (
              <Card key={planId} className={`relative ${plan.isPopular ? "border-primary border-2" : ""}`} data-testid={`card-plan-${planId}`}>
                {plan.isPopular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t("selectPlan.mostPopular")}</Badge>}
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${planColors[planId]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="mt-4">{getPlanName(planId)}</CardTitle>
                  <CardDescription>{getPlanDescription(planId)}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold" data-testid={`text-price-${planId}`}>€{getPrice(planId)}</span>
                    <span className="text-muted-foreground">{t("selectPlan.perMonth")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {getPlanFeatures(planId).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    onClick={() => handlePlanSelect(planId)}
                    disabled={checkoutMutation.isPending}
                    data-testid={`button-select-${planId}`}
                  >
                    {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {planId === "local" ? t("selectPlan.tryFree") : t("selectPlan.subscribe")}
                  </Button>
                  {planId === "local" && (
                    <p className="text-xs text-muted-foreground text-center mt-3" data-testid="text-trial-note-local">
                      {t("selectPlan.trialNote")}
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
