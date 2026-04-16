import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  AlertTriangle,
  Globe,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";
import type { AdvancedAnalytics } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

const LANG_LABELS: Record<string, string> = {
  es: "reviews.languages.es",
  en: "reviews.languages.en",
  ca: "reviews.languages.ca",
  fr: "French",
  it: "Italian",
  de: "German",
  pt: "Portuguese",
  ar: "Arabic",
  unknown: "Unknown",
};

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#f59e0b",
  negative: "#ef4444",
};

const REPLY_STATUS_COLORS = {
  posted: "#22c55e",
  approved: "#3b82f6",
  pending: "#f59e0b",
  dismissed: "#94a3b8",
};

function formatReplyTime(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
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
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 w-12 shrink-0">
        <span className="text-xs font-medium tabular-nums">{rating}</span>
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      </div>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
        {count} ({pct.toFixed(0)}%)
      </span>
    </div>
  );
}

// Custom tooltip for Recharts
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: p.color }}
          />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const { t } = useLanguage();
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery<AdvancedAnalytics>({
    queryKey: ["/api/analytics/advanced"],
  });

  // ─── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const total = analytics?.totalReviews || 0;

  // Prepare pie chart data for sentiment
  const sentimentPieData = [
    { name: t("analytics.data.positive"), value: analytics?.sentimentBreakdown?.positive || 0 },
    { name: t("analytics.data.neutral"), value: analytics?.sentimentBreakdown?.neutral || 0 },
    { name: t("analytics.data.negative"), value: analytics?.sentimentBreakdown?.negative || 0 },
  ].filter((d) => d.value > 0);

  // Prepare pie chart data for reply status
  const replyStatusPieData = [
    { name: t("analytics.data.posted"), value: analytics?.replyStatusBreakdown?.posted || 0, color: REPLY_STATUS_COLORS.posted },
    { name: t("analytics.data.approved"), value: analytics?.replyStatusBreakdown?.approved || 0, color: REPLY_STATUS_COLORS.approved },
    { name: t("analytics.data.pending"), value: analytics?.replyStatusBreakdown?.pending || 0, color: REPLY_STATUS_COLORS.pending },
    { name: t("analytics.data.dismissed"), value: analytics?.replyStatusBreakdown?.dismissed || 0, color: REPLY_STATUS_COLORS.dismissed },
  ].filter((d) => d.value > 0);

  // Day-of-week chart data
  const dayOfWeekData = (analytics?.reviewsByDayOfWeek || []).map((d) => ({
    name: t(`common.days.${DAY_NAMES_SHORT[d.day]}`),
    reviews: d.count,
    rating: d.averageRating,
  }));

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title={t("analytics.title")}
        subtitle={t("analytics.subtitle")}
      />

      {/* ── TOP KPI CARDS ──────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title={t("analytics.stats.totalReviews")}
          value={analytics?.totalReviews || 0}
          icon={<MessageSquare className="h-4 w-4" />}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          data-testid="text-total-reviews"
        />
        <StatCard
          title={t("analytics.stats.responses")}
          value={analytics?.totalReplies || 0}
          description={t("analytics.data.responseRate").replace("{rate}", String(analytics?.responseRate || 0))}
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          data-testid="text-total-replies"
        />
        <StatCard
          title={t("analytics.stats.avgRating")}
          value={analytics?.averageRating?.toFixed(1) || "0.0"}
          icon={<Star className="h-4 w-4" />}
          iconClassName="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-500"
          data-testid="text-avg-rating"
        />
        <StatCard
          title={t("analytics.stats.responseTime")}
          value={formatReplyTime(analytics?.averageReplyTimeHours ?? null)}
          description={t("analytics.data.avgTimeDesc")}
          icon={<Clock className="h-4 w-4" />}
          iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
        />
        <StatCard
          title={t("analytics.stats.unanswered")}
          value={analytics?.unansweredReviews || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
        />
        <StatCard
          title={t("analytics.stats.sentiment")}
          value={t("analytics.data.sentimentSummaryValue").replace("{pos}", String(analytics?.sentimentBreakdown?.positive || 0))}
          description={t("analytics.data.sentimentSummary")
            .replace("{pos}", String(analytics?.sentimentBreakdown?.positive || 0))
            .replace("{neg}", String(analytics?.sentimentBreakdown?.negative || 0))
            .replace("{neu}", String(analytics?.sentimentBreakdown?.neutral || 0))}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
        />
      </div>

      {/* ── ROW 1: Rating Over Time + Review Volume ──────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Rating Over Time Area Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.ratingEvolution")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.ratingEvolutionDesc")}
          </p>
          {(analytics?.ratingOverTime?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics?.ratingOverTime}>
                <defs>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="rating"
                  name={t("analytics.stats.avgRating")}
                  stroke="#f59e0b"
                  fill="url(#ratingGrad)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f59e0b" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("analytics.data.noData")}
            </p>
          )}
        </div>

        {/* Weekly Volume Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.weeklyVolume")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.weeklyVolumeDesc")}
          </p>
          {(analytics?.weeklyTrends?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics?.weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="reviews"
                  name={t("analytics.stats.totalReviews")}
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="replies"
                  name={t("analytics.stats.responses")}
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("analytics.data.noData")}
            </p>
          )}
        </div>
      </div>

      {/* ── ROW 2: Sentiment Pie + Reply Status Pie ──────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Sentiment Donut */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.sentimentAnalysis")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.sentimentAnalysisDesc")}
          </p>
          {sentimentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sentimentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  <Cell fill={SENTIMENT_COLORS.positive} />
                  <Cell fill={SENTIMENT_COLORS.neutral} />
                  <Cell fill={SENTIMENT_COLORS.negative} />
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px" }}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("analytics.data.noData")}
            </p>
          )}
        </div>

        {/* Reply Status Donut */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.replyStatus")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.replyStatusDesc")}
          </p>
          {replyStatusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={replyStatusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {replyStatusPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px" }}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("analytics.data.noData")}
            </p>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.starDistribution")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.starDistributionDesc")}
          </p>
          <div className="space-y-3 mt-2">
            {[5, 4, 3, 2, 1].map((r) => {
              const d = analytics?.ratingDistribution?.find(
                (x) => x.rating === r
              );
              return (
                <RatingBar
                  key={r}
                  rating={r}
                  count={d?.count || 0}
                  total={total}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Day of Week + Language Breakdown ────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Reviews by Day of Week */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            <CalendarDays className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            {t("analytics.charts.dayOfWeek")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.dayOfWeekDesc")}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="reviews"
                name={t("analytics.stats.totalReviews")}
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reviews by Language */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            <Globe className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            {t("analytics.charts.languages")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.languagesDesc")}
          </p>
          {(analytics?.reviewsByLanguage?.length || 0) > 0 ? (
            <div className="space-y-3">
              {analytics!.reviewsByLanguage.slice(0, 8).map((lang) => {
                const pct =
                  total > 0 ? Math.round((lang.count / total) * 100) : 0;
                return (
                  <div key={lang.language} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {t(LANG_LABELS[lang.language]) || lang.language}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {lang.count} ({pct}%)
                        </span>
                        <span className="text-xs font-semibold flex items-center gap-0.5 text-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {lang.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("analytics.data.noData")}
            </p>
          )}
        </div>
      </div>

      {/* ── ROW 4: Monthly Trends + Top Locations ─────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trends (table) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.monthlyTrends")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.monthlyTrendsDesc")}
          </p>
          {!analytics?.monthlyTrends?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("analytics.data.noData")}
            </p>
          ) : (
            <div className="space-y-2">
              {analytics.monthlyTrends.slice(-6).map((trend) => (
                <div
                  key={trend.month}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <span className="text-sm font-medium text-foreground">
                    {trend.month}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {trend.reviews} rev
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
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

        {/* Top Locations */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.locationPerformance")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.locationPerformanceDesc")}
          </p>
          {!analytics?.topPerformingLocations?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("analytics.data.noData")}
            </p>
          ) : (
            <div className="space-y-2">
              {analytics.topPerformingLocations
                .slice(0, 5)
                .map((location, i) => (
                  <div
                    key={location.restaurantId}
                    className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                    data-testid={`row-location-${location.restaurantId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">
                        #{i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {location.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5"
                      >
                        {location.responseRate}% resp
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {location.reviewCount} rev
                      </span>
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

      {/* ── ROW 5: Recent Negative Reviews ────────────────────── */}
      {(analytics?.recentNegativeReviews?.length || 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            <AlertTriangle className="h-4 w-4 inline mr-1.5 -mt-0.5 text-red-500" />
            {t("analytics.charts.recentNegative")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.recentNegativeDesc")}
          </p>
          <div className="space-y-3">
            {analytics!.recentNegativeReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-sm font-medium text-foreground">
                      {review.reviewerName || t("common.customer")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {review.restaurantName}
                    </Badge>
                    {review.replyStatus === "posted" ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        {t("analytics.data.posted")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0"
                      >
                        <XCircle className="h-3 w-3 mr-0.5" />
                        {t("analytics.data.pending")}
                      </Badge>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    "{review.comment}"
                  </p>
                )}
                {review.createdAt && (
                  <p className="text-xs text-muted-foreground/70">
                    {new Date(review.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
