import { useQuery } from "@tanstack/react-query";
import { AdminAnalyticsLayout } from "@/components/admin-analytics-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Eye, UserPlus, TrendingUp, TrendingDown, Percent } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrafficMetrics {
  dailyVisits: number;
  weeklyVisits: number;
  dailySignups: number;
  weeklySignups: number;
  conversionRate: number;
  visitsChange: number;
  signupsChange: number;
}

interface VisitDataPoint {
  date: string;
  visits: number;
  signups: number;
}

interface TrafficResponse {
  success: boolean;
  metrics: TrafficMetrics;
  chartData: VisitDataPoint[];
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  suffix = "",
  testId,
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  suffix?: string;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId ? `${testId}-value` : undefined}>
          {typeof value === "number" ? value.toLocaleString() : value}
          {suffix}
        </div>
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
            <span className="ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsTraffic() {
  const { data, isLoading, error } = useQuery<TrafficResponse>({
    queryKey: ["/api/admin/analytics/traffic"],
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
          <p className="text-destructive">Failed to load traffic data</p>
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
            Traffic Analytics
          </h1>
          <p className="text-muted-foreground">
            Website visits and signup conversion metrics
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Daily Visits"
            value={metrics.dailyVisits}
            change={metrics.visitsChange}
            icon={Eye}
            testId="card-metric-daily-visits"
          />
          <MetricCard
            title="Weekly Visits"
            value={metrics.weeklyVisits}
            icon={Eye}
            testId="card-metric-weekly-visits"
          />
          <MetricCard
            title="Daily Signups"
            value={metrics.dailySignups}
            change={metrics.signupsChange}
            icon={UserPlus}
            testId="card-metric-daily-signups"
          />
          <MetricCard
            title="Weekly Signups"
            value={metrics.weeklySignups}
            icon={UserPlus}
            testId="card-metric-weekly-signups"
          />
          <MetricCard
            title="Conversion Rate"
            value={metrics.conversionRate}
            icon={Percent}
            suffix="%"
            testId="card-metric-conversion"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Visits & Signups Over Time</CardTitle>
            <CardDescription>
              Daily breakdown of website traffic and user registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="visits"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorVisits)"
                    name="Visits"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="signups"
                    stroke="hsl(142.1, 76.2%, 36.3%)"
                    fillOpacity={1}
                    fill="url(#colorSignups)"
                    name="Signups"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Wire Real Traffic Data</CardTitle>
            <CardDescription>
              Instructions for implementing actual visit tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Currently using estimated/mock data for visits. To implement real tracking:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a <code className="bg-muted px-1 rounded">page_views</code> table with columns: id, path, referrer, user_agent, created_at</li>
              <li>Add middleware to log page views on each request</li>
              <li>Update <code className="bg-muted px-1 rounded">getTrafficMetrics()</code> in adminAnalytics.ts to query this table</li>
              <li>Consider using a lightweight analytics solution like Plausible or Umami for more detailed tracking</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminAnalyticsLayout>
  );
}
