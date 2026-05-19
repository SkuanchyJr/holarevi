import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();

  const googleConnected = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("success") === "connected";
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/${language}/auth`);
    } else if (!isLoading && user?.onboardingCompleted) {
      setLocation(`/${language}/dashboard`);
    }
  }, [user, isLoading, setLocation, language]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex items-center justify-center p-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {t("onboarding.pageTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("onboarding.pageSubtitle")}
          </p>
        </div>

        <Card className="border-none shadow-xl overflow-hidden bg-background">
          <OnboardingWizard
            initialStep={user.onboardingStep || "add_location"}
            googleConnected={googleConnected}
          />
        </Card>
      </div>
    </div>
  );
}
