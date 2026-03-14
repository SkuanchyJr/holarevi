import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  XCircle,
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
  TrendingUp,
  MessageSquare,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PLANS, type PlanId, type BillingCycle } from "@shared/plans";
import { useLanguage } from "@/lib/i18n";
import { format } from "date-fns";

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
  reviewStats: {
    totalReviews: number;
    pending: number;
    repliesGenerated: number;
    avgRating: number;
  };
  invoices: Array<{
    id: string;
    number: string;
    date: string;
    amount: number;
    currency: string;
    status: string;
    pdfUrl: string | null;
    hostedUrl: string | null;
  }>;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  features: Record<string, boolean>;
  extraLocations: number;
}

export default function Billing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState<BillingCycle>("monthly");
  const [selectingPlan, setSelectingPlan] = useState<PlanId | null>(null);

  const {
    data: billing,
    isLoading,
    refetch,
  } = useQuery<BillingOverview>({
    queryKey: ["/api/billing/overview"],
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: () => {
      toast({
        title: t("billing.toasts.error"),
        description: t("billing.toasts.errorPortal"),
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle }) => {
      const res = await apiRequest("POST", "/api/checkout", { planId, billingCycle });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else if (data.upgraded) {
        toast({
          title: t("billing.toasts.planUpdated"),
          description: t("billing.toasts.planUpdatedDesc").replace("{plan}", data.plan),
        });
        setShowUpgradeModal(false);
        queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
        queryClient.invalidateQueries({ queryKey: ["/api/plan-info"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
      setSelectingPlan(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "";
      toast({
        title: t("billing.toasts.error"),
        description: errorMessage.includes("Ya tienes") || errorMessage.includes("already have")
          ? t("billing.toasts.alreadyOnPlan")
          : t("billing.toasts.planChangeError"),
        variant: "destructive",
      });
      setSelectingPlan(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/cancel");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("billing.toasts.cancelSuccess"),
        description: t("billing.toasts.cancelSuccessDesc"),
      });
      setShowCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
      refetch();
    },
    onError: () => {
      toast({
        title: t("billing.toasts.error"),
        description: t("billing.toasts.errorCancel"),
        variant: "destructive",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/resume");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("billing.toasts.resumeSuccess"),
        description: t("billing.toasts.resumeSuccessDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
      refetch();
    },
    onError: () => {
      toast({
        title: t("billing.toasts.error"),
        description: t("billing.toasts.errorResume"),
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/sync");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("billing.toasts.syncSuccess"),
        description: t("billing.toasts.syncSuccessDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/overview"] });
      refetch();
    },
    onError: () => {
      toast({
        title: t("billing.toasts.error"),
        description: t("billing.toasts.errorSync"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive" data-testid="badge-subscription-status">{t("billing.status.canceling")}</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400" data-testid="badge-subscription-status">{t("billing.status.active")}</Badge>;
      case "trialing":
      case "trial":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400" data-testid="badge-subscription-status">{t("billing.status.trialing")}</Badge>;
      case "past_due":
        return <Badge variant="destructive" data-testid="badge-subscription-status">{t("billing.status.pastDue")}</Badge>;
      case "canceled":
        return <Badge variant="secondary" data-testid="badge-subscription-status">{t("billing.status.canceled")}</Badge>;
      case "pending":
        return <Badge variant="outline" data-testid="badge-subscription-status">{t("billing.status.noSubscription")}</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-subscription-status">{status}</Badge>;
    }
  };

  const getTrialDaysLeft = () => {
    if (!sub?.trialEndsAt) return null;
    const trialEnd = new Date(sub.trialEndsAt);
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "open":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "uncollectible":
      case "void":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPrice = (planId: PlanId, cycle: BillingCycle) => {
    const plan = PLANS[planId];
    if (cycle === "yearly") {
      return Math.round(plan.price.yearly / 12);
    }
    return plan.price.monthly;
  };

  const getYearlyTotal = (planId: PlanId) => {
    return PLANS[planId].price.yearly;
  };

  const handleSelectPlan = (planId: PlanId) => {
    if (checkoutMutation.isPending) return;
    setSelectingPlan(planId);
    checkoutMutation.mutate({ planId, billingCycle: upgradeBillingCycle });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const sub = billing?.subscription;
  const usage = billing?.usage;
  const currentPlan = sub?.plan as PlanId | undefined;
  const planDetails = currentPlan ? PLANS[currentPlan] : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">{t("billing.title")}</h1>
          <p className="text-muted-foreground">{t("billing.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-billing"
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t("billing.sync")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:row-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                {t("billing.subscription")}
              </CardTitle>
              {sub && getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {currentPlan === "local" && <MapPin className="h-5 w-5 text-emerald-500" />}
                {currentPlan === "pro" && <Zap className="h-5 w-5 text-primary" />}
                {currentPlan === "business" && <Building2 className="h-5 w-5 text-amber-500" />}
                <span className="text-2xl font-bold" data-testid="text-plan-name">
                  {planDetails?.name || t("billing.noPlan")}
                </span>
              </div>
              {planDetails && (
                <p className="text-muted-foreground text-sm">{planDetails.description}</p>
              )}
            </div>

            {(sub?.status === "active" || sub?.status === "trialing" || sub?.status === "trial") && (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" data-testid="text-price">
                    {"\u20AC"}{sub.currentPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{sub.billingCycle === "yearly" ? `${t("billing.month")} (${t("billing.yearly")})` : t("billing.month")}
                  </span>
                </div>

                {(sub.status === "trialing" || sub.status === "trial") && (() => {
                  const daysLeft = getTrialDaysLeft();
                  if (daysLeft === null) return null;
                  const isWarning = daysLeft !== null && daysLeft <= 2;
                  return (
                    <div className={`p-3 rounded-lg border ${isWarning ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"}`} data-testid="trial-countdown">
                      <div className="flex items-start gap-2">
                        {isWarning ? <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" /> : <Clock className="h-4 w-4 text-blue-600 mt-0.5" />}
                        <div className="text-sm">
                          <p className={`font-medium ${isWarning ? "text-yellow-800 dark:text-yellow-400" : "text-blue-800 dark:text-blue-400"}`}>
                            {isWarning
                              ? t("billing.trialWarning").replace("{days}", String(daysLeft))
                              : t("billing.trialDaysLeft").replace("{days}", String(daysLeft))}
                          </p>
                          {sub.trialEndsAt && (
                            <p className={`text-xs mt-1 ${isWarning ? "text-yellow-700 dark:text-yellow-500" : "text-blue-700 dark:text-blue-500"}`}>
                              {t("billing.trialEnds")} {format(new Date(sub.trialEndsAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {sub.status === "active" && sub.currentPeriodEnd && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span data-testid="text-next-billing">
                      {sub.cancelAtPeriodEnd ? t("billing.accessUntil") : t("billing.nextBilling")}: {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </>
            )}

            {billing?.paymentMethod && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm">
                  <span className="capitalize" data-testid="text-card-brand">{billing.paymentMethod.brand}</span>
                  <span className="text-muted-foreground"> {t("billing.endingIn")} </span>
                  <span className="font-mono" data-testid="text-card-last4">{billing.paymentMethod.last4}</span>
                </div>
              </div>
            )}

            {sub?.cancelAtPeriodEnd && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-400">{t("billing.subscriptionEnding")}</p>
                    <p className="text-yellow-700 dark:text-yellow-500 text-xs mt-1">
                      {t("billing.subscriptionEndingDesc").replace("{date}", sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), "MMM d, yyyy") : "")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {(sub?.status === "active" || sub?.status === "trialing" || sub?.status === "trial") && !sub.cancelAtPeriodEnd && (
              <>
                <Button
                  className="w-full"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  data-testid="button-manage-subscription"
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {t("billing.manageSubscription")}
                </Button>
                <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full text-muted-foreground" data-testid="button-cancel-subscription">
                      {t("billing.cancelSubscription")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("billing.cancelConfirmTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("billing.cancelConfirmDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-dialog-cancel">{t("billing.cancelKeepButton")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-cancel"
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {t("billing.cancelConfirmButton")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {sub?.cancelAtPeriodEnd && (
              <Button
                className="w-full"
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                data-testid="button-resume-subscription"
              >
                {resumeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t("billing.reactivateSubscription")}
              </Button>
            )}
            {(!sub?.stripeSubscriptionId || sub?.status === "pending") && (
              <Button
                className="w-full"
                onClick={() => setShowUpgradeModal(true)}
                data-testid="button-choose-plan"
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                {t("billing.choosePlan")}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("billing.usageAndLimits")}
            </CardTitle>
            <CardDescription>
              {t("billing.usageDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <UsageItem
                icon={<MapPin className="h-4 w-4" />}
                label={t("billing.locations")}
                used={usage?.locations.used || 0}
                limit={usage?.locations.limit || 1}
                percentage={usage?.locations.percentage || 0}
                t={t}
              />
              <UsageItem
                icon={<MessageSquare className="h-4 w-4" />}
                label={t("billing.monthlyReplies")}
                used={usage?.monthlyReplies.used || 0}
                limit={usage?.monthlyReplies.limit || 50}
                percentage={usage?.monthlyReplies.percentage || 0}
                t={t}
              />
              <UsageItem
                icon={<Users className="h-4 w-4" />}
                label={t("billing.teamMembers")}
                used={usage?.teamMembers.used || 0}
                limit={usage?.teamMembers.limit || 1}
                percentage={usage?.teamMembers.percentage || 0}
                t={t}
              />
              <UsageItem
                icon={<Palette className="h-4 w-4" />}
                label={t("billing.tonePresets")}
                used={usage?.tonePresets.used || 0}
                limit={usage?.tonePresets.limit || 1}
                percentage={usage?.tonePresets.percentage || 0}
                t={t}
              />
            </div>

            {currentPlan && currentPlan !== "business" && (
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-medium">{t("billing.needMore")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("billing.needMoreDesc")}
                    </p>
                  </div>
                  <Button onClick={() => setShowUpgradeModal(true)} data-testid="button-upgrade-plan">
                    <Zap className="h-4 w-4 mr-2" />
                    {t("billing.upgradePlan")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              {t("billing.recentInvoices")}
            </CardTitle>
            <CardDescription>
              {t("billing.recentInvoicesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billing?.invoices && billing.invoices.length > 0 ? (
              <div className="space-y-3">
                {billing.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    data-testid={`invoice-row-${invoice.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {getInvoiceStatusIcon(invoice.status)}
                      <div>
                        <p className="font-medium text-sm">
                          {invoice.number || invoice.id.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.date && format(new Date(invoice.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium" data-testid={`text-invoice-amount-${invoice.id}`}>
                        {invoice.currency === "EUR" ? "\u20AC" : "$"}{invoice.amount.toFixed(2)}
                      </span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {invoice.status}
                      </Badge>
                      {invoice.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          data-testid={`button-download-invoice-${invoice.id}`}
                        >
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{t("billing.noInvoicesYet")}</p>
                <p className="text-sm">{t("billing.noInvoicesDesc")}</p>
              </div>
            )}
          </CardContent>
          {billing?.invoices && billing.invoices.length > 0 && (
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-view-all-invoices"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("billing.viewAllInvoices")}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t("billing.planComparison")}
          </CardTitle>
          <CardDescription>
            {t("billing.planComparisonDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              variant={currentPlan === "local" ? "default" : "outline"}
              onClick={() => setShowUpgradeModal(true)}
              data-testid="button-view-local-plan"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Local - {"\u20AC"}49/{t("billing.month")}
            </Button>
            <Button
              variant={currentPlan === "pro" ? "default" : "outline"}
              onClick={() => setShowUpgradeModal(true)}
              data-testid="button-view-pro-plan"
            >
              <Zap className="h-4 w-4 mr-2" />
              Pro - {"\u20AC"}99/{t("billing.month")}
            </Button>
            <Button
              variant={currentPlan === "business" ? "default" : "outline"}
              onClick={() => setShowUpgradeModal(true)}
              data-testid="button-view-business-plan"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Business - {"\u20AC"}199/{t("billing.month")}
            </Button>
            <Button
              variant="outline"
              asChild
              data-testid="button-view-enterprise-plan"
            >
              <a href="mailto:hello@holarevi.com?subject=Enterprise%20Plan%20Inquiry">
                <Globe className="h-4 w-4 mr-2" />
                {t("billing.enterprise")} - {t("billing.custom")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t("billing.chooseYourPlan")}</DialogTitle>
            <DialogDescription>
              {t("billing.chooseYourPlanDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-3 py-4">
            <span className={upgradeBillingCycle === "monthly" ? "font-medium" : "text-muted-foreground"}>
              {t("billing.monthly")}
            </span>
            <Switch
              checked={upgradeBillingCycle === "yearly"}
              onCheckedChange={(v) => setUpgradeBillingCycle(v ? "yearly" : "monthly")}
              data-testid="switch-billing-cycle"
            />
            <span className={upgradeBillingCycle === "yearly" ? "font-medium" : "text-muted-foreground"}>
              {t("billing.yearly")}
              <Badge className="ml-2">{t("billing.save20")}</Badge>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <PlanCard
              plan="local"
              icon={<MapPin className="h-5 w-5" />}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-100 dark:bg-emerald-950"
              name={PLANS.local.name}
              description={PLANS.local.description}
              price={getPrice("local", upgradeBillingCycle)}
              yearlyTotal={getYearlyTotal("local")}
              billingCycle={upgradeBillingCycle}
              features={PLANS.local.features}
              limits={PLANS.local.limits}
              isCurrentPlan={currentPlan === "local"}
              onSelect={() => handleSelectPlan("local")}
              isSelecting={selectingPlan === "local"}
              isAnyLoading={checkoutMutation.isPending}
              t={t}
            />
            <PlanCard
              plan="pro"
              icon={<Zap className="h-5 w-5" />}
              iconColor="text-primary"
              iconBg="bg-primary/10"
              name={PLANS.pro.name}
              description={PLANS.pro.description}
              price={getPrice("pro", upgradeBillingCycle)}
              yearlyTotal={getYearlyTotal("pro")}
              billingCycle={upgradeBillingCycle}
              features={PLANS.pro.features}
              limits={PLANS.pro.limits}
              isCurrentPlan={currentPlan === "pro"}
              isPopular
              onSelect={() => handleSelectPlan("pro")}
              isSelecting={selectingPlan === "pro"}
              isAnyLoading={checkoutMutation.isPending}
              t={t}
            />
            <PlanCard
              plan="business"
              icon={<Building2 className="h-5 w-5" />}
              iconColor="text-amber-500"
              iconBg="bg-amber-100 dark:bg-amber-950"
              name={PLANS.business.name}
              description={PLANS.business.description}
              price={getPrice("business", upgradeBillingCycle)}
              yearlyTotal={getYearlyTotal("business")}
              billingCycle={upgradeBillingCycle}
              features={PLANS.business.features}
              limits={PLANS.business.limits}
              isCurrentPlan={currentPlan === "business"}
              extraLocationPrice={PLANS.business.extraLocationPrice}
              onSelect={() => handleSelectPlan("business")}
              isSelecting={selectingPlan === "business"}
              isAnyLoading={checkoutMutation.isPending}
              t={t}
            />
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              {t("billing.needCustom")}
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:hello@holarevi.com?subject=Enterprise%20Plan%20Inquiry">
                <Globe className="h-4 w-4 mr-2" />
                {t("billing.contactEnterprise")}
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanCard({
  plan,
  icon,
  iconColor,
  iconBg,
  name,
  description,
  price,
  yearlyTotal,
  billingCycle,
  features,
  limits,
  isCurrentPlan,
  isPopular,
  extraLocationPrice,
  onSelect,
  isSelecting,
  isAnyLoading,
  t,
}: {
  plan: PlanId;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  name: string;
  description: string;
  price: number;
  yearlyTotal: number;
  billingCycle: BillingCycle;
  features: string[];
  limits: { maxLocations: number; maxRepliesPerMonth: number | "unlimited"; maxTeamMembers: number | "unlimited"; maxTonePresets: number | "unlimited" };
  isCurrentPlan: boolean;
  isPopular?: boolean;
  extraLocationPrice?: number;
  onSelect: () => void;
  isSelecting: boolean;
  isAnyLoading: boolean;
  t: (key: string) => string;
}) {
  return (
    <Card className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>{t("billing.mostPopular")}</Badge>
        </div>
      )}
      <CardHeader className="pb-4">
        <div className={`h-10 w-10 flex items-center justify-center rounded-lg mb-3 ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
        
        <div className="pt-2">
          <span className="text-3xl font-bold">{"\u20AC"}{price}</span>
          <span className="text-muted-foreground">/{t("billing.month")}</span>
          {billingCycle === "yearly" && (
            <p className="text-xs text-muted-foreground mt-1">
              {"\u20AC"}{yearlyTotal} {t("billing.billedAnnually")}
            </p>
          )}
          {extraLocationPrice && (
            <p className="text-xs text-muted-foreground">
              {t("billing.perExtraLocation").replace("{price}", extraLocationPrice.toString())}
            </p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{limits.maxLocations} {limits.maxLocations > 1 ? t("billing.locationPlural") : t("billing.location")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span>{limits.maxRepliesPerMonth === "unlimited" ? t("billing.unlimited") : limits.maxRepliesPerMonth} {t("billing.repliesPerMonth")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{limits.maxTeamMembers === "unlimited" ? t("billing.unlimited") : limits.maxTeamMembers} {typeof limits.maxTeamMembers === "number" && limits.maxTeamMembers > 1 ? t("billing.teamMemberPlural") : t("billing.teamMember")}</span>
          </div>
        </div>
        
        <ul className="space-y-1.5">
          {features.slice(0, 5).map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : "default"}
          disabled={isCurrentPlan || isAnyLoading}
          onClick={onSelect}
          data-testid={`button-select-${plan}`}
        >
          {isSelecting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isCurrentPlan ? t("billing.currentPlan") : isSelecting ? t("billing.processing") : t("billing.selectPlan")}
        </Button>
      </CardFooter>
    </Card>
  );
}

function UsageItem({
  icon,
  label,
  used,
  limit,
  percentage,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | "unlimited";
  percentage: number;
  t: (key: string) => string;
}) {
  const isUnlimited = limit === "unlimited";
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="space-y-2" data-testid={`usage-item-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </div>
        <span className="text-sm text-muted-foreground">
          {used} / {isUnlimited ? "\u221E" : limit}
        </span>
      </div>
      <Progress
        value={isUnlimited ? 0 : Math.min(percentage, 100)}
        className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-yellow-500" : ""}`}
      />
      {isAtLimit && (
        <p className="text-xs text-red-500">{t("billing.limitReached")}</p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-600 dark:text-yellow-500">{t("billing.nearLimit")}</p>
      )}
    </div>
  );
}
