import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Store,
  Link2,
  SkipForward,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import type { Restaurant } from "@shared/schema";
import { cn } from "@/lib/utils";

type OnboardingStep = "add_location" | "connect_google" | "success";

const STEP_IDS: OnboardingStep[] = ["add_location", "connect_google", "success"];

export function OnboardingWizard({ initialStep, googleConnected }: { initialStep: string; googleConnected?: boolean }) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    STEP_IDS.includes(initialStep as OnboardingStep) ? (initialStep as OnboardingStep) : "add_location"
  );
  const [createdRestaurant, setCreatedRestaurant] = useState<Restaurant | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(googleConnected || false);
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state for Step 1
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("friendly");
  const [nameError, setNameError] = useState("");

  const stepIndex = STEP_IDS.indexOf(currentStep);
  const stepProgress = Math.round(((stepIndex + 1) / STEP_IDS.length) * 100);

  const stepLabels: Record<OnboardingStep, string> = {
    add_location: t("onboarding.steps.addLocation"),
    connect_google: t("onboarding.steps.connectGoogle"),
    success: t("onboarding.steps.success"),
  };

  // ── Server: update onboarding step ──
  const updateStepMutation = useMutation({
    mutationFn: async ({ step, completed }: { step: string; completed?: boolean }) => {
      const res = await apiRequest("POST", "/api/onboarding/step", { step, completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // ── Step 1: Create restaurant ──
  const createRestaurantMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string; toneOfVoice: string }) => {
      const res = await apiRequest("POST", "/api/restaurants", data);
      return res.json();
    },
    onSuccess: (restaurant: Restaurant) => {
      setCreatedRestaurant(restaurant);
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      goToStep("connect_google");
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("onboarding.addLocation.errorRequired"),
        variant: "destructive",
      });
    },
  });

  // ── Step 2: Check Google OAuth status ──
  const { data: googleStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/google/status"],
    queryFn: async () => {
      const res = await fetch("/api/google/status", { credentials: "include" });
      return res.json();
    },
  });

  // If the user has an existing restaurant (returning to onboarding), load it
  const { data: existingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  useEffect(() => {
    if (!createdRestaurant && existingRestaurants && existingRestaurants.length > 0) {
      const r = existingRestaurants[0];
      setCreatedRestaurant(r);
      setIsGoogleConnected(!!r.isConnected && !!r.googleAccountId);
      // If the user already has a restaurant, skip step 1
      if (currentStep === "add_location") {
        setCurrentStep("connect_google");
      }
    }
  }, [existingRestaurants, createdRestaurant, currentStep]);

  // If googleConnected prop changes (from URL param after callback), advance
  useEffect(() => {
    if (googleConnected && currentStep === "connect_google") {
      setIsGoogleConnected(true);
    }
  }, [googleConnected, currentStep]);

  // ── Navigation helpers ──
  const goToStep = (next: OnboardingStep) => {
    setCurrentStep(next);
    updateStepMutation.mutate({ step: next });
  };

  const finishOnboarding = () => {
    updateStepMutation.mutate(
      { step: "success", completed: true },
      {
        onSuccess: () => {
          setLocation(`/${language}/dashboard`);
        },
      }
    );
  };

  // ── Step 1: Submit handler ──
  const handleCreateLocation = () => {
    const trimmed = businessName.trim();
    if (!trimmed) {
      setNameError(t("onboarding.addLocation.errorRequired"));
      return;
    }
    setNameError("");
    createRestaurantMutation.mutate({
      name: trimmed,
      address: businessAddress.trim() || undefined,
      toneOfVoice,
    });
  };

  // ── Step 2: Connect Google ──
  const handleConnectGoogle = async () => {
    if (!createdRestaurant) return;
    try {
      const response = await fetch(`/api/google/connect/${createdRestaurant.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        toast({
          title: t("common.error"),
          description: data.message || data.error || "Failed to connect Google",
          variant: "destructive",
        });
        return;
      }
      const { authUrl } = await response.json();
      // Store onboarding state before redirect
      window.sessionStorage.setItem("onboarding_restaurant_id", createdRestaurant.id);
      window.location.href = authUrl;
    } catch {
      toast({
        title: t("common.error"),
        description: "Failed to initiate Google connection.",
        variant: "destructive",
      });
    }
  };

  const isGoogleConfigured = googleStatus?.configured ?? true;

  return (
    <div className="flex flex-col h-full">
      {/* ── Stepper ── */}
      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {STEP_IDS.map((id, idx) => {
              const active = id === currentStep;
              const completed = stepIndex > idx;
              return (
                <div key={id} className="flex items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-md"
                        : completed
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {completed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "hidden sm:inline ml-1.5 text-xs font-medium",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {stepLabels[id]}
                  </span>
                  {idx < STEP_IDS.length - 1 && (
                    <div
                      className={cn(
                        "w-6 sm:w-10 h-px mx-1.5 sm:mx-2",
                        completed ? "bg-primary/40" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t("onboarding.progress").replace("{percent}", String(stepProgress))}
          </span>
        </div>
        <Progress value={stepProgress} className="h-2" />
      </div>

      {/* ── Step Content ── */}
      <div className="p-6 sm:p-8 flex-grow">
        {/* ─────── STEP 1: Add Location ─────── */}
        {currentStep === "add_location" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 mb-4">
              <Store className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.addLocation.title")}</h2>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                {t("onboarding.addLocation.description")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ob-name" className="text-sm font-semibold">
                  {t("onboarding.addLocation.nameLabel")}
                </Label>
                <Input
                  id="ob-name"
                  placeholder={t("onboarding.addLocation.namePlaceholder")}
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  data-testid="onboarding-name"
                  autoFocus
                  className={nameError ? "border-destructive" : ""}
                />
                {nameError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {nameError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-address" className="text-sm font-semibold">
                  {t("onboarding.addLocation.addressLabel")}
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ob-address"
                    placeholder={t("onboarding.addLocation.addressPlaceholder")}
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    className="pl-9"
                    data-testid="onboarding-address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("onboarding.addLocation.toneLabel")}</Label>
                <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                  <SelectTrigger data-testid="onboarding-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">{t("onboarding.addLocation.tones.friendly")}</SelectItem>
                    <SelectItem value="formal">{t("onboarding.addLocation.tones.formal")}</SelectItem>
                    <SelectItem value="casual">{t("onboarding.addLocation.tones.casual")}</SelectItem>
                    <SelectItem value="mediterranean">{t("onboarding.addLocation.tones.mediterranean")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("onboarding.addLocation.toneHint")}</p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleCreateLocation}
              disabled={createRestaurantMutation.isPending}
              data-testid="onboarding-create"
            >
              {createRestaurantMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("onboarding.addLocation.creating")}
                </>
              ) : (
                <>
                  {t("onboarding.addLocation.submit")}
                  <ChevronRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* ─────── STEP 2: Connect Google ─────── */}
        {currentStep === "connect_google" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg">
            {isGoogleConnected ? (
              // ── Google already connected (returned from callback) ──
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {t("onboarding.connectGoogle.connectedTitle")}
                  </h2>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    {t("onboarding.connectGoogle.connectedDescription")}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => goToStep("success")}
                  data-testid="onboarding-google-continue"
                >
                  {t("onboarding.connectGoogle.continueButton")}
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </>
            ) : !isGoogleConfigured ? (
              // ── Google OAuth not configured ──
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 mb-4">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {t("onboarding.connectGoogle.title")}
                  </h2>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    {t("onboarding.connectGoogle.notConfigured")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("onboarding.connectGoogle.notConfiguredHint")}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => goToStep("success")}
                  data-testid="onboarding-skip-google"
                >
                  {t("onboarding.connectGoogle.continueButton")}
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </>
            ) : (
              // ── Normal Google connect flow ──
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 mb-4">
                  <Link2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {t("onboarding.connectGoogle.title")}
                  </h2>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    {t("onboarding.connectGoogle.description")}
                  </p>
                </div>

                {createdRestaurant && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{createdRestaurant.name}</p>
                      {createdRestaurant.address && (
                        <p className="text-xs text-muted-foreground">{createdRestaurant.address}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="flex-1 sm:flex-none"
                    onClick={handleConnectGoogle}
                    data-testid="onboarding-connect-google"
                  >
                    <Link2 className="mr-2 w-4 h-4" />
                    {t("onboarding.connectGoogle.connectButton")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() => goToStep("success")}
                    data-testid="onboarding-skip-google"
                  >
                    <SkipForward className="mr-2 w-4 h-4" />
                    {t("onboarding.connectGoogle.skipButton")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.connectGoogle.skipHint")}
                </p>
              </>
            )}
          </div>
        )}

        {/* ─────── STEP 3: Success ─────── */}
        {currentStep === "success" && (
          <div className="space-y-6 py-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 mx-auto mb-4">
              <Sparkles className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">{t("onboarding.success.title")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              {t("onboarding.success.description")}
            </p>

            {/* Summary */}
            <div className="max-w-sm mx-auto space-y-2 text-left">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {t("onboarding.success.summary.location")}
                  </p>
                  {createdRestaurant && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {createdRestaurant.name}
                    </p>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  isGoogleConnected
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                )}
              >
                {isGoogleConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <p
                  className={cn(
                    "text-sm font-medium",
                    isGoogleConnected
                      ? "text-green-800 dark:text-green-300"
                      : "text-amber-800 dark:text-amber-300"
                  )}
                >
                  {isGoogleConnected
                    ? t("onboarding.success.summary.google")
                    : t("onboarding.success.summary.googleSkipped")}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                size="lg"
                className="w-full max-w-sm"
                onClick={finishOnboarding}
                disabled={updateStepMutation.isPending}
                data-testid="onboarding-finish"
              >
                {updateStepMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("onboarding.success.goToDashboard")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Tip ── */}
      {currentStep !== "success" && (
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 text-xs text-muted-foreground italic">
          {t("onboarding.tip")}
        </div>
      )}
    </div>
  );
}
