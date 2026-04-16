import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MapPin, Zap, Building2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLANS, type PlanId, type BillingCycle } from "@shared/plans";
import { Link } from "wouter";
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

export default function Paywall() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [billingCycle] = useState<BillingCycle>("monthly");

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle }) => {
      const response = await apiRequest("POST", "/api/checkout", { 
        planId, 
        billingCycle
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || t("common.checkoutError"));
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handlePlanSelect = (planId: PlanId) => {
    const effectiveCycle = getEffectiveBillingCycle(planId);
    checkoutMutation.mutate({ planId, billingCycle: effectiveCycle });
  };

  const getDisplayPrice = (planId: PlanId) => {
    const plan = PLANS[planId];
    if (billingCycle === "yearly" && plan.hasYearly) {
      return Math.round((plan.price.yearly / 12) * 100) / 100;
    }
    return plan.price.monthly;
  };
  
  const getEffectiveBillingCycle = (planId: PlanId): BillingCycle => {
    const plan = PLANS[planId];
    if (billingCycle === "yearly" && !plan.hasYearly) {
      return "monthly";
    }
    return billingCycle;
  };

  const plans = ["local", "pro", "business"] as PlanId[];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-paywall-title">{t("paywall.title")}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t("paywall.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((planId) => {
            const plan = PLANS[planId];
            const Icon = planIcons[planId];
            return (
              <Card key={planId} className={`relative ${plan.isPopular ? "border-primary border-2" : ""}`} data-testid={`card-plan-${planId}`}>
                {plan.isPopular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t("common.mostPopular")}</Badge>}
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${planColors[planId]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="mt-4">{t(`plans.${planId}.name`)}</CardTitle>
                  <CardDescription>{t(`plans.${planId}.description`)}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold" data-testid={`text-price-${planId}`}>€{getDisplayPrice(planId)}</span>
                    <span className="text-muted-foreground">{t("paywall.perMonth")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.slice(0, 6).map((_, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {t(`plans.${planId}.features.f${i + 1}`)}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    onClick={() => handlePlanSelect(planId)}
                    disabled={checkoutMutation.isPending}
                    data-testid={`button-upgrade-${planId}`}
                  >
                    {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("paywall.subscribe")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Link href="/billing">
            <Button variant="ghost" data-testid="link-manage-billing">
              {t("paywall.manageBilling")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
