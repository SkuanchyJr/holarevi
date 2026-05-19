import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  TrendingUp,
  Star,
  MessageSquare,
  Clock,
  AlertTriangle,
  Globe,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Sparkles,
  ExternalLink,
  Activity,
} from "lucide-react";
import type { AdvancedAnalytics, ReviewSummary } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
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

const THEME_SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  neutral: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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

function PerformanceScoreWidget({
  score,
  t,
}: {
  score: number;
  t: (key: string) => string;
}) {
  const label =
    score >= 70
      ? t("analytics.health.excellent")
      : score >= 40
      ? t("analytics.health.good")
      : t("analytics.health.needsWork");
  const color =
    score >= 70
      ? "text-green-600 dark:text-green-400"
      : score >= 40
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-500";
  const progressColor =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 min-w-[200px]">
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          score >= 70
            ? "bg-green-100 dark:bg-green-900/40"
            : score >= 40
            ? "bg-amber-100 dark:bg-amber-900/40"
            : "bg-red-100 dark:bg-red-900/40"
        )}
      >
        <Activity className={cn("h-5 w-5", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{t("analytics.health.title")}</p>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold tabular-nums", color)}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
          <span className={cn("text-xs font-medium", color)}>{label}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", progressColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const { t, language } = useLanguage();

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery<AdvancedAnalytics>({
    queryKey: ["/api/analytics/advanced"],
  });

  const { data: aiSummary } = useQuery<ReviewSummary | null>({
    queryKey: ["/api/reviews/summary", language],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/summary?language=${language}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
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
  const comparison = analytics?.comparison ?? {
    reviewsDelta: 0,
    reviewsDeltaPct: null,
    ratingDelta: 0,
    responseRateDelta: 0,
    replyTimeDelta: null,
  };
  const performanceScore = analytics?.performanceScore ?? 0;

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

  // Reply time trend: negate delta so lower time = positive (green)
  const replyTimeTrendValue =
    comparison.replyTimeDelta !== null ? -(comparison.replyTimeDelta) : 0;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* ── SECCIÓN 0: Health Header ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title={t("analytics.title")}
          subtitle={t("analytics.subtitle")}
        />
        {total > 0 && (
          <PerformanceScoreWidget score={performanceScore} t={t} />
        )}
      </div>

      {/* ── SECCIÓN 1: KPI Cards con deltas ──────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title={t("analytics.stats.totalReviews")}
          value={analytics?.totalReviews || 0}
          icon={<MessageSquare className="h-4 w-4" />}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          trend={
            comparison.reviewsDeltaPct !== null
              ? { value: comparison.reviewsDeltaPct, label: t("analytics.comparison.vs30d") }
              : undefined
          }
          data-testid="text-total-reviews"
        />
        <StatCard
          title={t("analytics.stats.responses")}
          value={analytics?.totalReplies || 0}
          description={t("analytics.data.responseRate").replace("{rate}", String(analytics?.responseRate || 0))}
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          trend={
            comparison.responseRateDelta !== 0
              ? { value: comparison.responseRateDelta, label: t("analytics.comparison.vs30d"), unit: "pp" }
              : undefined
          }
          data-testid="text-total-replies"
        />
        <StatCard
          title={t("analytics.stats.avgRating")}
          value={analytics?.averageRating?.toFixed(1) || "0.0"}
          icon={<Star className="h-4 w-4" />}
          iconClassName="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-500"
          trend={
            comparison.ratingDelta !== 0
              ? { value: comparison.ratingDelta, label: t("analytics.comparison.vs30d"), unit: "★" }
              : undefined
          }
          data-testid="text-avg-rating"
        />
        <StatCard
          title={t("analytics.stats.responseTime")}
          value={formatReplyTime(analytics?.averageReplyTimeHours ?? null)}
          description={t("analytics.data.avgTimeDesc")}
          icon={<Clock className="h-4 w-4" />}
          iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
          trend={
            comparison.replyTimeDelta !== null && comparison.replyTimeDelta !== 0
              ? { value: replyTimeTrendValue, label: t("analytics.comparison.vs30d"), unit: "h" }
              : undefined
          }
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

      {/* ── SECCIÓN 2: AI Insights ────────────────────────────────── */}
      {aiSummary ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                {t("analytics.ai.title")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("analytics.ai.generatedAt")}{" "}
                {aiSummary.generatedAt
                  ? new Date(aiSummary.generatedAt as unknown as string).toLocaleDateString(
                      language === "es" ? "es-ES" : "en-US",
                      { day: "numeric", month: "short", year: "numeric" }
                    )
                  : "—"}
              </p>
            </div>
            <Link href={`/${language}/review-summary`}>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0">
                <ExternalLink className="h-3 w-3" />
                {t("analytics.ai.noSummaryAction")}
              </Button>
            </Link>
          </div>

          {/* Summary text */}
          <p className="text-sm text-muted-foreground line-clamp-3">{aiSummary.summary}</p>

          {/* Key themes */}
          {(aiSummary.keyThemes?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">{t("analytics.ai.keyThemes")}</p>
              <div className="flex flex-wrap gap-1.5">
                {aiSummary.keyThemes.slice(0, 8).map((theme, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                      THEME_SENTIMENT_STYLES[theme.sentiment] ?? THEME_SENTIMENT_STYLES.neutral
                    )}
                  >
                    {theme.theme}
                    <span className="opacity-60">({theme.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(aiSummary.recommendations?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">{t("analytics.ai.recommendations")}</p>
              <ul className="space-y-1">
                {aiSummary.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border border-dashed bg-muted/20 p-5 flex items-center gap-4">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("analytics.ai.title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("analytics.ai.noSummary")}</p>
          </div>
          <Link href={`/${language}/review-summary`} className="ml-auto">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <ExternalLink className="h-3 w-3" />
              {t("analytics.ai.noSummaryAction")}
            </Button>
          </Link>
        </div>
      )}

      {/* ── SECCIÓN 3: Rating Over Time + Sentiment Trend ────────── */}
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
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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

        {/* Sentiment Trend — Stacked Area */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.sentimentTrend")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.sentimentTrendDesc")}
          </p>
          {(analytics?.sentimentOverTime?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics?.sentimentOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="positive"
                  name={t("analytics.data.positive")}
                  stackId="a"
                  fill={SENTIMENT_COLORS.positive}
                  fillOpacity={0.6}
                  stroke={SENTIMENT_COLORS.positive}
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="neutral"
                  name={t("analytics.data.neutral")}
                  stackId="a"
                  fill={SENTIMENT_COLORS.neutral}
                  fillOpacity={0.6}
                  stroke={SENTIMENT_COLORS.neutral}
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  name={t("analytics.data.negative")}
                  stackId="a"
                  fill={SENTIMENT_COLORS.negative}
                  fillOpacity={0.6}
                  stroke={SENTIMENT_COLORS.negative}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("analytics.data.noData")}
            </p>
          )}
        </div>
      </div>

      {/* ── SECCIÓN 4: Monthly ComposedChart + Weekly Volume ──────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Performance — ComposedChart with dual Y-axis */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.monthlyChart")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.monthlyChartDesc")}
          </p>
          {(analytics?.monthlyTrends?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={analytics?.monthlyTrends.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[1, 5]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  yAxisId="left"
                  dataKey="reviews"
                  name={t("analytics.stats.totalReviews")}
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="replies"
                  name={t("analytics.stats.responses")}
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageRating"
                  name={t("analytics.stats.avgRating")}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#f59e0b" }}
                />
              </ComposedChart>
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
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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

      {/* ── SECCIÓN 5: Sentiment Pie + Reply Status Pie + Stars ───── */}
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
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
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
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
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
              const d = analytics?.ratingDistribution?.find((x) => x.rating === r);
              return (
                <RatingBar key={r} rating={r} count={d?.count || 0} total={total} />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 6: Day of Week + Language Breakdown ───────────── */}
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
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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

      {/* ── SECCIÓN 7: Top Locations ──────────────────────────────── */}
      {(analytics?.topPerformingLocations?.length || 0) > 1 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("analytics.charts.locationPerformance")}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {t("analytics.charts.locationPerformanceDesc")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics!.topPerformingLocations.slice(0, 6).map((location, i) => (
              <div
                key={location.restaurantId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50"
                data-testid={`row-location-${location.restaurantId}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                    #{i + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground truncate">
                    {location.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {location.responseRate}%
                  </Badge>
                  <span className="text-xs font-semibold flex items-center gap-0.5 text-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {location.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 8: Recent Negative Reviews ───────────────────── */}
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-sm font-medium text-foreground">
                      {review.reviewerName || t("common.customer")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {review.restaurantName}
                    </Badge>
                    {review.replyStatus === "posted" ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        {t("analytics.data.posted")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
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
                <div className="flex items-center justify-between">
                  {review.createdAt && (
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(review.createdAt).toLocaleDateString(
                        language === "es" ? "es-ES" : "en-US",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </p>
                  )}
                  {review.replyStatus !== "posted" && (
                    <Link href={`/${language}/reviews?id=${review.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {t("analytics.actions.respond")}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
