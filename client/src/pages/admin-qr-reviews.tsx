import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  QrCode,
  Download,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  BarChart3,
  Calendar,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import type { Restaurant, ReviewQrWithStats, ReviewQrScansByDay, GlobalQrAnalytics } from "@shared/schema";
import { useRef } from "react";

function MiniSparkline({ data }: { data: ReviewQrScansByDay[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-end gap-0.5 h-6" data-testid="sparkline-empty">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-2 h-1 bg-muted rounded-sm" />
        ))}
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const last14 = sortedData.slice(-14);
  const maxCount = Math.max(...last14.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 h-6" data-testid="sparkline">
      {last14.map((day, i) => {
        const height = Math.max((day.count / maxCount) * 100, 10);
        return (
          <div
            key={day.date}
            className="w-2 bg-primary rounded-sm transition-all"
            style={{ height: `${height}%` }}
            title={`${format(new Date(day.date), "MMM d")}: ${day.count} scans`}
          />
        );
      })}
    </div>
  );
}

const createQrSchema = z.object({
  restaurantId: z.string().min(1, "Please select a location"),
  name: z.string().optional(),
  googleReviewUrl: z.string().url("Please enter a valid URL"),
});

type CreateQrFormData = z.infer<typeof createQrSchema>;

export default function AdminQRReviews() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<ReviewQrWithStats | null>(null);
  const [qrDetails, setQrDetails] = useState<{
    qr: ReviewQrWithStats;
    scansByDay: ReviewQrScansByDay[];
  } | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/session", {
        credentials: "include",
      });
      const data = await response.json();

      if (!data.authenticated) {
        setLocation("/admin/login");
        return;
      }
    } catch (err) {
      setLocation("/admin/login");
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/admin/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const { data: restaurants, isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/admin/restaurants"],
    enabled: !isLoading,
  });

  const { data: qrsData, isLoading: qrsLoading } = useQuery<{
    success: boolean;
    qrs: ReviewQrWithStats[];
  }>({
    queryKey: ["/api/admin/review-qrs"],
    enabled: !isLoading,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    success: boolean;
    analytics: GlobalQrAnalytics;
  }>({
    queryKey: ["/api/admin/review-qrs/analytics"],
    enabled: !isLoading,
  });

  const form = useForm<CreateQrFormData>({
    resolver: zodResolver(createQrSchema),
    defaultValues: {
      restaurantId: "",
      name: "",
      googleReviewUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateQrFormData) => {
      const res = await apiRequest("POST", "/api/admin/review-qrs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-qrs"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "QR Created",
        description: "The QR code has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create QR code",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/review-qrs/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-qrs"] });
    },
  });

  const fetchQrDetails = async (qr: ReviewQrWithStats) => {
    try {
      const res = await fetch(`/api/admin/review-qrs/${qr.id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setQrDetails({ qr: data.qr, scansByDay: data.scansByDay });
        setViewDialogOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load QR details",
        variant: "destructive",
      });
    }
  };

  const getRedirectUrl = (qrId: string) => {
    return `${window.location.origin}/r/${qrId}`;
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Link Copied",
      description: "The QR link has been copied to clipboard",
    });
  };

  const downloadQrAsPng = (qrId: string, name: string) => {
    const canvas = document.querySelector(`#qr-canvas-${qrId} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `qr-${name || qrId}.png`;
      link.href = url;
      link.click();
    }
  };

  const downloadQrAsSvg = (qrId: string, name: string) => {
    const svg = document.querySelector(`#qr-svg-${qrId}`) as SVGElement;
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `qr-${name || qrId}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const onSubmit = (data: CreateQrFormData) => {
    createMutation.mutate(data);
  };

  const getRestaurantName = (restaurantId: string) => {
    return restaurants?.find((r) => r.id === restaurantId)?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-title">
                QR Reviews
              </h1>
              <p className="text-sm text-muted-foreground">
                Create and track Google Reviews QR codes
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {analyticsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card data-testid="card-total-scans">
                <CardHeader className="pb-2">
                  <CardDescription>Total Scans</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData?.analytics?.totalScans?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-scans-today">
                <CardHeader className="pb-2">
                  <CardDescription>Today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData?.analytics?.scansToday?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-scans-7days">
                <CardHeader className="pb-2">
                  <CardDescription>Last 7 Days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData?.analytics?.scansLast7Days?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-scans-30days">
                <CardHeader className="pb-2">
                  <CardDescription>Last 30 Days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData?.analytics?.scansLast30Days?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-muted-foreground">
              Manage QR codes that redirect customers to leave Google reviews
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-qr">
                <Plus className="h-4 w-4 mr-2" />
                Create QR
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create QR Code</DialogTitle>
                <DialogDescription>
                  Create a new QR code that will redirect customers to leave a Google review
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="restaurantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {restaurants?.map((restaurant) => (
                              <SelectItem key={restaurant.id} value={restaurant.id}>
                                {restaurant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>QR Name (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Table 5, Reception"
                            data-testid="input-qr-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="googleReviewUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Review URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://g.page/r/..."
                            data-testid="input-google-url"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-qr"
                    >
                      {createMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {qrsLoading || restaurantsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-32 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : qrsData?.qrs?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No QR codes</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first QR code to start collecting Google reviews easily
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {qrsData?.qrs?.map((qr) => (
              <Card key={qr.id} className={!qr.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {qr.name || "Untitled"}
                      </CardTitle>
                      <CardDescription>
                        {getRestaurantName(qr.restaurantId)}
                      </CardDescription>
                    </div>
                    <Badge variant={qr.isActive ? "default" : "secondary"}>
                      {qr.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <div id={`qr-canvas-${qr.id}`} className="hidden">
                        <QRCodeCanvas value={getRedirectUrl(qr.id)} size={256} />
                      </div>
                      <div id={`qr-svg-${qr.id}`}>
                        <QRCodeSVG value={getRedirectUrl(qr.id)} size={80} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{qr.scanCount || 0} scans</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {qr.lastScanDate 
                            ? `Last: ${format(new Date(qr.lastScanDate), "MMM d, yyyy")}`
                            : "No scans yet"}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Last 14 days</div>
                        <MiniSparkline data={qr.scansByDay || []} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchQrDetails(qr)}
                      data-testid={`button-view-${qr.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getRedirectUrl(qr.id))}
                      data-testid={`button-copy-${qr.id}`}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant={qr.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: qr.id,
                          isActive: !qr.isActive,
                        })
                      }
                      data-testid={`button-toggle-${qr.id}`}
                    >
                      {qr.isActive ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Restore
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            {qrDetails && (
              <>
                <DialogHeader>
                  <DialogTitle>{qrDetails.qr.name || "Untitled"}</DialogTitle>
                  <DialogDescription>
                    {getRestaurantName(qrDetails.qr.restaurantId)}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center py-4">
                  <div id={`qr-detail-canvas-${qrDetails.qr.id}`} className="hidden">
                    <QRCodeCanvas value={getRedirectUrl(qrDetails.qr.id)} size={512} />
                  </div>
                  <QRCodeSVG
                    id={`qr-detail-svg-${qrDetails.qr.id}`}
                    value={getRedirectUrl(qrDetails.qr.id)}
                    size={200}
                  />
                  <div className="flex items-center gap-2 mt-4">
                    <Input
                      readOnly
                      value={getRedirectUrl(qrDetails.qr.id)}
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(getRedirectUrl(qrDetails.qr.id))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const canvas = document.querySelector(
                          `#qr-detail-canvas-${qrDetails.qr.id} canvas`
                        ) as HTMLCanvasElement;
                        if (canvas) {
                          const url = canvas.toDataURL("image/png");
                          const link = document.createElement("a");
                          link.download = `qr-${qrDetails.qr.name || qrDetails.qr.id}.png`;
                          link.href = url;
                          link.click();
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PNG
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const svg = document.querySelector(
                          `#qr-detail-svg-${qrDetails.qr.id}`
                        ) as SVGElement;
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const blob = new Blob([svgData], { type: "image/svg+xml" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.download = `qr-${qrDetails.qr.name || qrDetails.qr.id}.svg`;
                          link.href = url;
                          link.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download SVG
                    </Button>
                  </div>
                </div>
                {qrDetails.scansByDay.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Recent Scans
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {qrDetails.scansByDay.map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{format(new Date(day.date), "MMM d, yyyy")}</span>
                          <Badge variant="secondary">{day.count} scans</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
