import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Loader2,
  Languages,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import type { Restaurant } from "@shared/schema";
import { format } from "date-fns";
import { es, ca, enUS } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

interface ReviewSummaryData {
  overallSentiment: "positive" | "neutral" | "negative" | "mixed";
  sentimentScore: number;
  keyThemes: Array<{
    theme: string;
    sentiment: "positive" | "neutral" | "negative";
    count: number;
    examples: string[];
  }>;
  trends: {
    improving: string[];
    declining: string[];
    consistent: string[];
  };
  recommendations: string[];
  summary: string;
  reviewCount: number;
  analyzedCount: number;
  generatedAt?: string;
  language?: string;
}

const SENTIMENT_STYLES = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  mixed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  neutral: "bg-muted text-muted-foreground",
};

const THEME_SENTIMENT_STYLES = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  neutral: "bg-muted text-muted-foreground",
};

export default function ReviewSummary() {
  const { t, language: uiLanguage } = useLanguage();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [summaryLanguage, setSummaryLanguage] = useState<string>("es");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: summary, isLoading, error } = useQuery<ReviewSummaryData | null>({
    queryKey: ["/api/reviews/summary", selectedRestaurant !== "all" ? selectedRestaurant : undefined, summaryLanguage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRestaurant !== "all") params.set("restaurantId", selectedRestaurant);
      params.set("language", summaryLanguage);
      const response = await fetch(`/api/reviews/summary?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error(t("reviewSummary.fetchError"));
      return response.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: any = { language: summaryLanguage };
      if (selectedRestaurant !== "all") body.restaurantId = selectedRestaurant;
      if (startDate) body.startDate = startDate.toISOString();
      if (endDate) body.endDate = endDate.toISOString();
      const res = await apiRequest("POST", "/api/reviews/summary/generate", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/reviews/summary", selectedRestaurant !== "all" ? selectedRestaurant : undefined, summaryLanguage],
      });
    },
  });

  const getDateLocale = () => {
    switch (uiLanguage as string) {
      case "es": return es;
      case "ca": return ca;
      default: return enUS;
    }
  };

  const formatDateDisplay = (date: Date) => format(date, "d MMM yyyy", { locale: getDateLocale() });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <ThumbsUp className="h-3.5 w-3.5" />;
      case "negative": return <ThumbsDown className="h-3.5 w-3.5" />;
      default: return <Minus className="h-3.5 w-3.5" />;
    }
  };

  const getLanguageLabel = (lang: string) => {
    const langKeys: Record<string, string> = {
      es: "reviewSummary.langSpanish",
      ca: "reviewSummary.langCatalan",
      en: "reviewSummary.langEnglish",
    };
    return langKeys[lang] ? t(langKeys[lang]) : lang.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={<AlertCircle className="h-5 w-5" />}
            title={t("reviewSummary.error")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <PageHeader
        title={t("reviewSummary.title")}
        subtitle={t("reviewSummary.subtitle")}
        actions={
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            size="sm"
            data-testid="button-generate-summary"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {t("reviewSummary.generating")}
              </>
            ) : summary ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t("reviewSummary.regenerate")}
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {t("reviewSummary.generate")}
              </>
            )}
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {restaurants && restaurants.length > 1 && (
          <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
            <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs" data-testid="select-restaurant-filter">
              <SelectValue placeholder={t("reviewSummary.allLocations")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reviewSummary.allLocations")}</SelectItem>
              {restaurants.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={summaryLanguage} onValueChange={setSummaryLanguage}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs" data-testid="select-summary-language">
            <Languages className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">{t("reviewSummary.langSpanish")}</SelectItem>
            <SelectItem value="ca">{t("reviewSummary.langCatalan")}</SelectItem>
            <SelectItem value="en">{t("reviewSummary.langEnglish")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range pickers */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs font-normal" data-testid="button-start-date">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {startDate ? formatDateDisplay(startDate) : t("reviewSummary.dateRange.fromDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              disabled={(date) => date > new Date() || (endDate ? date > endDate : false)}
              initialFocus
              locale={getDateLocale()}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs font-normal" data-testid="button-end-date">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {endDate ? formatDateDisplay(endDate) : t("reviewSummary.dateRange.toDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
              initialFocus
              locale={getDateLocale()}
            />
          </PopoverContent>
        </Popover>

        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
            data-testid="button-clear-dates"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Date range display */}
      {(startDate || endDate) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarIcon className="h-3 w-3" />
          {startDate && endDate
            ? t("reviewSummary.dateRange.showingReviews")
                .replace("{startDate}", formatDateDisplay(startDate))
                .replace("{endDate}", formatDateDisplay(endDate))
            : startDate
              ? `${t("reviewSummary.dateRange.fromDate")}: ${formatDateDisplay(startDate)}`
              : `${t("reviewSummary.dateRange.toDate")}: ${formatDateDisplay(endDate!)}`
          }
        </p>
      )}

      {/* No summary yet */}
      {!summary ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title={t("reviewSummary.noSummary.title")}
            description={t("reviewSummary.noSummary.description")}
            action={
              <Button
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t("reviewSummary.generating")}</>
                  : <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{t("reviewSummary.generate")}</>
                }
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Executive summary banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{t("reviewSummary.executiveSummary")}</h2>
              </div>
              <div className="flex items-center gap-2">
                {summary.generatedAt && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(summary.generatedAt), "PPp", { locale: getDateLocale() })}
                  </span>
                )}
                {summary.language && (
                  <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {getLanguageLabel(summary.language)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed" data-testid="text-summary">
              {summary.summary}
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>{t("reviewSummary.basedOn")} {summary.analyzedCount} {t("reviewSummary.reviews")}</span>
              <span>·</span>
              <span>{t("reviewSummary.totalReviews")}: {summary.reviewCount}</span>
            </div>
          </div>

          {/* Three metric cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Overall sentiment */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-0.5">{t("reviewSummary.overallSentiment")}</h3>
              <p className="text-xs text-muted-foreground mb-4">{t("reviewSummary.sentimentDescription")}</p>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                  SENTIMENT_STYLES[summary.overallSentiment]
                )}>
                  {getSentimentIcon(summary.overallSentiment)}
                  {t(`reviewSummary.sentiment.${summary.overallSentiment}`)}
                </span>
                <span className="text-xl font-bold text-foreground" data-testid="text-sentiment-score">
                  {summary.sentimentScore}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    summary.overallSentiment === "positive" ? "bg-green-500"
                      : summary.overallSentiment === "negative" ? "bg-red-500"
                      : summary.overallSentiment === "mixed" ? "bg-amber-500"
                      : "bg-muted-foreground"
                  )}
                  style={{ width: `${summary.sentimentScore}%` }}
                />
              </div>
            </div>

            {/* Trends */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-0.5">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold text-foreground">{t("reviewSummary.trends.title")}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{t("reviewSummary.trends.description")}</p>
              <div className="space-y-3">
                {summary.trends.improving.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1 mb-1.5">
                      <TrendingUp className="h-3 w-3" />
                      {t("reviewSummary.trends.improving")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {summary.trends.improving.map((item, i) => (
                        <span key={i} className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {summary.trends.declining.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mb-1.5">
                      <TrendingDown className="h-3 w-3" />
                      {t("reviewSummary.trends.declining")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {summary.trends.declining.map((item, i) => (
                        <span key={i} className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {summary.trends.consistent.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <Minus className="h-3 w-3" />
                      {t("reviewSummary.trends.consistent")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {summary.trends.consistent.map((item, i) => (
                        <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {summary.trends.improving.length === 0 && summary.trends.declining.length === 0 && summary.trends.consistent.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("reviewSummary.trends.noData")}</p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-0.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">{t("reviewSummary.recommendations.title")}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{t("reviewSummary.recommendations.description")}</p>
              {summary.recommendations.length > 0 ? (
                <ol className="space-y-2">
                  {summary.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                      <span className="font-bold text-primary shrink-0 mt-0.5">{i + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">{t("reviewSummary.recommendations.noData")}</p>
              )}
            </div>
          </div>

          {/* Key themes */}
          {summary.keyThemes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-0.5">{t("reviewSummary.keyThemes.title")}</h3>
              <p className="text-xs text-muted-foreground mb-4">{t("reviewSummary.keyThemes.description")}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.keyThemes.map((theme, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 border border-border/60 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{theme.theme}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        THEME_SENTIMENT_STYLES[theme.sentiment]
                      )}>
                        {getSentimentIcon(theme.sentiment)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t("reviewSummary.keyThemes.mentionedIn")} {theme.count} {t("reviewSummary.reviews")}
                    </p>
                    {theme.examples.length > 0 && (
                      <div className="space-y-1">
                        {theme.examples.slice(0, 2).map((ex, j) => (
                          <p key={j} className="text-xs text-foreground/55 italic leading-relaxed line-clamp-2">
                            "{ex}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
