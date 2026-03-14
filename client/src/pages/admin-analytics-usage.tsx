import { useQuery } from "@tanstack/react-query";
import { AdminAnalyticsLayout } from "@/components/admin-analytics-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, MessageSquare, Zap, Clock, CheckCircle2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UsageMetrics {
  totalReviewsThisMonth: number;
  autoRepliedPercentage: number;
  manualRepliedPercentage: number;
  pendingPercentage: number;
  avgResponseTimeHours: number;
}

interface DailyUsageDataPoint {
  date: string;
  reviewsReceived: number;
  autoReplies: number;
  manualReplies: number;
}

interface UsageResponse {
  success: boolean;
  metrics: UsageMetrics;
  chartData: DailyUsageDataPoint[];
}

const PIE_COLORS = {
  auto: "hsl(142.1, 76.2%, 36.3%)",
  manual: "hsl(var(--primary))",
  pending: "hsl(var(--muted-foreground))",
};

export default function AdminAnalyticsUsage() {
  const { data, isLoading, error } = useQuery<UsageResponse>({
    queryKey: ["/api/admin/analytics/usage"],
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
          <p className="text-destructive">Failed to load usage data</p>
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

  const pieData = [
    { name: "Auto Replies", value: metrics.autoRepliedPercentage, color: PIE_COLORS.auto },
    { name: "Manual Replies", value: metrics.manualRepliedPercentage, color: PIE_COLORS.manual },
    { name: "Pending", value: metrics.pendingPercentage, color: PIE_COLORS.pending },
  ];

  const totalAutoReplies = chartData.reduce((sum, d) => sum + d.autoReplies, 0);
  const totalManualReplies = chartData.reduce((sum, d) => sum + d.manualReplies, 0);
  const totalReviewsReceived = chartData.reduce((sum, d) => sum + d.reviewsReceived, 0);

  return (
    <AdminAnalyticsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Product Usage
          </h1>
          <p className="text-muted-foreground">
            Review processing and AI reply automation metrics
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-metric-reviews-month">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reviews This Month
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="card-metric-reviews-month-value">{metrics.totalReviewsThisMonth.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-auto-rate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Auto Reply Rate
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500" data-testid="card-metric-auto-rate-value">
                {metrics.autoRepliedPercentage}%
              </div>
              <Progress value={metrics.autoRepliedPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card data-testid="card-metric-manual-approvals">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Manual Approvals
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="card-metric-manual-approvals-value">{metrics.manualRepliedPercentage}%</div>
              <Progress value={metrics.manualRepliedPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card data-testid="card-metric-usage-response-time">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="card-metric-usage-response-time-value">{metrics.avgResponseTimeHours}h</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" data-testid="card-chart-activity">
            <CardHeader>
              <CardTitle>Daily Reply Activity (Last 30 Days)</CardTitle>
              <CardDescription>
                Breakdown of reviews received and replies sent (auto vs manual)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]" data-testid="chart-container-activity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedChartData}>
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142.1, 76.2%, 36.3%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="reviewsReceived"
                      stroke="hsl(var(--muted-foreground))"
                      fillOpacity={1}
                      fill="url(#colorReceived)"
                      name="Reviews Received"
                    />
                    <Area
                      type="monotone"
                      dataKey="autoReplies"
                      stroke="hsl(142.1, 76.2%, 36.3%)"
                      fillOpacity={1}
                      fill="url(#colorAuto)"
                      name="Auto Replies"
                    />
                    <Area
                      type="monotone"
                      dataKey="manualReplies"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorManual)"
                      name="Manual Replies"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-chart-distribution">
            <CardHeader>
              <CardTitle>Reply Distribution</CardTitle>
              <CardDescription>
                Breakdown by reply type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]" data-testid="chart-container-distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, ""]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-table-usage">
          <CardHeader>
            <CardTitle>Daily Usage Summary</CardTitle>
            <CardDescription>
              Day-by-day breakdown of reviews and replies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table data-testid="table-usage">
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Reviews Received</TableHead>
                    <TableHead className="text-right">Auto Replies</TableHead>
                    <TableHead className="text-right">Manual Replies</TableHead>
                    <TableHead className="text-right">Auto Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.slice().reverse().map((day, index) => {
                    const totalReplies = day.autoReplies + day.manualReplies;
                    const autoRatio = totalReplies > 0 
                      ? ((day.autoReplies / totalReplies) * 100).toFixed(0)
                      : "0";
                    return (
                      <TableRow key={day.date} data-testid={`row-usage-${index}`}>
                        <TableCell className="font-medium">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">{day.reviewsReceived}</TableCell>
                        <TableCell className="text-right text-emerald-500">{day.autoReplies}</TableCell>
                        <TableCell className="text-right text-primary">{day.manualReplies}</TableCell>
                        <TableCell className="text-right">{autoRatio}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Reviews (30d)</div>
            <div className="text-2xl font-bold mt-1">{totalReviewsReceived.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Auto Replies (30d)</div>
            <div className="text-2xl font-bold mt-1 text-emerald-500">{totalAutoReplies.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Manual Replies (30d)</div>
            <div className="text-2xl font-bold mt-1 text-primary">{totalManualReplies.toLocaleString()}</div>
          </Card>
        </div>
      </div>
    </AdminAnalyticsLayout>
  );
}
