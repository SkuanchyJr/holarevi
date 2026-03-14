import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Filter,
  Loader2,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { cleanGoogleTranslationLabels } from "@/lib/utils";
import type { ReviewWithRestaurant, Restaurant } from "@shared/schema";
import { ReplyUsageCard, useReplyUsage } from "@/components/reply-usage-card";

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
  const sentimentColor = {
    positive: "text-green-600 bg-green-50 dark:bg-green-900/20",
    negative: "text-red-600 bg-red-50 dark:bg-red-900/20",
    neutral: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  };

  const statusColor = {
    pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    approved: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    posted: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    dismissed: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  const getSentimentLabel = (sentiment: string) => {
    const key = `reviews.sentiment.${sentiment}`;
    return t(key);
  };

  const getStatusLabel = (status: string) => {
    const key = `reviews.status.${status}`;
    return t(key);
  };

  const getLanguageLabel = (lang: string) => {
    const key = `reviews.languages.${lang}`;
    return t(key);
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
              <AvatarImage src={review.reviewerPhotoUrl || undefined} className="object-cover" />
              <AvatarFallback>
                {review.reviewerName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{review.reviewerName || t("reviews.anonymous")}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                <span className="truncate max-w-[120px] sm:max-w-none">{review.restaurant?.name}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{getLanguageLabel(review.language || "en")}</span>
                {review.reviewedAt && (
                  <>
                    <span className="text-muted-foreground/50 hidden sm:inline">|</span>
                    <span className="hidden sm:inline">{new Date(review.reviewedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {review.sentiment && (
              <Badge
                variant="secondary"
                className={`text-xs ${sentimentColor[review.sentiment as keyof typeof sentimentColor] || ""}`}
              >
                {getSentimentLabel(review.sentiment)}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={`text-xs ${statusColor[review.replyStatus as keyof typeof statusColor] || ""}`}
            >
              {getStatusLabel(review.replyStatus || "pending")}
            </Badge>
          </div>
        </div>

        {/* Review Text */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-sm">{cleanGoogleTranslationLabels(review.comment) || t("reviews.noComment")}</p>
        </div>

        {/* Generated Reply Preview */}
        {review.generatedReply && review.replyStatus === "pending" && (
          <div className="border rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t("reviews.aiGeneratedReply")}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {review.generatedReply}
            </p>
          </div>
        )}

        {/* Posted Reply */}
        {review.postedReply && review.replyStatus === "posted" && (
          <div className="border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {t("reviews.postedReply")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{review.postedReply}</p>
          </div>
        )}

        {/* Actions */}
        {review.replyStatus === "pending" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={onApprove} disabled={isLimitReached} data-testid={`button-approve-${review.id}`}>
              <Check className="mr-1 h-4 w-4" />
              {t("reviews.actions.approvePost")}
            </Button>
            <Button size="sm" variant="outline" onClick={onViewDetails} data-testid={`button-edit-${review.id}`}>
              {t("reviews.actions.editReply")}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onRegenerate} 
              disabled={isRegenerating}
              data-testid={`button-regenerate-${review.id}`}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? t("reviews.actions.regenerating") : t("reviews.actions.regenerate")}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss} data-testid={`button-dismiss-${review.id}`}>
              <X className="mr-1 h-4 w-4" />
              {t("reviews.actions.dismiss")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
      toast({
        title: t("reviews.toasts.replyPosted"),
        description: t("reviews.toasts.replyPostedDesc"),
      });
      setSelectedReview(null);
    },
    onError: () => {
      toast({
        title: t("reviews.toasts.error"),
        description: t("reviews.toasts.errorPost"),
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return await apiRequest("POST", `/api/reviews/${reviewId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: t("reviews.toasts.reviewDismissed"),
        description: t("reviews.toasts.reviewDismissedDesc"),
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      setRegeneratingReviewId(reviewId);
      return await apiRequest("POST", `/api/reviews/${reviewId}/regenerate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: t("reviews.toasts.replyRegenerated"),
        description: t("reviews.toasts.replyRegeneratedDesc"),
      });
      setRegeneratingReviewId(null);
    },
    onError: () => {
      setRegeneratingReviewId(null);
      toast({
        title: t("reviews.toasts.error"),
        description: t("reviews.toasts.errorRegenerate"),
        variant: "destructive",
      });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reviews/generate-all");
      return response.json() as Promise<{ generated: number; skipped: number }>;
    },
    onSuccess: (data: { generated: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      if (data.skipped > 0) {
        toast({
          title: t("reviews.toasts.allGenerated"),
          description: t("reviews.toasts.allGeneratedPartial")
            .replace("{generated}", String(data.generated))
            .replace("{skipped}", String(data.skipped)),
        });
      } else {
        toast({
          title: t("reviews.toasts.allGenerated"),
          description: t("reviews.toasts.allGeneratedDesc").replace("{count}", String(data.generated)),
        });
      }
    },
    onError: () => {
      toast({
        title: t("reviews.toasts.error"),
        description: t("reviews.toasts.errorGenerateAll"),
        variant: "destructive",
      });
    },
  });

  const handleSyncReviews = async () => {
    if (!filterRestaurant || filterRestaurant === "all") {
      toast({
        title: t("reviews.toasts.selectRestaurant"),
        description: t("reviews.toasts.selectRestaurantDesc"),
        variant: "destructive",
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await apiRequest("POST", "/api/reviews/resync", { restaurantId: filterRestaurant });
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: t("reviews.toasts.syncSuccess"),
        description: t("reviews.toasts.syncSuccessDesc").replace("{count}", String(data.synced || 0)),
      });
    } catch (error) {
      toast({
        title: t("reviews.toasts.error"),
        description: t("reviews.toasts.errorSync"),
        variant: "destructive",
      });
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
  const pendingWithoutReplyCount = reviews?.filter(
    (r) => r.replyStatus === "pending" && !r.generatedReply
  ).length || 0;

  const handleApprove = (review: ReviewWithRestaurant) => {
    if (review.generatedReply) {
      approveMutation.mutate({ reviewId: review.id, reply: review.generatedReply });
    }
  };

  const handleViewDetails = (review: ReviewWithRestaurant) => {
    setSelectedReview(review);
    setEditedReply(review.generatedReply || "");
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("reviews.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t("reviews.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleSyncReviews}
            disabled={isSyncing || filterRestaurant === "all"}
            data-testid="button-sync-reviews"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("reviews.syncing")}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("reviews.syncReviews")}
              </>
            )}
          </Button>
          {pendingWithoutReplyCount > 0 && (
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={generateAllMutation.isPending || isLimitReached}
              data-testid="button-generate-all"
            >
              {generateAllMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("reviews.toasts.generatingAll")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("reviews.generateAllPending").replace("{count}", String(pendingWithoutReplyCount))}
                </>
              )}
            </Button>
          )}
          <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-restaurant">
              <Filter className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue placeholder={t("reviews.allRestaurants")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reviews.allRestaurants")}</SelectItem>
              {restaurants?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
            <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-sort-order">
              <ArrowUpDown className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("reviews.sort.newest")}</SelectItem>
              <SelectItem value="oldest">{t("reviews.sort.oldest")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ReplyUsageCard data-testid="reply-usage-card" />

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-auto">
          <TabsTrigger value="all" data-testid="tab-all">
            {t("reviews.tabs.all")} ({reviews?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            {t("reviews.tabs.pending")} ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="posted" data-testid="tab-posted">
            {t("reviews.tabs.posted")} ({postedCount})
          </TabsTrigger>
          <TabsTrigger value="dismissed" data-testid="tab-dismissed">
            {t("reviews.tabs.dismissed")}
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={filterStatus} className="mt-6">
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredReviews && filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onApprove={() => handleApprove(review)}
                  onDismiss={() => dismissMutation.mutate(review.id)}
                  onRegenerate={() => regenerateMutation.mutate(review.id)}
                  onViewDetails={() => handleViewDetails(review)}
                  isRegenerating={regeneratingReviewId === review.id}
                  isLimitReached={isLimitReached}
                  t={t}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">{t("reviews.noReviewsFound")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filterStatus === "pending"
                      ? t("reviews.allResponded")
                      : t("reviews.noMatchFilters")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Reply Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("reviews.editDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("reviews.editDialog.description")}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              {/* Original Review */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t("reviews.editDialog.originalReview")}</label>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{selectedReview.reviewerName}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < selectedReview.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm">{selectedReview.comment}</p>
                </div>
              </div>

              {/* Editable Reply */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t("reviews.editDialog.yourReply")}</label>
                <Textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  rows={6}
                  placeholder={t("reviews.editDialog.placeholder")}
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
                  approveMutation.mutate({
                    reviewId: selectedReview.id,
                    reply: editedReply,
                  });
                }
              }}
              disabled={approveMutation.isPending || !editedReply.trim()}
              data-testid="button-post-reply"
            >
              {approveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("reviews.editDialog.postReply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
