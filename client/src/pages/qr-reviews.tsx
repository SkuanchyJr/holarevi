import { useState, useRef } from "react";
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
import { useLanguage } from "@/lib/i18n";
import {
  Plus,
  QrCode,
  Download,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  BarChart3,
  Calendar,
  TrendingUp,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { Restaurant, ReviewQrWithStats, ReviewQrScansByDay, GlobalQrAnalytics } from "@shared/schema";

function MiniSparkline({ data }: { data: ReviewQrScansByDay[] }) {
  const last14Days: number[] = [];
  const today = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = data.find(d => d.date === dateStr);
    last14Days.push(dayData?.count || 0);
  }

  const maxValue = Math.max(...last14Days, 1);
  
  return (
    <div className="flex items-end gap-0.5 h-8" title="Scans last 14 days">
      {last14Days.map((value, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/60 rounded-sm min-w-[3px] max-w-[6px]"
          style={{ height: `${Math.max(2, (value / maxValue) * 100)}%` }}
        />
      ))}
    </div>
  );
}

const createQrSchema = z.object({
  restaurantId: z.string().min(1, "Please select a location"),
  name: z.string().optional(),
  googleReviewUrl: z.string().url("Please enter a valid URL"),
});

type CreateQrFormData = z.infer<typeof createQrSchema>;

export default function QRReviews() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [qrDetails, setQrDetails] = useState<{
    qr: ReviewQrWithStats;
    scansByDay: ReviewQrScansByDay[];
  } | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const { data: restaurants, isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: qrsData, isLoading: qrsLoading } = useQuery<{
    success: boolean;
    qrs: ReviewQrWithStats[];
  }>({
    queryKey: ["/api/review-qrs"],
  });

  const { data: analyticsData } = useQuery<{
    success: boolean;
    analytics: GlobalQrAnalytics;
  }>({
    queryKey: ["/api/review-qrs/analytics"],
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
      const res = await apiRequest("POST", "/api/review-qrs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/review-qrs"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: t("qrReviews.created"),
        description: t("qrReviews.createdDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("qrReviews.createError"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/review-qrs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/review-qrs"] });
      toast({
        title: t("qrReviews.deleted"),
        description: t("qrReviews.deletedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("qrReviews.deleteError"),
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/review-qrs/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/review-qrs"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateQrFormData) => {
    createMutation.mutate(data);
  };

  const handleViewQr = async (qr: ReviewQrWithStats) => {
    try {
      const res = await fetch(`/api/review-qrs/${qr.id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setQrDetails({ qr: data.qr, scansByDay: data.scansByDay });
        setViewDialogOpen(true);
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("qrReviews.createError"),
        variant: "destructive",
      });
    }
  };

  const getQrUrl = (qrId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/r/${qrId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("qrReviews.copied"),
      description: t("qrReviews.copiedDesc"),
    });
  };

  const downloadQrAsPng = (qrId: string, name: string) => {
    const canvas = document.getElementById(`qr-canvas-${qrId}`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `qr-${name || qrId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  const downloadQrAsSvg = (qrId: string, name: string) => {
    const svg = document.getElementById(`qr-svg-${qrId}`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const link = document.createElement("a");
      link.download = `qr-${name || qrId}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  const qrs = qrsData?.qrs || [];
  const analytics = analyticsData?.analytics;
  const isLoading = restaurantsLoading || qrsLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {t("qrReviews.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("qrReviews.description")}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-qr">
              <Plus className="h-4 w-4 mr-2" />
              {t("qrReviews.createQr")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("qrReviews.createQr")}</DialogTitle>
              <DialogDescription>
                {t("qrReviews.createDescription")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="restaurantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("qrReviews.selectLocation")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-restaurant">
                            <SelectValue placeholder={t("qrReviews.selectLocationPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {restaurants?.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
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
                      <FormLabel>{t("qrReviews.qrName")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("qrReviews.qrNamePlaceholder")}
                          data-testid="input-qr-name"
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
                      <FormLabel>{t("qrReviews.googleReviewUrl")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://g.page/r/..."
                          data-testid="input-google-url"
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
                    {t("common.create")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {analytics && qrs.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("qrReviews.totalScans")}</p>
                  <p className="text-2xl font-bold" data-testid="text-total-scans">{analytics.totalScans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("qrReviews.scansToday")}</p>
                  <p className="text-2xl font-bold" data-testid="text-scans-today">{analytics.scansToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("qrReviews.scansLast7Days")}</p>
                  <p className="text-2xl font-bold" data-testid="text-scans-7days">{analytics.scansLast7Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t("qrReviews.scansLast30Days")}</p>
                  <p className="text-2xl font-bold" data-testid="text-scans-30days">{analytics.scansLast30Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
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
      ) : qrs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t("qrReviews.noQrs")}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t("qrReviews.noQrsDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qrs.map((qr) => (
            <Card key={qr.id} className={!qr.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate" data-testid={`text-qr-name-${qr.id}`}>
                      {qr.name || t("qrReviews.untitled")}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {qr.restaurantName}
                    </CardDescription>
                  </div>
                  <Badge variant={qr.isActive ? "default" : "secondary"}>
                    {qr.isActive ? t("qrReviews.active") : t("qrReviews.inactive")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center py-2">
                  <div className="bg-white p-3 rounded-lg">
                    <QRCodeSVG
                      id={`qr-svg-${qr.id}`}
                      value={getQrUrl(qr.id)}
                      size={120}
                      level="M"
                    />
                    <QRCodeCanvas
                      id={`qr-canvas-${qr.id}`}
                      value={getQrUrl(qr.id)}
                      size={120}
                      level="M"
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span data-testid={`text-scan-count-${qr.id}`}>
                      {qr.scanCount} {t("qrReviews.scans")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {qr.lastScanDate 
                        ? format(new Date(qr.lastScanDate), "dd/MM/yyyy")
                        : t("qrReviews.noScansYet")}
                    </span>
                  </div>
                </div>

                {qr.scansByDay && qr.scansByDay.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">{t("qrReviews.last14Days")}</p>
                    <MiniSparkline data={qr.scansByDay} />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewQr(qr)}
                    data-testid={`button-view-qr-${qr.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t("qrReviews.view")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getQrUrl(qr.id))}
                    data-testid={`button-copy-url-${qr.id}`}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {t("qrReviews.copyLink")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActiveMutation.mutate({ id: qr.id, isActive: !qr.isActive })}
                    data-testid={`button-toggle-active-${qr.id}`}
                  >
                    {qr.isActive ? (
                      <EyeOff className="h-4 w-4 mr-1" />
                    ) : (
                      <Eye className="h-4 w-4 mr-1" />
                    )}
                    {qr.isActive ? t("qrReviews.deactivate") : t("qrReviews.activate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(qr.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-qr-${qr.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
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
                <DialogTitle>{qrDetails.qr.name || t("qrReviews.untitled")}</DialogTitle>
                <DialogDescription>
                  {qrDetails.qr.restaurantName}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <div id={`qr-detail-canvas-${qrDetails.qr.id}`} className="hidden">
                  <QRCodeCanvas value={getQrUrl(qrDetails.qr.id)} size={512} />
                </div>
                <QRCodeSVG
                  id={`qr-detail-svg-${qrDetails.qr.id}`}
                  value={getQrUrl(qrDetails.qr.id)}
                  size={200}
                />
                <div className="flex items-center gap-2 mt-4">
                  <Input
                    readOnly
                    value={getQrUrl(qrDetails.qr.id)}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getQrUrl(qrDetails.qr.id))}
                    data-testid="button-copy-link-modal"
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
                    data-testid="button-download-png"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("qrReviews.downloadPng")}
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
                    data-testid="button-download-svg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("qrReviews.downloadSvg")}
                  </Button>
                </div>
              </div>
              {qrDetails.scansByDay.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("qrReviews.recentScans")}
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {qrDetails.scansByDay.map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{format(new Date(day.date), "MMM d, yyyy")}</span>
                        <Badge variant="secondary">{day.count} {t("qrReviews.scans")}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
