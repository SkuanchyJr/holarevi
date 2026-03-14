import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock,
  Languages,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import type { Restaurant } from "@shared/schema";
import { format } from "date-fns";
import { es, ca, enUS } from "date-fns/locale";

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

export default function ReviewSummary() {
  const { t, language: uiLanguage } = useLanguage();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [summaryLanguage, setSummaryLanguage] = useState<string>("es");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: summary, isLoading, error, refetch } = useQuery<ReviewSummaryData | null>({
    queryKey: ["/api/reviews/summary", selectedRestaurant !== "all" ? selectedRestaurant : undefined, summaryLanguage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRestaurant !== "all") {
        params.set("restaurantId", selectedRestaurant);
      }
      params.set("language", summaryLanguage);
      const response = await fetch(`/api/reviews/summary?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: any = { language: summaryLanguage };
      if (selectedRestaurant !== "all") {
        body.restaurantId = selectedRestaurant;
      }
      if (startDate) {
        body.startDate = startDate.toISOString();
      }
      if (endDate) {
        body.endDate = endDate.toISOString();
      }
      const res = await apiRequest("POST", "/api/reviews/summary/generate", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/reviews/summary", selectedRestaurant !== "all" ? selectedRestaurant : undefined, summaryLanguage] 
      });
    },
  });

  const clearDateRange = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatDateForDisplay = (date: Date) => {
    return format(date, "d MMM yyyy", { locale: getDateLocale() });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600 dark:text-green-400";
      case "negative": return "text-red-600 dark:text-red-400";
      case "mixed": return "text-amber-600 dark:text-amber-400";
      default: return "text-muted-foreground";
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "negative": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "mixed": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <ThumbsUp className="h-4 w-4" />;
      case "negative": return <ThumbsDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getDateLocale = () => {
    switch (uiLanguage) {
      case "es": return es;
      case "ca": return ca;
      default: return enUS;
    }
  };

  const formatGeneratedDate = (dateString: string) => {
    return format(new Date(dateString), "PPpp", { locale: getDateLocale() });
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "es": return "Español";
      case "ca": return "Català";
      case "en": return "English";
      default: return lang.toUpperCase();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("reviewSummary.error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-review-summary-title">
            <Sparkles className="h-6 w-6 text-primary" />
            {t("reviewSummary.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("reviewSummary.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {restaurants && restaurants.length > 1 && (
            <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="w-[200px]" data-testid="select-restaurant-filter">
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
            <SelectTrigger className="w-[160px]" data-testid="select-summary-language">
              <Languages className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="ca">Català</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px] justify-start text-left font-normal" data-testid="button-start-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? formatDateForDisplay(startDate) : t("reviewSummary.dateRange.fromDate")}
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
                <Button variant="outline" className="w-[140px] justify-start text-left font-normal" data-testid="button-end-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? formatDateForDisplay(endDate) : t("reviewSummary.dateRange.toDate")}
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
                onClick={clearDateRange}
                aria-label={t("reviewSummary.dateRange.clearDates")}
                title={t("reviewSummary.dateRange.clearDates")}
                data-testid="button-clear-dates"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-summary"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("reviewSummary.generating")}
              </>
            ) : summary ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("reviewSummary.regenerate")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("reviewSummary.generate")}
              </>
            )}
          </Button>
        </div>

        {(startDate || endDate) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {startDate && endDate
                ? t("reviewSummary.dateRange.showingReviews")
                    .replace("{startDate}", formatDateForDisplay(startDate))
                    .replace("{endDate}", formatDateForDisplay(endDate))
                : startDate
                  ? `${t("reviewSummary.dateRange.fromDate")}: ${formatDateForDisplay(startDate)}`
                  : `${t("reviewSummary.dateRange.toDate")}: ${formatDateForDisplay(endDate!)}`
              }
            </span>
          </div>
        )}

        {!startDate && !endDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
          </div>
        )}
      </div>

      {!summary ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">{t("reviewSummary.noSummary.title")}</p>
            <p className="text-muted-foreground text-center max-w-md">
              {t("reviewSummary.noSummary.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t("reviewSummary.executiveSummary")}
                </CardTitle>
                {summary.generatedAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatGeneratedDate(summary.generatedAt)}</span>
                    <Badge variant="outline" className="ml-1">
                      {getLanguageLabel(summary.language || summaryLanguage)}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed" data-testid="text-summary">
                {summary.summary}
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{t("reviewSummary.basedOn")} {summary.analyzedCount} {t("reviewSummary.reviews")}</span>
                <span>|</span>
                <span>{t("reviewSummary.totalReviews")}: {summary.reviewCount}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("reviewSummary.overallSentiment")}</CardTitle>
                <CardDescription>{t("reviewSummary.sentimentDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getSentimentBadge(summary.overallSentiment)}>
                    {getSentimentIcon(summary.overallSentiment)}
                    <span className="ml-1 capitalize">{t(`reviewSummary.sentiment.${summary.overallSentiment}`)}</span>
                  </Badge>
                  <span className={`text-2xl font-bold ${getSentimentColor(summary.overallSentiment)}`} data-testid="text-sentiment-score">
                    {summary.sentimentScore}%
                  </span>
                </div>
                <Progress value={summary.sentimentScore} className="h-3" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  {t("reviewSummary.trends.title")}
                </CardTitle>
                <CardDescription>{t("reviewSummary.trends.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.trends.improving.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 mb-1">
                      <TrendingUp className="h-3 w-3" />
                      {t("reviewSummary.trends.improving")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {summary.trends.improving.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-green-50 dark:bg-green-950">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {summary.trends.declining.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 mb-1">
                      <TrendingDown className="h-3 w-3" />
                      {t("reviewSummary.trends.declining")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {summary.trends.declining.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-red-50 dark:bg-red-950">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {summary.trends.consistent.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Minus className="h-3 w-3" />
                      {t("reviewSummary.trends.consistent")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {summary.trends.consistent.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {summary.trends.improving.length === 0 && 
                 summary.trends.declining.length === 0 && 
                 summary.trends.consistent.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("reviewSummary.trends.noData")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  {t("reviewSummary.recommendations.title")}
                </CardTitle>
                <CardDescription>{t("reviewSummary.recommendations.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {summary.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary font-medium">{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("reviewSummary.recommendations.noData")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {summary.keyThemes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("reviewSummary.keyThemes.title")}</CardTitle>
                <CardDescription>{t("reviewSummary.keyThemes.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {summary.keyThemes.map((theme, i) => (
                    <Card key={i} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{theme.theme}</span>
                          <Badge className={getSentimentBadge(theme.sentiment)}>
                            {getSentimentIcon(theme.sentiment)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {t("reviewSummary.keyThemes.mentionedIn")} {theme.count} {t("reviewSummary.reviews")}
                        </p>
                        {theme.examples.length > 0 && (
                          <div className="space-y-1">
                            {theme.examples.slice(0, 2).map((ex, j) => (
                              <p key={j} className="text-xs text-muted-foreground italic truncate">
                                "{ex}"
                              </p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
