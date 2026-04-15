import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw,
  Trash2,
  Loader2,
  Star,
  Zap,
  Settings2,
  AlertTriangle,
  MessageSquare,
  Globe,
  Mic,
  Palette,
} from "lucide-react";
import type { Restaurant, TonePreset } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

const TONE_STYLES = [
  { value: "friendly", labelKey: "tonePresets.styles.friendly", fallback: "Friendly" },
  { value: "formal", labelKey: "tonePresets.styles.formal", fallback: "Formal" },
  { value: "casual", labelKey: "tonePresets.styles.casual", fallback: "Casual" },
  { value: "professional", labelKey: "tonePresets.styles.professional", fallback: "Professional" },
  { value: "warm", labelKey: "tonePresets.styles.warm", fallback: "Warm" },
  { value: "mediterranean", labelKey: "tonePresets.styles.mediterranean", fallback: "Mediterranean" },
];

interface LocationConfigSheetProps {
  restaurant: Restaurant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: Partial<Restaurant>) => Promise<void>;
  onSyncReviews: () => void;
  onDelete: () => void;
  isSyncing: boolean;
  isSaving: boolean;
}

export function LocationConfigSheet({
  restaurant,
  open,
  onOpenChange,
  onSave,
  onSyncReviews,
  onDelete,
  isSyncing,
  isSaving,
}: LocationConfigSheetProps) {
  const { t } = useLanguage();
  const [autoSyncReviews, setAutoSyncReviews] = useState(false);
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [minStars, setMinStars] = useState(4);
  const [withComment, setWithComment] = useState(true);
  const [withoutComment, setWithoutComment] = useState(true);
  const [language, setLanguage] = useState("auto");
  const [toneOfVoice, setToneOfVoice] = useState("friendly");
  const [tonePresetId, setTonePresetId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: tonePresets } = useQuery<TonePreset[]>({
    queryKey: ["/api/tone-presets"],
    staleTime: 60000,
  });

  const getLanguageOptions = () => [
    { value: "auto", label: t("locationConfig.languageAuto") },
    { value: "es", label: t("locationConfig.languageSpanish") },
    { value: "en", label: t("locationConfig.languageEnglish") },
    { value: "ca", label: t("locationConfig.languageCatalan") },
  ];

  useEffect(() => {
    if (restaurant) {
      setAutoSyncReviews(restaurant.autoSyncReviews ?? false);
      setAutoPostEnabled(restaurant.autoPostEnabled ?? false);
      setMinStars(restaurant.autoPublishMinStars ?? 4);
      setWithComment(restaurant.autoPublishWithComment ?? true);
      setWithoutComment(restaurant.autoPublishWithoutComment ?? true);
      setLanguage(restaurant.autoPublishLanguage ?? "auto");
      setToneOfVoice(restaurant.toneOfVoice ?? "friendly");
      setTonePresetId(restaurant.tonePresetId ?? null);
      setHasChanges(false);
    }
  }, [restaurant]);

  const markChanged = () => setHasChanges(true);

  const handleSave = async () => {
    await onSave({
      autoSyncReviews,
      autoPostEnabled,
      autoPublishMinStars: minStars,
      autoPublishWithComment: withComment,
      autoPublishWithoutComment: withoutComment,
      autoPublishLanguage: language,
      toneOfVoice,
      tonePresetId,
    });
    setHasChanges(false);
  };

  const generateRulesSummary = () => {
    if (!autoPostEnabled) {
      return t("locationConfig.rulesWillPublish") + ": " + t("common.no");
    }

    const parts: string[] = [];

    const reviewTypes: string[] = [];
    if (withComment) reviewTypes.push(t("locationConfig.rulesWithComments"));
    if (withoutComment) reviewTypes.push(t("locationConfig.rulesWithoutComments"));

    if (reviewTypes.length === 0) {
      return t("locationConfig.reviewTypes") + ": " + t("common.no");
    }

    parts.push(reviewTypes.join(" + "));

    parts.push(t("locationConfig.rulesMinStars").replace("{stars}", String(minStars)));

    const langOptions = getLanguageOptions();
    const langLabel = langOptions.find((l) => l.value === language)?.label || t("locationConfig.rulesAllLanguages");
    if (language === "auto") {
      parts.push(t("locationConfig.rulesAllLanguages"));
    } else {
      parts.push(t("locationConfig.rulesLanguage").replace("{language}", langLabel));
    }

    return `${t("locationConfig.rulesWillPublish")}: ${parts.join(", ")}.`;
  };

  if (!restaurant) return null;

  const languageOptions = getLanguageOptions();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("locationConfig.title")}
          </SheetTitle>
          <SheetDescription>{restaurant.name}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* AI Voice Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Mic className="h-4 w-4" />
              {t("locationConfig.aiVoiceSettings") || "AI Voice Settings"}
            </h3>

            {/* Tone of Voice */}
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <Label htmlFor="tone-of-voice" className="font-medium">
                  {t("locationConfig.toneOfVoice") || "Tone of Voice"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("locationConfig.toneOfVoiceDesc") || "The base tone for AI-generated replies"}
                </p>
              </div>
              <Select
                value={toneOfVoice}
                onValueChange={(value) => {
                  setToneOfVoice(value);
                  markChanged();
                }}
              >
                <SelectTrigger data-testid="select-tone-of-voice">
                  <SelectValue placeholder={t("locationConfig.selectTone") || "Select a tone"} />
                </SelectTrigger>
                <SelectContent>
                  {TONE_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {t(style.labelKey) || style.fallback}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone Preset */}
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <Label htmlFor="tone-preset" className="font-medium">
                    {t("locationConfig.tonePreset") || "Tone Preset"}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("locationConfig.tonePresetDesc") || "Use a custom preset with specific instructions for this location"}
                </p>
              </div>
              <Select
                value={tonePresetId !== null ? tonePresetId : "none"}
                onValueChange={(value) => {
                  setTonePresetId(value === "none" ? null : value);
                  markChanged();
                }}
              >
                <SelectTrigger data-testid="select-tone-preset">
                  <SelectValue placeholder={t("locationConfig.selectPreset") || "Select a preset"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("locationConfig.noPreset") || "No preset (use base tone only)"}
                  </SelectItem>
                  {tonePresets?.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tonePresets?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("locationConfig.noPresetsAvailable") || "No presets available. Create one in the Tone Presets page."}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Automations Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("locationConfig.automations")}
            </h3>

            {/* Auto Sync Reviews */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <Label htmlFor="auto-sync" className="font-medium">
                    {t("locationConfig.autoSync")}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("locationConfig.autoSyncDesc")}
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSyncReviews}
                onCheckedChange={(checked) => {
                  setAutoSyncReviews(checked);
                  markChanged();
                }}
                data-testid="switch-auto-sync"
              />
            </div>

            {/* Auto Publish Replies */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <Label htmlFor="auto-publish" className="font-medium">
                      {t("locationConfig.autoPublish")}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("locationConfig.autoPublishDesc")}
                  </p>
                </div>
                <Switch
                  id="auto-publish"
                  checked={autoPostEnabled}
                  onCheckedChange={(checked) => {
                    setAutoPostEnabled(checked);
                    markChanged();
                  }}
                  data-testid="switch-auto-publish"
                />
              </div>

              {/* Auto-Publish Rules - Expandable */}
              {autoPostEnabled && (
                <div className="border-t bg-muted/30 p-4 space-y-5 animate-in slide-in-from-top-2 duration-200">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    {t("locationConfig.publishRules")}
                  </h4>

                  {/* Review Type Filters */}
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t("locationConfig.reviewTypes")}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="with-comment"
                          checked={withComment}
                          onCheckedChange={(checked) => {
                            setWithComment(checked === true);
                            markChanged();
                          }}
                          data-testid="checkbox-with-comment"
                        />
                        <Label htmlFor="with-comment" className="text-sm font-normal cursor-pointer">
                          {t("locationConfig.withComments")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="without-comment"
                          checked={withoutComment}
                          onCheckedChange={(checked) => {
                            setWithoutComment(checked === true);
                            markChanged();
                          }}
                          data-testid="checkbox-without-comment"
                        />
                        <Label htmlFor="without-comment" className="text-sm font-normal cursor-pointer">
                          {t("locationConfig.withoutComments")}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Star Rating Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      {t("locationConfig.minStars")}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 transition-colors ${
                              star <= minStars
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium">{minStars}+ {t("locationConfig.stars")}</span>
                      </div>
                      <Slider
                        value={[minStars]}
                        onValueChange={([value]) => {
                          setMinStars(value);
                          markChanged();
                        }}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                        data-testid="slider-min-stars"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("locationConfig.minStarsDesc")}
                      </p>
                    </div>
                  </div>

                  {/* Language Handling */}
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t("locationConfig.language")}
                    </Label>
                    <Select
                      value={language}
                      onValueChange={(value) => {
                        setLanguage(value);
                        markChanged();
                      }}
                    >
                      <SelectTrigger data-testid="select-language">
                        <SelectValue placeholder={t("locationConfig.language")} />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t("locationConfig.languageDesc")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Rules Summary */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-foreground">{generateRulesSummary()}</p>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full"
            data-testid="button-save-config"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              t("common.saveChanges")
            )}
          </Button>

          <Separator />

          {/* Sensitive Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t("locationConfig.dangerZone")}
            </h3>

            <div className="space-y-3">
              {/* Sync Reviews Now */}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onSyncReviews}
                disabled={isSyncing}
                data-testid="button-sync-reviews"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isSyncing ? t("locationConfig.syncing") : t("locationConfig.syncNow")}
              </Button>

              {/* Delete Location */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    data-testid="button-delete-location"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("locationConfig.deleteLocation")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("locationConfig.deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("locationConfig.deleteConfirmDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("locationConfig.deleteConfirmButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
