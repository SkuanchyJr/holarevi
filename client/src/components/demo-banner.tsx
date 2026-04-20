import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, LogOut, RotateCcw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function DemoBanner() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isDemo = (user as any)?.isDemo === true;

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

  if (!isDemo) return null;

  return (
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
      <div className="flex items-center gap-2 shrink-0">
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
  );
}
