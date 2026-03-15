import { Users, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";

export default function Team() {
  const { t } = useLanguage();

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <PageHeader title={t("team.title")} subtitle={t("team.subtitle")} />

      <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-foreground">{t("team.comingSoon.title")}</h2>
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
            <Sparkles className="h-2.5 w-2.5" />
            Soon
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">{t("team.comingSoon.message")}</p>
      </div>
    </div>
  );
}
