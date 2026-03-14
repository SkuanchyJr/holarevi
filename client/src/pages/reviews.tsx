import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Check,
  X,
  RefreshCw,
  MessageSquare,
  Loader2,
  Sparkles,
  ArrowUpDown,
  Filter,
  Store,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { cleanGoogleTranslationLabels, cn } from "@/lib/utils";
import type { ReviewWithRestaurant, Restaurant } from "@shared/schema";
import { ReplyUsageCard, useReplyUsage } from "@/components/reply-usage-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  posted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  dismissed: "bg-muted text-muted-foreground",
};

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  neutral: "bg-muted text-muted-foreground",
};

function ReviewCard({
  review,
  onApprove,
  onDismiss,
  onRegenerate,
  onViewDetails,
  isRegenerating,
  isLimitReached,
  t,
}: {
  review: ReviewWithRestaurant;
  onApprove: () => void;
  onDismiss: () => void;
  onRegenerate: () => void;
  onViewDetails: () => void;
  isRegenerating?: boolean;
  isLimitReached?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-border/80 transition-colors">
      {/* Card header */}
      <div className="px-4 py-3.5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={review.reviewerPhotoUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-xs bg-muted font-medium">
              {review.reviewerName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-foreground">
                {review.reviewerName || t("reviews.anonymous")}
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Store className="h-2.5 w-2.5" />
                {review.restaurant?.name}
              </span>
              {review.reviewedAt && (
                <>
                  <span>·</span>
                  <span>{new Date(review.reviewedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {review.sentiment && (
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SENTIMENT_STYLES[review.sentiment] || SENTIMENT_STYLES.neutral)}>
              {t(`reviews.sentiment.${review.sentiment}`)}
            </span>
          )}
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[review.replyStatus || "pending"])}>
            {t(`reviews.status.${review.replyStatus || "pending"}`)}
          </span>
        </div>
      </div>

      {/* Review text */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {cleanGoogleTranslationLabels(review.comment) || (
            <span className="text-muted-foreground italic">{t("reviews.noComment")}</span>
          )}
        </p>
      </div>

      {/* Generated reply preview */}
      {review.generatedReply && review.replyStatus === "pending" && (
        <div className="mx-4 mb-3 rounded-lg bg-primary/5 border border-primary/15 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">{t("reviews.aiGeneratedReply")}</span>
          </div>
          <p className="text-xs text-foreground/70 leading-relaxed line-clamp-3">
            {review.generatedReply}
          </p>
        </div>
      )}

      {/* Posted reply */}
      {review.postedReply && review.replyStatus === "posted" && (
        <div className="mx-4 mb-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">{t("reviews.postedReply")}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{review.postedReply}</p>
        </div>
      )}

      {/* Action bar */}
      {review.replyStatus === "pending" && (
        <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={onApprove}
            disabled={isLimitReached}
            data-testid={`button-approve-${review.id}`}
          >
            <Check className="h-3 w-3" />
            {t("reviews.actions.approvePost")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onViewDetails}
            data-testid={`button-edit-${review.id}`}
          >
            {t("reviews.actions.editReply")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1.5"
            onClick={onRegenerate}
            disabled={isRegenerating}
            data-testid={`button-regenerate-${review.id}`}
          >
            <RefreshCw className={cn("h-3 w-3", isRegenerating && "animate-spin")} />
            {isRegenerating ? t("reviews.actions.regenerating") : t("reviews.actions.regenerate")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground ml-auto"
            onClick={onDismiss}
            data-testid={`button-dismiss-${review.id}`}
          >
            <X className="h-3 w-3" />
            {t("reviews.actions.dismiss")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Reviews() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selectedReview, setSelectedReview] = useState<ReviewWithRestaurant | null>(null);
  const [editedReply, setEditedReply] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRestaurant, setFilterRestaurant] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [regeneratingReviewId, setRegeneratingReviewId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isLimitReached } = useReplyUsage();

  const { data: reviews, isLoading } = useQuery<ReviewWithRestaurant[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      return await apiRequest("POST", `/api/reviews/${reviewId}/approve`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: t("reviews.toasts.replyPosted"), description: t("reviews.toasts.replyPostedDesc") });
      setSelectedReview(null);
    },
    onError: () => {
      toast({ title: t("reviews.toasts.error"), description: t("reviews.toasts.errorPost"), variant: "destructive" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return await apiRequest("POST", `/api/reviews/${reviewId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: t("reviews.toasts.reviewDismissed"), description: t("reviews.toasts.reviewDismissedDesc") });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      setRegeneratingReviewId(reviewId);
      return await apiRequest("POST", `/api/reviews/${reviewId}/regenerate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: t("reviews.toasts.replyRegenerated"), description: t("reviews.toasts.replyRegeneratedDesc") });
      setRegeneratingReviewId(null);
    },
    onError: () => {
      setRegeneratingReviewId(null);
      toast({ title: t("reviews.toasts.error"), description: t("reviews.toasts.errorRegenerate"), variant: "destructive" });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reviews/generate-all");
      return response.json() as Promise<{ generated: number; skipped: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      const desc = data.skipped > 0
        ? t("reviews.toasts.allGeneratedPartial").replace("{generated}", String(data.generated)).replace("{skipped}", String(data.skipped))
        : t("reviews.toasts.allGeneratedDesc").replace("{count}", String(data.generated));
      toast({ title: t("reviews.toasts.allGenerated"), description: desc });
    },
    onError: () => {
      toast({ title: t("reviews.toasts.error"), description: t("reviews.toasts.errorGenerateAll"), variant: "destructive" });
    },
  });

  const handleSyncReviews = async () => {
    if (!filterRestaurant || filterRestaurant === "all") {
      toast({ title: t("reviews.toasts.selectRestaurant"), description: t("reviews.toasts.selectRestaurantDesc"), variant: "destructive" });
      return;
    }
    setIsSyncing(true);
    try {
      const response = await apiRequest("POST", "/api/reviews/resync", { restaurantId: filterRestaurant });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: t("reviews.toasts.syncSuccess"), description: t("reviews.toasts.syncSuccessDesc").replace("{count}", String(data.synced || 0)) });
    } catch {
      toast({ title: t("reviews.toasts.error"), description: t("reviews.toasts.errorSync"), variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredReviews = reviews
    ?.filter((review) => {
      if (filterStatus !== "all" && review.replyStatus !== filterStatus) return false;
      if (filterRestaurant !== "all" && review.restaurantId !== filterRestaurant) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.reviewedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.reviewedAt || b.createdAt || 0).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const pendingCount = reviews?.filter((r) => r.replyStatus === "pending").length || 0;
  const postedCount = reviews?.filter((r) => r.replyStatus === "posted").length || 0;
  const pendingWithoutReplyCount = reviews?.filter(r => r.replyStatus === "pending" && !r.generatedReply).length || 0;

  const handleApprove = (review: ReviewWithRestaurant) => {
    if (review.generatedReply) {
      approveMutation.mutate({ reviewId: review.id, reply: review.generatedReply });
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <PageHeader
        title={t("reviews.title")}
        subtitle={t("reviews.subtitle")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncReviews}
              disabled={isSyncing || filterRestaurant === "all"}
              data-testid="button-sync-reviews"
            >
              {isSyncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
              {isSyncing ? t("reviews.syncing") : t("reviews.syncReviews")}
            </Button>
            {pendingWithoutReplyCount > 0 && (
              <Button
                size="sm"
                onClick={() => generateAllMutation.mutate()}
                disabled={generateAllMutation.isPending || isLimitReached}
                data-testid="button-generate-all"
              >
                {generateAllMutation.isPending
                  ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                }
                {t("reviews.generateAllPending").replace("{count}", String(pendingWithoutReplyCount))}
              </Button>
            )}
          </>
        }
      />

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
          <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs" data-testid="select-filter-restaurant">
            <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={t("reviews.allRestaurants")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("reviews.allRestaurants")}</SelectItem>
            {restaurants?.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(v: "newest" | "oldest") => setSortOrder(v)}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs" data-testid="select-sort-order">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("reviews.sort.newest")}</SelectItem>
            <SelectItem value="oldest">{t("reviews.sort.oldest")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ReplyUsageCard variant="compact" />

      {/* Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-6 px-3" data-testid="tab-all">
            {t("reviews.tabs.all")}
            <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
              {reviews?.length || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs h-6 px-3" data-testid="tab-pending">
            {t("reviews.tabs.pending")}
            {pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="posted" className="text-xs h-6 px-3" data-testid="tab-posted">
            {t("reviews.tabs.posted")}
            {postedCount > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                {postedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="dismissed" className="text-xs h-6 px-3" data-testid="tab-dismissed">
            {t("reviews.tabs.dismissed")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : filteredReviews && filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onApprove={() => handleApprove(review)}
                onDismiss={() => dismissMutation.mutate(review.id)}
                onRegenerate={() => regenerateMutation.mutate(review.id)}
                onViewDetails={() => { setSelectedReview(review); setEditedReply(review.generatedReply || ""); }}
                isRegenerating={regeneratingReviewId === review.id}
                isLimitReached={isLimitReached}
                t={t}
              />
            ))
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState
                icon={<MessageSquare className="h-5 w-5" />}
                title={t("reviews.noReviewsFound")}
                description={filterStatus === "pending" ? t("reviews.allResponded") : t("reviews.noMatchFilters")}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Reply Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("reviews.editDialog.title")}</DialogTitle>
            <DialogDescription>{t("reviews.editDialog.description")}</DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                  {t("reviews.editDialog.originalReview")}
                </label>
                <div className="rounded-lg bg-muted/50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{selectedReview.reviewerName}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("h-3 w-3", i < selectedReview.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{selectedReview.comment}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                  {t("reviews.editDialog.yourReply")}
                </label>
                <Textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  rows={5}
                  placeholder={t("reviews.editDialog.placeholder")}
                  className="resize-none"
                  data-testid="textarea-edit-reply"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (selectedReview) {
                  approveMutation.mutate({ reviewId: selectedReview.id, reply: editedReply });
                }
              }}
              disabled={approveMutation.isPending || !editedReply.trim()}
              data-testid="button-post-reply"
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("reviews.editDialog.postReply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
