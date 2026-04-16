import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Crown,
  CreditCard,
  Loader2,
  ExternalLink,
  Zap,
  MapPin,
  Building2,
  Globe,
  Users,
  Palette,
  Download,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Receipt,
  MessageSquare,
  Check,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PLANS, type PlanId, type BillingCycle } from "@shared/plans";
import { useLanguage } from "@/lib/i18n";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

interface BillingOverview {
  subscription: {
    plan: string;
    planName: string;
    status: string;
    billingCycle: BillingCycle;
    currentPrice: number;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    startDate: string | null;
    stripeSubscriptionId: string | null;
    trialEndsAt: string | null;
  };
  usage: {
    locations: { used: number; limit: number | "unlimited"; percentage: number };
    teamMembers: { used: number; limit: number | "unlimited"; percentage: number };
    tonePresets: { used: number; limit: number | "unlimited"; percentage: number };
    monthlyReplies: { used: number; limit: number | "unlimited"; percentage: number; periodStart: string | null };
  };
  reviewStats: { totalReviews: number; pending: number; repliesGenerated: number; avgRating: number };
  invoices: Array<{ id: string; number: string; date: string; amount: number; currency: string; status: string; pdfUrl: string | null; hostedUrl: string | null }>;
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  features: Record<string, boolean>;
  extraLocations: number;
}

function UsageBar({ label, used, limit, icon }: { label: string; used: number; limit: number | "unlimited"; icon: React.ReactNode }) {
  const isUnlimited = limit === "unlimited";
  const pct = isUnlimited ? 0 : Math.min((used / (limit as number)) * 100, 100);
  const isNear = !isUnlimited && pct >= 80;
  const isAt = !isUnlimited && pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </div>
        <span className={cn("text-xs font-semibold tabular-nums", isAt ? "text-red-600" : isNear ? "text-amber-600" : "text-foreground")}>
          {used} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", isAt ? "bg-red-500" : isNear ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function Billing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState<BillingCycle>("monthly");
  const [selectingPlan, setSelectingPlan] = useState<PlanId | null>(null);

  const { data: billing, isLoading, refetch } = useQuery<BillingOverview>({ queryKey: ["/api/billing/overview"] });

  const portalMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/billing/portal")).json(),
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: () => toast({ title: t("billing.toasts.error"), description: t("billing.toasts.errorPortal"), variant: "destructive" }),
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle }) =>
      (await apiRequest("POST", "/api/checkout", { planId, billingCycle })).json(),
    onSuccess: (data) => {
      if (data.url) { window.location.href = data.url; }
      else if (data.upgraded) {
        toast({ title: t("billing.toasts.planUpdated"), description: t("billing.toasts.planUpdatedDesc").replace("{plan}", data.plan) });
        setShowUpgradeModal(false);
        queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
        queryClient.invalidateQueries({ queryKey: ["/api/plan-info"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
      setSelectingPlan(null);
    },
    onError: (error: any) => {
      toast({ title: t("billing.toasts.error"), description: error?.message?.includes("already") ? t("billing.toasts.alreadyOnPlan") : t("billing.toasts.planChangeError"), variant: "destructive" });
      setSelectingPlan(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/subscription/cancel")).json(),
    onSuccess: () => {
      toast({ title: t("billing.toasts.cancelSuccess"), description: t("billing.toasts.cancelSuccessDesc") });
      setShowCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
      refetch();
    },
    onError: () => toast({ title: t("billing.toasts.error"), description: t("billing.toasts.errorCancel"), variant: "destructive" }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/subscription/resume")).json(),
    onSuccess: () => {
      toast({ title: t("billing.toasts.resumeSuccess"), description: t("billing.toasts.resumeSuccessDesc") });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
      refetch();
    },
    onError: () => toast({ title: t("billing.toasts.error"), description: t("billing.toasts.errorResume"), variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/billing/sync")).json(),
    onSuccess: () => {
      toast({ title: t("billing.toasts.syncSuccess"), description: t("billing.toasts.syncSuccessDesc") });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
      refetch();
    },
    onError: () => toast({ title: t("billing.toasts.error"), description: t("billing.toasts.errorSync"), variant: "destructive" }),
  });

  const getTrialDaysLeft = () => {
    if (!sub?.trialEndsAt) return null;
    const diffMs = new Date(sub.trialEndsAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getStatusStyle = (status: string, canceling: boolean) => {
    if (canceling) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    switch (status) {
      case "active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "trialing": case "trial": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "past_due": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "canceled": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string, canceling: boolean) => {
    if (canceling) return t("billing.status.canceling");
    const key = `billing.status.${status}` as any;
    return t(key) || status;
  };

  const getPrice = (planId: PlanId, cycle: BillingCycle) =>
    cycle === "yearly" ? Math.round(PLANS[planId].price.yearly / 12) : PLANS[planId].price.monthly;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const sub = billing?.subscription;
  const usage = billing?.usage;
  const currentPlan = sub?.plan as PlanId | undefined;
  const planDetails = currentPlan ? PLANS[currentPlan] : null;
  const trialDaysLeft = getTrialDaysLeft();
  const isActive = sub?.status === "active" || sub?.status === "trialing" || sub?.status === "trial";

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <PageHeader
        title={t("billing.title")}
        subtitle={t("billing.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} data-testid="button-sync-billing">
            {syncMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            {t("billing.sync")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Subscription card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("billing.subscription")}</span>
            </div>
            {sub && (
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getStatusStyle(sub.status, sub.cancelAtPeriodEnd))} data-testid="badge-subscription-status">
                {getStatusLabel(sub.status, sub.cancelAtPeriodEnd)}
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div>
              <p className="text-xl font-bold text-foreground" data-testid="text-plan-name">
                {planDetails?.name || t("billing.noPlan")}
              </p>
              {planDetails && <p className="text-xs text-muted-foreground mt-0.5">{planDetails.description}</p>}
            </div>

            {isActive && (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground" data-testid="text-price">€{sub!.currentPrice}</span>
                  <span className="text-xs text-muted-foreground">/{t("billing.month")}</span>
                  {sub!.billingCycle === "yearly" && (
                    <span className="text-xs text-muted-foreground ml-1">({t("billing.yearly")})</span>
                  )}
                </div>

                {(sub!.status === "trialing" || sub!.status === "trial") && trialDaysLeft !== null && (
                  <div className={cn("px-3 py-2.5 rounded-lg text-xs", trialDaysLeft <= 2 ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900" : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900")} data-testid="trial-countdown">
                    <div className="flex items-center gap-1.5">
                      {trialDaysLeft <= 2 ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" /> : <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                      <p className={cn("font-medium leading-relaxed", trialDaysLeft <= 2 ? "text-amber-800 dark:text-amber-400" : "text-blue-800 dark:text-blue-400")}>
                        {trialDaysLeft <= 2
                          ? t("billing.trialWarning").replace("{days}", String(trialDaysLeft))
                          : t("billing.trialDaysLeft").replace("{days}", String(trialDaysLeft))}
                      </p>
                    </div>
                    {sub!.trialEndsAt && (
                      <p className={cn("text-[11px] mt-1 ml-5", trialDaysLeft <= 2 ? "text-amber-700 dark:text-amber-500" : "text-blue-700 dark:text-blue-500")}>
                        {t("billing.trialEnds")} {format(new Date(sub!.trialEndsAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}

                {sub!.status === "active" && sub!.currentPeriodEnd && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span data-testid="text-next-billing">
                      {sub!.cancelAtPeriodEnd ? t("billing.accessUntil") : t("billing.nextBilling")}: {format(new Date(sub!.currentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </>
            )}

            {billing?.paymentMethod && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 text-xs">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="capitalize text-muted-foreground" data-testid="text-card-brand">{billing.paymentMethod.brand}</span>
                <span className="text-muted-foreground">{t("billing.cardEnding")}</span>
                <span className="font-mono font-medium text-foreground" data-testid="text-card-last4">{billing.paymentMethod.last4}</span>
              </div>
            )}

            {sub?.cancelAtPeriodEnd && (
              <div className="px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">{t("billing.subscriptionEnding")}</p>
                    <p className="text-amber-700 dark:text-amber-500 mt-0.5">
                      {t("billing.subscriptionEndingDesc").replace("{date}", sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), "MMM d, yyyy") : "")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {isActive && !sub!.cancelAtPeriodEnd && (
                <>
                  <Button className="w-full h-8 text-xs" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending} data-testid="button-manage-subscription">
                    {portalMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CreditCard className="mr-1.5 h-3.5 w-3.5" />}
                    {t("billing.manageSubscription")}
                  </Button>
                  <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full h-7 text-xs text-muted-foreground" data-testid="button-cancel-subscription">
                        {t("billing.cancelSubscription")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("billing.cancelConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("billing.cancelConfirmDescription")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-dialog-cancel">{t("billing.cancelKeepButton")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-cancel">
                          {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t("billing.cancelConfirmButton")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {sub?.cancelAtPeriodEnd && (
                <Button className="w-full h-8 text-xs" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending} data-testid="button-resume-subscription">
                  {resumeMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  {t("billing.reactivateSubscription")}
                </Button>
              )}
              {(!sub?.stripeSubscriptionId || sub?.status === "pending") && (
                <Button className="w-full h-8 text-xs" onClick={() => setShowUpgradeModal(true)} data-testid="button-choose-plan">
                  <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                  {t("billing.choosePlan")}
                </Button>
              )}
              <Button variant="outline" className="w-full h-8 text-xs" onClick={() => setShowUpgradeModal(true)} data-testid="button-upgrade-plan">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                {t("billing.upgradePlan")}
              </Button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Usage */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t("billing.usageAndLimits")}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t("billing.usageDescription")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <UsageBar label={t("billing.locations")} used={usage?.locations.used || 0} limit={usage?.locations.limit || 1} icon={<MapPin className="h-3 w-3" />} />
              <UsageBar label={t("billing.monthlyReplies")} used={usage?.monthlyReplies.used || 0} limit={usage?.monthlyReplies.limit || 100} icon={<MessageSquare className="h-3 w-3" />} />
              <UsageBar label={t("billing.teamMembers")} used={usage?.teamMembers.used || 0} limit={usage?.teamMembers.limit || 1} icon={<Users className="h-3 w-3" />} />
              <UsageBar label={t("billing.tonePresets")} used={usage?.tonePresets.used || 0} limit={usage?.tonePresets.limit || 1} icon={<Palette className="h-3 w-3" />} />
            </div>
          </div>

          {/* Invoices */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t("billing.recentInvoices")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("billing.recentInvoicesDesc")}</p>
              </div>
              {billing?.invoices && billing.invoices.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => portalMutation.mutate()} data-testid="button-view-all-invoices">
                  <ExternalLink className="h-3 w-3" />
                  {t("billing.viewAllInvoices")}
                </Button>
              )}
            </div>

            {billing?.invoices && billing.invoices.length > 0 ? (
              <div className="divide-y divide-border">
                {billing.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between px-5 py-3" data-testid={`invoice-row-${invoice.id}`}>
                    <div className="flex items-center gap-3">
                      {invoice.status === "paid"
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-medium text-foreground">{invoice.number || invoice.id.slice(-8)}</p>
                        <p className="text-xs text-muted-foreground">{invoice.date && format(new Date(invoice.date), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground" data-testid={`text-invoice-amount-${invoice.id}`}>
                        {invoice.currency === "EUR" ? "€" : "$"}{invoice.amount.toFixed(2)}
                      </span>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", invoice.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                        {invoice.status}
                      </span>
                      {invoice.pdfUrl && (
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid={`button-download-invoice-${invoice.id}`}>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Receipt className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">{t("billing.noInvoicesYet")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("billing.noInvoicesDesc")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{t("billing.chooseYourPlan")}</DialogTitle>
            <DialogDescription>{t("billing.chooseYourPlanDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-3 py-3">
            <span className={cn("text-sm", upgradeBillingCycle === "monthly" ? "font-medium text-foreground" : "text-muted-foreground")}>{t("billing.monthly")}</span>
            <Switch
              checked={upgradeBillingCycle === "yearly"}
              onCheckedChange={(v) => setUpgradeBillingCycle(v ? "yearly" : "monthly")}
              data-testid="switch-billing-cycle"
            />
            <span className={cn("text-sm", upgradeBillingCycle === "yearly" ? "font-medium text-foreground" : "text-muted-foreground")}>
              {t("billing.yearly")}
              <span className="ml-1.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">{t("billing.save20")}</span>
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(["local", "pro", "business"] as PlanId[]).map((planId) => {
              const plan = PLANS[planId];
              const price = getPrice(planId, upgradeBillingCycle);
              const isCurrent = currentPlan === planId;
              const isSelecting = selectingPlan === planId;
              const icons = { local: <MapPin className="h-4 w-4" />, pro: <Zap className="h-4 w-4" />, business: <Building2 className="h-4 w-4" /> };
              const iconBgs = { local: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", pro: "bg-primary/10 text-primary", business: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" };

              return (
                <div key={planId} className={cn("rounded-xl border p-4 flex flex-col", planId === "pro" ? "border-primary shadow-sm ring-1 ring-primary/20" : "border-border")}>
                  {planId === "pro" && (
                    <div className="text-center mb-3">
                      <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{t("billing.mostPopular")}</span>
                    </div>
                  )}
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", iconBgs[planId])}>
                    {icons[planId]}
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{t(`plans.${planId}.name`)}</p>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t(`plans.${planId}.description`)}</p>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-foreground">€{price}</span>
                    <span className="text-xs text-muted-foreground">/{t("billing.month")}</span>
                  </div>
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {plan.features.slice(0, 4).map((_, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                        {t(`plans.${planId}.features.f${i + 1}`)}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full h-8 text-xs"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || checkoutMutation.isPending}
                    onClick={() => { setSelectingPlan(planId); checkoutMutation.mutate({ planId, billingCycle: upgradeBillingCycle }); }}
                    data-testid={`button-select-${planId}`}
                  >
                    {isSelecting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {isCurrent ? t("billing.currentPlan") : isSelecting ? t("billing.processing") : t("billing.selectPlan")}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">{t("billing.needCustom")}</p>
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <a href="mailto:hello@holarevi.com?subject=Enterprise%20Plan%20Inquiry">
                <Globe className="mr-1.5 h-3 w-3" />
                {t("billing.contactEnterprise")}
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
