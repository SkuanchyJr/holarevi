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

function SentimentIcon({
  type,
}: {
  type: "positive" | "neutral" | "negative";
}) {
  switch (type) {
    case "positive":
      return <ThumbsUp className="w-4 h-4 text-green-500" />;
    case "negative":
      return <ThumbsDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-yellow-500" />;
  }
}

function RatingBar({
  rating,
  count,
  total,
}: {
  rating: number;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 w-16">
        <span className="text-sm font-medium">{rating}</span>
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      </div>
      <div className="flex-1 bg-muted rounded-full h-2">
        <div
          className="bg-yellow-400 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground w-12 text-right">
        {count}
      </span>
    </div>
  );
}

export default function Analytics() {
  const { t } = useLanguage();
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery<AdvancedAnalytics>({
    queryKey: ["/api/analytics/advanced"],
  });

  const { data: planInfo } = useQuery<any>({
    queryKey: ["/api/plan-info"],
  });

  const hasAccess = planInfo?.features?.hasAdvancedAnalytics;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="p-6">
        <div className="max-w-4xl py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">
                {t("analytics.title")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("analytics.upgradeMessage")}
              </p>
              <Link href="/billing">
                <Button data-testid="button-upgrade-analytics">
                  {t("analytics.upgradePlan")}
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalReviews = analytics?.totalReviews || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-analytics-title">
          {t("analytics.title")}
        </h1>
        <p className="text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.metrics.totalReviews")}
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-reviews"
            >
              {analytics?.totalReviews || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.metrics.totalReplies")}
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-replies"
            >
              {analytics?.totalReplies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalReviews > 0
                ? t("analytics.metrics.responseRate").replace(
                    "{rate}",
                    String(
                      Math.round(
                        ((analytics?.totalReplies || 0) / totalReviews) * 100,
                      ),
                    ),
                  )
                : t("analytics.metrics.noReviews")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.metrics.avgRating")}
            </CardTitle>
            <Star className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold flex items-center gap-1"
              data-testid="text-avg-rating"
            >
              {analytics?.averageRating?.toFixed(1) || "0.0"}
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.metrics.sentiment")}
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                <span className="font-semibold">
                  {analytics?.sentimentBreakdown?.positive || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Minus className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold">
                  {analytics?.sentimentBreakdown?.neutral || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-4 h-4 text-red-500" />
                <span className="font-semibold">
                  {analytics?.sentimentBreakdown?.negative || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de rating + sentimiento */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.ratingDistribution.title")}</CardTitle>
            <CardDescription>
              {t("analytics.ratingDistribution.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const data = analytics?.ratingDistribution?.find(
                (r) => r.rating === rating,
              );
              return (
                <RatingBar
                  key={rating}
                  rating={rating}
                  count={data?.count || 0}
                  total={totalReviews}
                />
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.sentimentAnalysis.title")}</CardTitle>
            <CardDescription>
              {t("analytics.sentimentAnalysis.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  type: "positive" as const,
                  labelKey: "positive",
                  color: "bg-green-500",
                },
                {
                  type: "neutral" as const,
                  labelKey: "neutral",
                  color: "bg-yellow-500",
                },
                {
                  type: "negative" as const,
                  labelKey: "negative",
                  color: "bg-red-500",
                },
              ].map(({ type, labelKey, color }) => {
                const count = analytics?.sentimentBreakdown?.[type] || 0;
                const percentage =
                  totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SentimentIcon type={type} />
                        <span className="text-sm font-medium">
                          {t(`analytics.sentimentAnalysis.${labelKey}`)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendencias + mejores localizaciones */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.monthlyTrends.title")}</CardTitle>
            <CardDescription>
              {t("analytics.monthlyTrends.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!analytics?.monthlyTrends?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("analytics.noData")}
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.monthlyTrends.slice(-6).map((trend) => (
                  <div
                    key={trend.month}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <span className="text-sm font-medium">{trend.month}</span>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {trend.reviews}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {trend.replies}
                      </Badge>
                      <Badge variant="default" className="gap-1">
                        <Star className="w-3 h-3" />
                        {trend.averageRating.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.topLocations.title")}</CardTitle>
            <CardDescription>
              {t("analytics.topLocations.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!analytics?.topPerformingLocations?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("analytics.noLocations")}
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.topPerformingLocations
                  .slice(0, 5)
                  .map((location, index) => (
                    <div
                      key={location.restaurantId}
                      className="flex items-center justify-between border-b pb-2"
                      data-testid={`row-location-${location.restaurantId}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-medium">{location.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {location.reviewCount}{" "}
                          {t("analytics.topLocations.reviews")}
                        </Badge>
                        <Badge variant="default" className="gap-1">
                          <Star className="w-3 h-3" />
                          {location.averageRating.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
