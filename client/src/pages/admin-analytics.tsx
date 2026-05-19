import { useQuery } from "@tanstack/react-query";
import { AdminAnalyticsLayout } from "@/components/admin-analytics-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, CreditCard, MessageSquare, Star, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OverviewMetrics {
  totalSignups: number;
  activePayingCustomers: number;
  totalAiReplies: number;
  averageRating: number;
  signupsChange: number;
  customersChange: number;
  repliesChange: number;
}

interface ChartDataPoint {
  date: string;
  signups: number;
  replies: number;
}

interface OverviewResponse {
  success: boolean;
  metrics: OverviewMetrics;
  chartData: ChartDataPoint[];
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  format = "number",
  testId,
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  format?: "number" | "currency" | "rating";
  testId?: string;
}) {
  const formattedValue =
    format === "currency"
      ? `€${value.toLocaleString()}`
      : format === "rating"
        ? value.toFixed(1)
        : value.toLocaleString();

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId ? `${testId}-value` : undefined}>{formattedValue}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={change >= 0 ? "text-emerald-500" : "text-red-500"}>
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
            <span className="ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { data, isLoading, error } = useQuery<OverviewResponse>({
    queryKey: ["/api/admin/analytics/overview"],
  });

  if (isLoading) {
    return (
      <AdminAnalyticsLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
        </div>
      </AdminAnalyticsLayout>
    );
  }

  if (error || !data?.success) {
    return (
      <AdminAnalyticsLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Failed to load analytics data</p>
        </div>
      </AdminAnalyticsLayout>
    );
  }

  const { metrics, chartData } = data;

  const formattedChartData = chartData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <AdminAnalyticsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Analytics Overview
          </h1>
          <p className="text-muted-foreground">
            Key performance indicators for HolaRevi platform
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Signups"
            value={metrics.totalSignups}
            change={metrics.signupsChange}
            icon={Users}
            testId="card-metric-signups"
          />
          <MetricCard
            title="Active Paying Customers"
            value={metrics.activePayingCustomers}
            change={metrics.customersChange}
            icon={CreditCard}
            testId="card-metric-customers"
          />
          <MetricCard
            title="Total AI Replies"
            value={metrics.totalAiReplies}
            change={metrics.repliesChange}
            icon={MessageSquare}
            testId="card-metric-replies"
          />
          <MetricCard
            title="Average Rating"
            value={metrics.averageRating}
            icon={Star}
            format="rating"
            testId="card-metric-rating"
          />
        </div>

        <Card data-testid="card-chart-signups-replies">
          <CardHeader>
            <CardTitle>Signups & AI Replies (Last 30 Days)</CardTitle>
            <CardDescription>
              Daily trend of new user signups and AI-generated replies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="signups"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Signups"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="replies"
                    stroke="hsl(142.1, 76.2%, 36.3%)"
                    strokeWidth={2}
                    dot={false}
                    name="AI Replies"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminAnalyticsLayout>
  );
}
