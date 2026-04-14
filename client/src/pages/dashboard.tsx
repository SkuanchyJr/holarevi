import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  TrendingUp,
  Star,
  ArrowRight,
  AlertTriangle,
  Zap,
  Store,
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardStats, ReviewWithRestaurant } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { cleanGoogleTranslationLabels } from "@/lib/utils";
import { ReplyUsageCard } from "@/components/reply-usage-card";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { cn } from "@/lib/utils";

function MiniReviewCard({ review }: { review: ReviewWithRestaurant }) {
  const { t } = useLanguage();
  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    posted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dismissed: "bg-muted text-muted-foreground",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div className="flex gap-3 py-3.5 border-b border-border/60 last:border-0">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={review.reviewerPhotoUrl || undefined} className="object-cover" />
        <AvatarFallback className="text-xs bg-muted font-medium">
          {review.reviewerName?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-foreground truncate">
              {review.reviewerName || t("dashboard.anonymous")}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", statusColors[review.replyStatus || "pending"])}>
            {t(`reviews.status.${review.replyStatus || "pending"}`)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {cleanGoogleTranslationLabels(review.comment) || t("dashboard.noComment")}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Store className="h-2.5 w-2.5" />
            {review.restaurant?.name}
          </span>
          {review.reviewedAt && (
            <>
              <span>·</span>
              <span>{new Date(review.reviewedAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<ReviewWithRestaurant[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: restaurants } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
  });

  const recentReviews =
    reviews
      ?.sort((a, b) =>
        new Date(b.reviewedAt || b.createdAt || 0).getTime() -
        new Date(a.reviewedAt || a.createdAt || 0).getTime()
      )
      .slice(0, 5) || [];

  const getTrialDaysLeft = () => {
    if (!user?.trialEndsAt) return null;
    const status = user.subscriptionStatus;
    if (status !== "trial" && status !== "trialing") return null;
    const trialEnd = new Date(user.trialEndsAt);
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const trialDaysLeft = getTrialDaysLeft();
  const pendingCount = reviews?.filter(r => r.replyStatus === "pending").length || 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Trial Banner */}
      {trialDaysLeft !== null && trialDaysLeft > 0 && (
        <div className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm",
          trialDaysLeft <= 2
            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
            : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
        )} data-testid="dashboard-trial-banner">
          <div className="flex items-center gap-2">
            {trialDaysLeft <= 2
              ? <AlertTriangle className="h-4 w-4 text-amber-600" />
              : <Clock className="h-4 w-4 text-blue-600" />
            }
            <p className={cn(
              "font-medium",
              trialDaysLeft <= 2 ? "text-amber-800 dark:text-amber-400" : "text-blue-800 dark:text-blue-400"
            )}>
              {trialDaysLeft <= 2
                ? t("billing.trialWarning").replace("{days}", String(trialDaysLeft))
                : t("billing.trialDaysLeft").replace("{days}", String(trialDaysLeft))}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link href="/billing">{t("billing.manageSubscription")}</Link>
          </Button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      {/* Alerts Section */}
      <AlertsWidget />

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              title={t("dashboard.stats.totalReviews")}
              value={stats?.totalReviews || 0}
              description={t("dashboard.stats.totalReviewsDesc")}
              icon={<MessageSquare className="h-4 w-4" />}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            />
            <StatCard
              title={t("dashboard.stats.pendingReplies")}
              value={stats?.pendingReplies || 0}
              description={t("dashboard.stats.pendingRepliesDesc")}
              icon={<Clock className="h-4 w-4" />}
              iconClassName={pendingCount > 0
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
              }
            />
            <StatCard
              title={t("dashboard.stats.autoPosted")}
              value={stats?.autoPosted || 0}
              description={t("dashboard.stats.autoPostedDesc")}
              icon={<Zap className="h-4 w-4" />}
              iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
            />
            <StatCard
              title={t("dashboard.stats.responseRate")}
              value={`${stats?.responseRate || 0}%`}
              description={t("dashboard.stats.responseRateDesc")}
              icon={<TrendingUp className="h-4 w-4" />}
              iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
            />
          </>
        )}
      </div>

      {/* Usage + Recent Reviews */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Reviews */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("dashboard.recentReviews.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.recentReviews.subtitle")}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" asChild>
              <Link href="/reviews">
                {t("dashboard.recentReviews.viewAll")}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="px-5">
            {reviewsLoading ? (
              <div className="space-y-4 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentReviews.length > 0 ? (
              <div>
                {recentReviews.map((review) => (
                  <MiniReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MessageSquare className="h-5 w-5" />}
                title={t("dashboard.noReviews.title")}
                description={t("dashboard.noReviews.subtitle")}
                action={
                  <Button size="sm" asChild>
                    <Link href="/restaurants">{t("dashboard.noReviews.action")}</Link>
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Right sidebar: usage + quick actions */}
        <div className="flex flex-col gap-4">
          {/* Reply usage */}
          <ReplyUsageCard />

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">{t("dashboard.quickActions.title")}</h2>
            </div>
            <div className="p-3 space-y-1.5">
              {pendingCount > 0 && (
                <Link href="/reviews">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-sm text-foreground">{t("dashboard.quickActions.reviewPending")}</span>
                    </div>
                    <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5">
                      {pendingCount}
                    </span>
                  </div>
                </Link>
              )}
              <Link href="/restaurants">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <Store className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{t("dashboard.quickActions.addRestaurant")}</span>
                </div>
              </Link>
              <Link href="/billing">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-foreground">{t("dashboard.quickActions.manageBilling")}</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Insight card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide mb-1.5">
              {t("dashboard.insight.didYouKnow")}
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {t("dashboard.insight.trustMessage")}{" "}
              <span className="font-semibold text-primary">{t("dashboard.insight.trustMultiplier")}</span>{" "}
              {t("dashboard.insight.trustSuffix")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
