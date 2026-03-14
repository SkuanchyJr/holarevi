import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  CreditCard,
  Loader2,
  Shield,
  Sparkles,
  MapPin,
  Zap,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { PLANS, type PlanId, type BillingCycle } from "@shared/plans";

const planIcons: Record<PlanId, typeof MapPin> = {
  local: MapPin,
  pro: Zap,
  business: Building2,
  enterprise: Building2,
};

const planColors: Record<string, string> = {
  local: "border-emerald-200 dark:border-emerald-800",
  pro: "border-primary",
  business: "border-amber-200 dark:border-amber-800",
};

export default function Onboarding() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("local");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const urlParams = new URLSearchParams(window.location.search);
  const canceled = urlParams.get("canceled") === "true";

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle }) => {
      const response = await apiRequest("POST", "/api/checkout", { planId, billingCycle });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.enterprise) {
        navigate("/contact");
      } else if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo iniciar el proceso de pago. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = () => {
    checkoutMutation.mutate({ planId: selectedPlan, billingCycle });
  };

  const getDisplayPrice = (planId: PlanId): { price: number; period: string } => {
    const plan = PLANS[planId];
    if (plan.isCustomPricing) {
      return { price: 0, period: "" };
    }
    
    if (billingCycle === "yearly") {
      const yearlyPrice = plan.price.yearly;
      const monthlyEquivalent = Math.round((yearlyPrice / 12) * 100) / 100;
      return { price: monthlyEquivalent, period: "/mes" };
    }
    
    return { price: plan.price.monthly, period: "/mes" };
  };

  const availablePlans: PlanId[] = ["local", "pro", "business"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Bienvenido a HolaRevi</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Elige tu plan y empieza a responder reseñas de Google con IA.
          </p>
        </div>

        {canceled && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <p className="text-center text-amber-700 dark:text-amber-400">
                El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-center gap-4">
          <span className={billingCycle === "monthly" ? "font-medium" : "text-muted-foreground"}>
            Mensual
          </span>
          <Switch
            checked={billingCycle === "yearly"}
            onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
            data-testid="switch-billing-cycle"
          />
          <span className={billingCycle === "yearly" ? "font-medium" : "text-muted-foreground"}>
            Anual
          </span>
          {billingCycle === "yearly" && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
              Ahorra 20%
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {availablePlans.map((planId) => {
            const plan = PLANS[planId];
            const Icon = planIcons[planId];
            const { price, period } = getDisplayPrice(planId);
            const isSelected = selectedPlan === planId;

            return (
              <Card
                key={planId}
                className={`cursor-pointer transition-all hover-elevate ${
                  isSelected 
                    ? `ring-2 ring-primary ${planColors[planId]}` 
                    : "border-border"
                }`}
                onClick={() => setSelectedPlan(planId)}
                data-testid={`card-plan-${planId}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">€{price}</span>
                    <span className="text-muted-foreground">{period}</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      {typeof plan.limits.maxLocations === "string" && plan.limits.maxLocations === "unlimited" 
                        ? "Ubicaciones ilimitadas" 
                        : `${plan.limits.maxLocations} ${Number(plan.limits.maxLocations) === 1 ? "ubicación" : "ubicaciones"}`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      {plan.limits.maxRepliesPerMonth === "unlimited"
                        ? "Respuestas ilimitadas"
                        : `${plan.limits.maxRepliesPerMonth} respuestas/mes`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      {plan.limits.maxTeamMembers === "unlimited"
                        ? "Usuarios ilimitados"
                        : `${plan.limits.maxTeamMembers} ${Number(plan.limits.maxTeamMembers) === 1 ? "usuario" : "usuarios"}`}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-4 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Pago seguro con Stripe</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Suscríbete al plan {PLANS[selectedPlan].name}
                  </p>
                  <p className="text-muted-foreground">
                    Puedes cancelar en cualquier momento.
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className="min-w-[200px]"
                onClick={handleSubscribe}
                disabled={checkoutMutation.isPending}
                data-testid="button-subscribe"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Suscribirse
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Al continuar, aceptas nuestros{" "}
          <a href="/terms" className="underline hover:text-foreground">
            Términos de Servicio
          </a>{" "}
          y{" "}
          <a href="/privacy" className="underline hover:text-foreground">
            Política de Privacidad
          </a>
          .
        </p>
      </div>
    </div>
  );
}
