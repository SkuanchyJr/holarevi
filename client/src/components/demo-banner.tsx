import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, LogOut, RotateCcw, Loader2, Plus, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function DemoBanner() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isDemo = (user as any)?.isDemo === true;

  const [addOpen, setAddOpen] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewLang, setReviewLang] = useState<"es" | "en" | "ca">("es");
  const [comment, setComment] = useState("");

  const exitMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation(`/${language}/affiliate/dashboard`);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/affiliate/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: t("demo.resetDone"),
        description: t("demo.resetDoneDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("demo.resetError"),
        variant: "destructive",
      });
    },
  });

  const addReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/affiliate/demo/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName: reviewerName.trim() || undefined,
          rating,
          comment: comment.trim(),
          language: reviewLang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to add review");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: t("demo.addReviewDone"),
        description: t("demo.addReviewDoneDesc"),
      });
      setReviewerName("");
      setRating(5);
      setComment("");
      setReviewLang("es");
      setAddOpen(false);
    },
    onError: () => {
      toast({
        title: t("demo.addReviewError"),
        variant: "destructive",
      });
    },
  });

  if (!isDemo) return null;

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
        data-testid="banner-demo"
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <FlaskConical className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p
            className="text-sm text-amber-900 dark:text-amber-200 leading-snug"
            data-testid="text-demo-message"
          >
            {t("demo.bannerMessage")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            className="border-amber-300 bg-white/60 dark:border-amber-800 dark:bg-amber-950/60"
            data-testid="button-demo-add-review"
          >
            <Plus className="h-4 w-4" />
            <span className="ml-2">{t("demo.addReview")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="border-amber-300 bg-white/60 dark:border-amber-800 dark:bg-amber-950/60"
            data-testid="button-demo-reset"
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span className="ml-2">{t("demo.reset")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exitMutation.mutate()}
            disabled={exitMutation.isPending}
            className="border-amber-300 bg-white/60 dark:border-amber-800 dark:bg-amber-950/60"
            data-testid="button-demo-exit"
          >
            {exitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="ml-2">{t("demo.exit")}</span>
          </Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-testid="dialog-demo-add-review">
          <DialogHeader>
            <DialogTitle>{t("demo.addReviewTitle")}</DialogTitle>
            <DialogDescription>{t("demo.addReviewDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="demo-review-name">{t("demo.reviewerName")}</Label>
              <Input
                id="demo-review-name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder={t("demo.reviewerNamePlaceholder")}
                data-testid="input-demo-reviewer-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("demo.rating")}</Label>
                <div className="flex items-center gap-1" data-testid="input-demo-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="hover-elevate active-elevate-2 rounded-md p-1"
                      data-testid={`button-demo-star-${n}`}
                      aria-label={`${n} stars`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          n <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-review-lang">{t("demo.reviewLanguage")}</Label>
                <Select
                  value={reviewLang}
                  onValueChange={(v) => setReviewLang(v as "es" | "en" | "ca")}
                >
                  <SelectTrigger id="demo-review-lang" data-testid="select-demo-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ca">Català</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-review-comment">{t("demo.reviewText")}</Label>
              <Textarea
                id="demo-review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("demo.reviewTextPlaceholder")}
                rows={5}
                data-testid="input-demo-review-text"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              data-testid="button-demo-cancel"
            >
              {t("demo.cancel")}
            </Button>
            <Button
              onClick={() => addReviewMutation.mutate()}
              disabled={
                addReviewMutation.isPending || comment.trim().length < 3
              }
              data-testid="button-demo-submit-review"
            >
              {addReviewMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t("demo.submitReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
