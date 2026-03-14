import { useQuery } from "@tanstack/react-query";
import { AdminAnalyticsLayout } from "@/components/admin-analytics-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, CreditCard, TrendingUp, TrendingDown, UserMinus, UserPlus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface BillingMetrics {
  mrr: number;
  mrrChange: number;
  activeSubscriptions: number;
  newSubscriptionsThisMonth: number;
  churnedThisMonth: number;
  churnRate: number;
  planBreakdown: {
    plan: string;
    count: number;
    revenue: number;
  }[];
}

interface MrrDataPoint {
  month: string;
  mrr: number;
}

interface BillingResponse {
  success: boolean;
  metrics: BillingMetrics;
  mrrChart: MrrDataPoint[];
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  format = "number",
  suffix = "",
  testId,
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  format?: "number" | "currency" | "percent";
  suffix?: string;
  testId?: string;
}) {
  const formattedValue =
    format === "currency"
      ? `€${value.toLocaleString()}`
      : format === "percent"
        ? `${value}%`
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
        <div className="text-2xl font-bold" data-testid={testId ? `${testId}-value` : undefined}>
          {formattedValue}
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
            <span className="ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PLAN_COLORS: Record<string, string> = {
  Local: "hsl(142.1, 76.2%, 36.3%)",
  Pro: "hsl(var(--primary))",
  Business: "hsl(38, 92%, 50%)",
  Enterprise: "hsl(262, 83%, 58%)",
};

export default function AdminAnalyticsBilling() {
  const { data, isLoading, error } = useQuery<BillingResponse>({
    queryKey: ["/api/admin/analytics/billing"],
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
          <p className="text-destructive">Failed to load billing data</p>
        </div>
      </AdminAnalyticsLayout>
    );
  }

  const { metrics, mrrChart } = data;

  const pieData = metrics.planBreakdown
    .filter((p) => p.count > 0)
    .map((p) => ({
      name: p.plan,
      value: p.count,
      revenue: p.revenue,
    }));

  return (
    <AdminAnalyticsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Billing & Revenue
          </h1>
          <p className="text-muted-foreground">
            Subscription metrics and revenue tracking
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Monthly Recurring Revenue"
            value={metrics.mrr}
            change={metrics.mrrChange}
            icon={DollarSign}
            format="currency"
            testId="card-metric-mrr"
          />
          <MetricCard
            title="Active Subscriptions"
            value={metrics.activeSubscriptions}
            icon={CreditCard}
            testId="card-metric-subscriptions"
          />
          <MetricCard
            title="New This Month"
            value={metrics.newSubscriptionsThisMonth}
            icon={UserPlus}
            testId="card-metric-new-subs"
          />
          <MetricCard
            title="Churned This Month"
            value={metrics.churnedThisMonth}
            icon={UserMinus}
            testId="card-metric-churned"
          />
          <MetricCard
            title="Churn Rate"
            value={metrics.churnRate}
            icon={TrendingDown}
            format="percent"
            testId="card-metric-churn-rate"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>MRR Evolution (Last 6 Months)</CardTitle>
              <CardDescription>
                Monthly recurring revenue growth over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mrrChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `€${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`€${value.toLocaleString()}`, "MRR"]}
                    />
                    <Bar dataKey="mrr" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscriptions by Plan</CardTitle>
              <CardDescription>
                Distribution of active subscriptions across plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PLAN_COLORS[entry.name] || "hsl(var(--muted))"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string, props) => {
                        const revenue = (props?.payload as { revenue?: number })?.revenue || 0;
                        return [`${value} subs (€${revenue}/mo)`, name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan Breakdown</CardTitle>
            <CardDescription>
              Detailed view of subscriptions and revenue by plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.planBreakdown.map((plan) => (
                <div
                  key={plan.plan}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PLAN_COLORS[plan.plan] || "hsl(var(--muted))" }}
                    />
                    <div>
                      <p className="font-medium">{plan.plan}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.count} active subscriptions
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-base">
                    €{plan.revenue.toLocaleString()}/mo
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminAnalyticsLayout>
  );
}
