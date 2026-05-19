import { AlertCircle, Home } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("notFound.title")}
          </h1>
          
          <p className="text-muted-foreground mb-8 max-w-[280px]">
            {t("notFound.description")}
          </p>

          <Button asChild className="gap-2">
            <Link href={`/${language}/`}>
              <Home className="h-4 w-4" />
              {t("notFound.backHome")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
