import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
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
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

function MiniSparkline({ data }: { data: ReviewQrScansByDay[] }) {
  const last14: number[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const found = data.find((x) => x.date === dateStr);
    last14.push(found?.count || 0);
  }
  const max = Math.max(...last14, 1);
  return (
    <div className="flex items-end gap-0.5 h-7">
      {last14.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/50 rounded-sm min-w-[3px]"
          style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
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
  const [qrDetails, setQrDetails] = useState<{ qr: ReviewQrWithStats; scansByDay: ReviewQrScansByDay[] } | null>(null);

  const { data: restaurants } = useQuery<Restaurant[]>({ queryKey: ["/api/restaurants"] });

  const { data: qrsData, isLoading: qrsLoading } = useQuery<{ success: boolean; qrs: ReviewQrWithStats[] }>({
    queryKey: ["/api/review-qrs"],
  });

  const { data: analyticsData } = useQuery<{ success: boolean; analytics: GlobalQrAnalytics }>({
    queryKey: ["/api/review-qrs/analytics"],
  });

  const form = useForm<CreateQrFormData>({
    resolver: zodResolver(createQrSchema),
    defaultValues: { restaurantId: "", name: "", googleReviewUrl: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateQrFormData) => (await apiRequest("POST", "/api/review-qrs", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/review-qrs"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({ title: t("qrReviews.created"), description: t("qrReviews.createdDesc") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message || t("qrReviews.createError"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/review-qrs/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/review-qrs"] });
      toast({ title: t("qrReviews.deleted"), description: t("qrReviews.deletedDesc") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message || t("qrReviews.deleteError"), variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await apiRequest("PATCH", `/api/review-qrs/${id}`, { isActive })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/review-qrs"] }),
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const getQrUrl = (id: string) => `${window.location.origin}/r/${id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("qrReviews.copied"), description: t("qrReviews.copiedDesc") });
  };

  const handleViewQr = async (qr: ReviewQrWithStats) => {
    try {
      const res = await fetch(`/api/review-qrs/${qr.id}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setQrDetails({ qr: data.qr, scansByDay: data.scansByDay });
        setViewDialogOpen(true);
      }
    } catch {
      toast({ title: t("common.error"), description: t("qrReviews.createError"), variant: "destructive" });
    }
  };

  const qrs = qrsData?.qrs || [];
  const analytics = analyticsData?.analytics;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <PageHeader
        title={t("qrReviews.title")}
        subtitle={t("qrReviews.description")}
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-qr">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("qrReviews.createQr")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("qrReviews.createQr")}</DialogTitle>
                <DialogDescription>{t("qrReviews.createDescription")}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 pt-2">
                  <FormField control={form.control} name="restaurantId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("qrReviews.selectLocation")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-restaurant">
                            <SelectValue placeholder={t("qrReviews.selectLocationPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {restaurants?.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("qrReviews.qrName")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("qrReviews.qrNamePlaceholder")} data-testid="input-qr-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="googleReviewUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("qrReviews.googleReviewUrl")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://g.page/r/..." data-testid="input-google-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-qr">
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("common.create")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Analytics strip */}
      {analytics && qrs.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("qrReviews.totalScans")}
            value={analytics.totalScans}
            icon={<BarChart3 className="h-4 w-4" />}
            iconClassName="bg-primary/10 text-primary"
            data-testid="text-total-scans"
          />
          <StatCard
            title={t("qrReviews.scansToday")}
            value={analytics.scansToday}
            icon={<Clock className="h-4 w-4" />}
            iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
            data-testid="text-scans-today"
          />
          <StatCard
            title={t("qrReviews.scansLast7Days")}
            value={analytics.scansLast7Days}
            icon={<TrendingUp className="h-4 w-4" />}
            iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            data-testid="text-scans-7days"
          />
          <StatCard
            title={t("qrReviews.scansLast30Days")}
            value={analytics.scansLast30Days}
            icon={<Calendar className="h-4 w-4" />}
            iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
            data-testid="text-scans-30days"
          />
        </div>
      )}

      {/* QR grid */}
      {qrsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : qrs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={<QrCode className="h-5 w-5" />}
            title={t("qrReviews.noQrs")}
            description={t("qrReviews.noQrsDescription")}
            action={
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("qrReviews.createQr")}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {qrs.map((qr) => (
            <div
              key={qr.id}
              className={cn(
                "rounded-xl border border-border bg-card overflow-hidden",
                !qr.isActive && "opacity-60"
              )}
            >
              {/* Status strip */}
              <div className={cn("h-1 w-full", qr.isActive ? "bg-primary" : "bg-muted")} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate" data-testid={`text-qr-name-${qr.id}`}>
                      {qr.name || t("qrReviews.untitled")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{qr.restaurantName}</p>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                    qr.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {qr.isActive ? t("qrReviews.active") : t("qrReviews.inactive")}
                  </span>
                </div>

                {/* QR code */}
                <div className="flex justify-center py-3 bg-white rounded-lg mb-3">
                  <QRCodeSVG
                    id={`qr-svg-${qr.id}`}
                    value={getQrUrl(qr.id)}
                    size={100}
                    level="M"
                  />
                  <QRCodeCanvas
                    id={`qr-canvas-${qr.id}`}
                    value={getQrUrl(qr.id)}
                    size={100}
                    level="M"
                    style={{ display: "none" }}
                  />
                </div>

                {/* Scan stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    <span data-testid={`text-scan-count-${qr.id}`}>{qr.scanCount} {t("qrReviews.scans")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {qr.lastScanDate
                      ? format(new Date(qr.lastScanDate), "dd/MM/yy")
                      : t("qrReviews.noScansYet")
                    }
                  </span>
                </div>

                {/* Sparkline */}
                {qr.scansByDay && qr.scansByDay.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-muted-foreground mb-1">{t("qrReviews.last14Days")}</p>
                    <MiniSparkline data={qr.scansByDay} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleViewQr(qr)}
                    data-testid={`button-view-qr-${qr.id}`}
                  >
                    <Eye className="h-3 w-3" />
                    {t("qrReviews.view")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => copyToClipboard(getQrUrl(qr.id))}
                    data-testid={`button-copy-url-${qr.id}`}
                  >
                    <Copy className="h-3 w-3" />
                    {t("qrReviews.copyLink")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => toggleActiveMutation.mutate({ id: qr.id, isActive: !qr.isActive })}
                    data-testid={`button-toggle-active-${qr.id}`}
                  >
                    {qr.isActive
                      ? <><EyeOff className="h-3 w-3" />{t("qrReviews.deactivate")}</>
                      : <><Eye className="h-3 w-3" />{t("qrReviews.activate")}</>
                    }
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive ml-auto"
                    onClick={() => deleteMutation.mutate(qr.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-qr-${qr.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View QR Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-sm">
          {qrDetails && (
            <>
              <DialogHeader>
                <DialogTitle>{qrDetails.qr.name || t("qrReviews.untitled")}</DialogTitle>
                <DialogDescription>{qrDetails.qr.restaurantName}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG
                    id={`qr-detail-svg-${qrDetails.qr.id}`}
                    value={getQrUrl(qrDetails.qr.id)}
                    size={180}
                  />
                  <div id={`qr-detail-canvas-${qrDetails.qr.id}`} className="hidden">
                    <QRCodeCanvas value={getQrUrl(qrDetails.qr.id)} size={512} />
                  </div>
                </div>

                <div className="flex w-full items-center gap-2">
                  <Input readOnly value={getQrUrl(qrDetails.qr.id)} className="text-xs h-8" />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(getQrUrl(qrDetails.qr.id))}
                    data-testid="button-copy-link-modal"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => {
                      const canvas = document.querySelector(`#qr-detail-canvas-${qrDetails.qr.id} canvas`) as HTMLCanvasElement;
                      if (canvas) {
                        const link = document.createElement("a");
                        link.download = `qr-${qrDetails.qr.name || qrDetails.qr.id}.png`;
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                      }
                    }}
                    data-testid="button-download-png"
                  >
                    <Download className="h-3 w-3" />
                    {t("qrReviews.downloadPng")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => {
                      const svg = document.getElementById(`qr-detail-svg-${qrDetails.qr.id}`) as SVGElement;
                      if (svg) {
                        const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
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
                    <Download className="h-3 w-3" />
                    {t("qrReviews.downloadSvg")}
                  </Button>
                </div>
              </div>

              {qrDetails.scansByDay.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {t("qrReviews.recentScans")}
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {qrDetails.scansByDay.map((day) => (
                      <div key={day.date} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{format(new Date(day.date), "MMM d, yyyy")}</span>
                        <span className="font-medium text-foreground bg-muted px-2 py-0.5 rounded-full">
                          {day.count} {t("qrReviews.scans")}
                        </span>
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
