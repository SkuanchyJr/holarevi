import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Team() {
  const { t } = useLanguage();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-team-title">
          <Users className="h-6 w-6" />
          {t("team.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("team.subtitle")}
        </p>
      </div>

      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("team.comingSoon.title")}</CardTitle>
          <CardDescription className="text-base">
            {t("team.comingSoon.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>{t("team.comingSoon.message")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
