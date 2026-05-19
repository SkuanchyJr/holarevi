import { useQuery } from "@tanstack/react-query";
import { AdminAnalyticsLayout } from "@/components/admin-analytics-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, MapPin, MessageSquare, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

interface LocationMetrics {
  id: string;
  name: string;
  totalReviews: number;
  aiReplies: number;
  averageRating: number;
  avgResponseTimeHours: number;
  ownerEmail: string;
}

interface LocationsResponse {
  success: boolean;
  locations: LocationMetrics[];
}

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return "text-emerald-500";
  if (rating >= 4.0) return "text-green-500";
  if (rating >= 3.5) return "text-yellow-500";
  if (rating >= 3.0) return "text-orange-500";
  return "text-red-500";
}

function getResponseTimeColor(hours: number): string {
  if (hours <= 2) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  if (hours <= 6) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (hours <= 12) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  if (hours <= 24) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

export default function AdminAnalyticsLocations() {
  const { data, isLoading, error } = useQuery<LocationsResponse>({
    queryKey: ["/api/admin/analytics/locations"],
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
          <p className="text-destructive">Failed to load location data</p>
        </div>
      </AdminAnalyticsLayout>
    );
  }

  const { locations } = data;

  const chartData = locations.slice(0, 10).map((loc) => ({
    name: loc.name.length > 20 ? loc.name.substring(0, 20) + "..." : loc.name,
    reviews: loc.totalReviews,
    replies: loc.aiReplies,
    rating: loc.averageRating,
  }));

  const totalReviews = locations.reduce((sum, loc) => sum + loc.totalReviews, 0);
  const totalReplies = locations.reduce((sum, loc) => sum + loc.aiReplies, 0);
  const avgRating =
    locations.length > 0
      ? locations.reduce((sum, loc) => sum + loc.averageRating, 0) / locations.length
      : 0;
  const avgResponseTime =
    locations.length > 0
      ? locations.reduce((sum, loc) => sum + loc.avgResponseTimeHours, 0) / locations.length
      : 0;

  return (
    <AdminAnalyticsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Locations Performance
          </h1>
          <p className="text-muted-foreground">
            Review and reply metrics by connected business location
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-metric-locations">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Locations
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="card-metric-locations-value">{locations.length}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-total-reviews">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reviews
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="card-metric-total-reviews-value">{totalReviews.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-ai-replies">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Replies Sent
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="card-metric-ai-replies-value">{totalReplies.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {totalReviews > 0
                  ? `${((totalReplies / totalReviews) * 100).toFixed(1)}% response rate`
                  : "No reviews yet"}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-response-time">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="card-metric-response-time-value">{avgResponseTime.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                Avg rating: {avgRating.toFixed(1)} stars
              </p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-chart-top-locations">
          <CardHeader>
            <CardTitle>Top 10 Locations by Reviews</CardTitle>
            <CardDescription>
              Comparison of reviews received vs AI replies sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]" data-testid="chart-container-top-locations">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="reviews" fill="hsl(var(--muted-foreground))" name="Reviews" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="replies" fill="hsl(var(--primary))" name="AI Replies" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-table-locations">
          <CardHeader>
            <CardTitle>All Locations</CardTitle>
            <CardDescription>
              Detailed performance metrics for each connected location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table data-testid="table-locations">
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Reviews</TableHead>
                    <TableHead className="text-right">AI Replies</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Avg Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No locations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    locations.map((loc) => (
                      <TableRow key={loc.id} data-testid={`row-location-${loc.id}`}>
                        <TableCell className="font-medium">{loc.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {loc.ownerEmail}
                        </TableCell>
                        <TableCell className="text-right">{loc.totalReviews}</TableCell>
                        <TableCell className="text-right">{loc.aiReplies}</TableCell>
                        <TableCell className="text-right">
                          <span className={getRatingColor(loc.averageRating)}>
                            {loc.averageRating.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className={getResponseTimeColor(loc.avgResponseTimeHours)}>
                            {loc.avgResponseTimeHours}h
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminAnalyticsLayout>
  );
}
