import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardStats, ReviewWithRestaurant } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { cleanGoogleTranslationLabels } from "@/lib/utils";
import { ReplyUsageCard } from "@/components/reply-usage-card";
import { useAuth } from "@/hooks/useAuth";

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function MiniReviewCard({ review }: { review: ReviewWithRestaurant }) {
  const { t } = useLanguage();

  return (
    <div className="flex gap-4">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={review.reviewerPhotoUrl || undefined} />
        <AvatarFallback>
          {review.reviewerName?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {review.reviewerName || t("dashboard.anonymous")}
            </span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>

          <Badge variant="secondary" className="text-xs">
            {review.replyStatus}
          </Badge>
        </div>

        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {cleanGoogleTranslationLabels(review.comment) ||
            t("dashboard.noComment")}
        </p>

        <div className="mt-1 text-xs text-muted-foreground flex gap-3">
          <span>{review.restaurant?.name}</span>
          {review.reviewedAt && (
            <span>{new Date(review.reviewedAt).toLocaleDateString()}</span>
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

  const { data: reviews, isLoading: reviewsLoading } = useQuery<
    ReviewWithRestaurant[]
  >({
    queryKey: ["/api/reviews"],
  });

  const { data: restaurants } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
  });

  const recentReviews =
    reviews
      ?.sort(
        (a, b) =>
          new Date(b.reviewedAt || b.createdAt || 0).getTime() -
          new Date(a.reviewedAt || a.createdAt || 0).getTime(),
      )
      .slice(0, 3) || [];

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

  return (
    <div className="p-6 space-y-6">
      {trialDaysLeft !== null && trialDaysLeft > 0 && (
        <div className={`p-4 rounded-lg border flex items-center justify-between flex-wrap gap-3 ${trialDaysLeft <= 2 ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"}`} data-testid="dashboard-trial-banner">
          <div className="flex items-center gap-3">
            {trialDaysLeft <= 2 ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : <Clock className="h-5 w-5 text-blue-600" />}
            <p className={`text-sm font-medium ${trialDaysLeft <= 2 ? "text-yellow-800 dark:text-yellow-400" : "text-blue-800 dark:text-blue-400"}`}>
              {trialDaysLeft <= 2
                ? t("billing.trialWarning").replace("{days}", String(trialDaysLeft))
                : t("billing.trialDaysLeft").replace("{days}", String(trialDaysLeft))}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing">{t("billing.manageSubscription")}</Link>
          </Button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : (
          <>
            <StatsCard
              title={t("dashboard.stats.totalReviews")}
              value={stats?.totalReviews || 0}
              description={t("dashboard.stats.totalReviewsDesc")}
              icon={MessageSquare}
            />
            <StatsCard
              title={t("dashboard.stats.pendingReplies")}
              value={stats?.pendingReplies || 0}
              description={t("dashboard.stats.pendingRepliesDesc")}
              icon={Clock}
            />
            <StatsCard
              title={t("dashboard.stats.autoPosted")}
              value={stats?.autoPosted || 0}
              description={t("dashboard.stats.autoPostedDesc")}
              icon={CheckCircle}
            />
            <StatsCard
              title={t("dashboard.stats.responseRate")}
              value={`${stats?.responseRate || 0}%`}
              description={t("dashboard.stats.responseRateDesc")}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <ReplyUsageCard variant="compact" />

      <Card>
        <CardHeader className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <CardTitle>{t("dashboard.recentReviews.title")}</CardTitle>
            <CardDescription>
              {t("dashboard.recentReviews.subtitle")}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reviews">
              {t("dashboard.recentReviews.viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {reviewsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : recentReviews.length > 0 ? (
            <>
              {recentReviews.map((review) => (
                <MiniReviewCard key={review.id} review={review} />
              ))}
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {t("dashboard.insight.didYouKnow")}
                </p>
                <p className="text-lg font-medium">
                  {t("dashboard.insight.trustMessage")}{" "}
                  <span className="text-primary font-semibold">
                    {t("dashboard.insight.trustMultiplier")}
                  </span>{" "}
                  {t("dashboard.insight.trustSuffix")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("dashboard.insight.trustDescription")}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-md bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.insight.locationsConnected")}
                  </p>
                  <p className="text-xl font-semibold">
                    {restaurants?.length || 0}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.insight.reviewsDetected")}
                  </p>
                  <p className="text-xl font-semibold">0</p>
                </div>
                <div className="rounded-md bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.insight.autoReplies")}
                  </p>
                  <p className="text-xl font-semibold text-green-600">
                    {t("dashboard.insight.active")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground max-w-md">
                  {t("dashboard.insight.accountReady")}
                </p>
                <Button variant="outline" asChild>
                  <Link href="/restaurants">{t("dashboard.insight.manageLocations")}</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
