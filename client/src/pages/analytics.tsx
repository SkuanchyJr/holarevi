import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "wouter";
import type { AdvancedAnalytics } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 w-12 shrink-0">
        <span className="text-xs font-medium tabular-nums">{rating}</span>
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{count}</span>
    </div>
  );
}

function SentimentRow({ type, count, total, label }: { type: string; count: number; total: number; label: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colors: Record<string, string> = {
    positive: "bg-green-500",
    neutral: "bg-amber-400",
    negative: "bg-red-500",
  };
  const textColors: Record<string, string> = {
    positive: "text-green-600 dark:text-green-400",
    neutral: "text-amber-600 dark:text-amber-400",
    negative: "text-red-600 dark:text-red-400",
  };
  const icons: Record<string, React.ReactNode> = {
    positive: <ThumbsUp className="h-3.5 w-3.5" />,
    neutral: <Minus className="h-3.5 w-3.5" />,
    negative: <ThumbsDown className="h-3.5 w-3.5" />,
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-1.5 text-sm font-medium", textColors[type])}>
          {icons[type]}
          {label}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colors[type])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const { t } = useLanguage();
  const { data: analytics, isLoading, error } = useQuery<AdvancedAnalytics>({
    queryKey: ["/api/analytics/advanced"],
  });
  const { data: planInfo } = useQuery<any>({ queryKey: ["/api/plan-info"] });
  const hasAccess = planInfo?.features?.hasAdvancedAnalytics;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-2">{t("analytics.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">{t("analytics.upgradeMessage")}</p>
          <Button asChild data-testid="button-upgrade-analytics">
            <Link href="/billing">
              {t("analytics.upgradePlan")}
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const total = analytics?.totalReviews || 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader title={t("analytics.title")} subtitle={t("analytics.subtitle")} />

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("analytics.metrics.totalReviews")}
          value={analytics?.totalReviews || 0}
          icon={<MessageSquare className="h-4 w-4" />}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          data-testid="text-total-reviews"
        />
        <StatCard
          title={t("analytics.metrics.totalReplies")}
          value={analytics?.totalReplies || 0}
          description={total > 0 ? t("analytics.metrics.responseRate").replace("{rate}", String(Math.round(((analytics?.totalReplies || 0) / total) * 100))) : undefined}
          icon={<BarChart3 className="h-4 w-4" />}
          iconClassName="bg-primary/10 text-primary"
          data-testid="text-total-replies"
        />
        <StatCard
          title={t("analytics.metrics.avgRating")}
          value={analytics?.averageRating?.toFixed(1) || "0.0"}
          icon={<Star className="h-4 w-4" />}
          iconClassName="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-500"
          data-testid="text-avg-rating"
        />
        <StatCard
          title={t("analytics.metrics.sentiment")}
          value={`${analytics?.sentimentBreakdown?.positive || 0} pos`}
          description={`${analytics?.sentimentBreakdown?.negative || 0} neg · ${analytics?.sentimentBreakdown?.neutral || 0} neu`}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">{t("analytics.ratingDistribution.title")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("analytics.ratingDistribution.description")}</p>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((r) => {
              const d = analytics?.ratingDistribution?.find(x => x.rating === r);
              return <RatingBar key={r} rating={r} count={d?.count || 0} total={total} />;
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">{t("analytics.sentimentAnalysis.title")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("analytics.sentimentAnalysis.description")}</p>
          <div className="space-y-4">
            {(["positive", "neutral", "negative"] as const).map((type) => (
              <SentimentRow
                key={type}
                type={type}
                count={analytics?.sentimentBreakdown?.[type] || 0}
                total={total}
                label={t(`analytics.sentimentAnalysis.${type}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Trends + Top locations */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">{t("analytics.monthlyTrends.title")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("analytics.monthlyTrends.description")}</p>
          {!analytics?.monthlyTrends?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("analytics.noData")}</p>
          ) : (
            <div className="space-y-2">
              {analytics.monthlyTrends.slice(-6).map((trend) => (
                <div key={trend.month} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium text-foreground">{trend.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {trend.reviews} rev
                    </span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      {trend.replies} rep
                    </span>
                    <span className="text-xs flex items-center gap-0.5 font-medium text-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {trend.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">{t("analytics.topLocations.title")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("analytics.topLocations.description")}</p>
          {!analytics?.topPerformingLocations?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("analytics.noLocations")}</p>
          ) : (
            <div className="space-y-2">
              {analytics.topPerformingLocations.slice(0, 5).map((location, i) => (
                <div
                  key={location.restaurantId}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  data-testid={`row-location-${location.restaurantId}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                    <span className="text-sm font-medium text-foreground truncate">{location.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{location.reviewCount} {t("analytics.topLocations.reviews")}</span>
                    <span className="text-xs font-semibold flex items-center gap-0.5 text-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {location.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
