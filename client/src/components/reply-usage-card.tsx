import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { MessageSquare, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanInfo {
  limits: {
    maxRepliesPerMonth: number | "unlimited";
  };
  currentUsage: {
    monthlyReplies: number;
  };
}

interface ReplyUsageCardProps {
  variant?: "default" | "compact";
  className?: string;
}

export function useReplyUsage() {
  const { data: planInfo, isLoading } = useQuery<PlanInfo>({
    queryKey: ["/api/plan-info"],
  });

  if (isLoading || !planInfo) {
    return { isLoading, isLimitReached: false, isWarning: false, isUnlimited: true, used: 0, limit: 0, remaining: 0 };
  }

  const limit = planInfo.limits.maxRepliesPerMonth;
  const isUnlimited = limit === "unlimited";
  const used = planInfo.currentUsage.monthlyReplies || 0;

  if (isUnlimited) {
    return { isLoading: false, isLimitReached: false, isWarning: false, isUnlimited: true, used, limit: 0, remaining: Infinity };
  }

  const numericLimit = limit as number;
  const remaining = Math.max(0, numericLimit - used);
  const remainingPercentage = (remaining / numericLimit) * 100;
  const isWarning = remainingPercentage <= 20 && remainingPercentage > 0;
  const isLimitReached = remaining === 0;

  return { isLoading: false, isLimitReached, isWarning, isUnlimited: false, used, limit: numericLimit, remaining };
}

export function ReplyUsageCard({ 
  variant = "default", 
  className,
}: ReplyUsageCardProps) {
  const { t } = useLanguage();
  const { isLoading, isLimitReached, isWarning, isUnlimited, used, limit, remaining } = useReplyUsage();

  if (isLoading) {
    return null;
  }

  if (isUnlimited) {
    if (variant === "compact") {
      return (
        <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
          <MessageSquare className="h-4 w-4" />
          <span>{t("usage.replies.thisMonth")}: {t("usage.replies.unlimited")}</span>
        </div>
      );
    }

    return (
      <Card className={cn("bg-muted/30", className)}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              {t("usage.replies.thisMonth")}: <span className="font-medium text-foreground">{t("usage.replies.unlimited")}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentage = Math.min(100, (used / limit) * 100);

  const getProgressColor = () => {
    if (isLimitReached) return "bg-red-500";
    if (isWarning) return "bg-yellow-500";
    return "bg-primary";
  };

  if (variant === "compact") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>
              {t("usage.replies.thisMonth")}: <span className="font-medium text-foreground">{used} / {limit}</span>
            </span>
          </div>
          {isLimitReached && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link href="/billing">{t("usage.replies.upgrade")}</Link>
            </Button>
          )}
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all", getProgressColor())} 
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      isLimitReached ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" : 
      isWarning ? "border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20" : 
      "bg-muted/30",
      className
    )}>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "p-2 rounded-full",
              isLimitReached ? "bg-red-100 dark:bg-red-900" : 
              isWarning ? "bg-yellow-100 dark:bg-yellow-900" : 
              "bg-primary/10"
            )}>
              {isLimitReached ? (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <MessageSquare className={cn(
                  "h-4 w-4",
                  isWarning ? "text-yellow-600 dark:text-yellow-400" : "text-primary"
                )} />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {t("usage.replies.thisMonth")}:
                </span>
                <span className={cn(
                  "font-semibold",
                  isLimitReached ? "text-red-600 dark:text-red-400" : 
                  isWarning ? "text-yellow-600 dark:text-yellow-400" : 
                  "text-foreground"
                )}>
                  {used} / {limit}
                </span>
              </div>
              
              <div className="h-1.5 w-full max-w-[200px] bg-muted rounded-full overflow-hidden mt-1.5">
                <div 
                  className={cn("h-full transition-all", getProgressColor())} 
                  style={{ width: `${percentage}%` }} 
                />
              </div>
            </div>
          </div>

          {isLimitReached && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 dark:text-red-400 hidden sm:inline">
                {t("usage.replies.limitReached")}
              </span>
              <Button size="sm" asChild>
                <Link href="/billing">{t("usage.replies.upgrade")}</Link>
              </Button>
            </div>
          )}

          {isWarning && !isLimitReached && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {t("usage.replies.remaining").replace("{count}", String(remaining))}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
