import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const status = (user as any)?.subscriptionStatus?.trim();
  const trialEndsAt = (user as any)?.trialEndsAt;
  if (status !== "trial" && status !== "trialing") return null;

  let daysLeft: number | null = null;
  if (trialEndsAt) {
    const diffMs = new Date(trialEndsAt).getTime() - Date.now();
    if (diffMs <= 0) return null;
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  let message: string;
  if (daysLeft !== null && daysLeft <= 1) {
    message = t("billing.trialBannerLastDay");
  } else {
    message = t("billing.trialBannerActive").replace(
      "{days}",
      String(daysLeft ?? 3),
    );
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
      data-testid="banner-trial"
    >
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p
          className="text-sm text-emerald-900 dark:text-emerald-200 leading-snug"
          data-testid="text-trial-message"
        >
          {message}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-emerald-300 bg-white/60 dark:border-emerald-800 dark:bg-emerald-950/60"
        asChild
        data-testid="button-trial-billing"
      >
        <Link href={`/${language}/billing`}>{t("billing.trialBannerCta")}</Link>
      </Button>
    </div>
  );
}
