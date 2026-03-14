import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Palette,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import type { TonePreset } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function TonePresets() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<TonePreset | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    style: "friendly",
    instructions: "",
  });

  const toneStyles = [
    {
      value: "friendly",
      label: t("tonePresets.styles.friendly"),
      description: t("tonePresets.styles.friendlyDesc"),
    },
    {
      value: "formal",
      label: t("tonePresets.styles.formal"),
      description: t("tonePresets.styles.formalDesc"),
    },
    {
      value: "casual",
      label: t("tonePresets.styles.casual"),
      description: t("tonePresets.styles.casualDesc"),
    },
    {
      value: "professional",
      label: t("tonePresets.styles.professional"),
      description: t("tonePresets.styles.professionalDesc"),
    },
    {
      value: "warm",
      label: t("tonePresets.styles.warm"),
      description: t("tonePresets.styles.warmDesc"),
    },
  ];

  const { data: presets, isLoading: loadingPresets } = useQuery<TonePreset[]>({
    queryKey: ["/api/tone-presets"],
  });

  const { data: planInfo } = useQuery<any>({
    queryKey: ["/api/plan-info"],
  });

  const createPreset = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/tone-presets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tone-presets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan-info"] });
      resetForm();
      toast({
        title: t("tonePresets.toasts.created"),
        description: t("tonePresets.toasts.createdDesc"),
      });
    },
    onError: (error: any) => {
      const message =
        error?.error === "tone_preset_limit_reached"
          ? error?.message || t("tonePresets.limitReached")
          : t("tonePresets.toasts.errorCreate");
      toast({
        title: t("tonePresets.toasts.error"),
        description: message,
        variant: "destructive",
      });
    },
  });

  const updatePreset = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await apiRequest("PATCH", `/api/tone-presets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tone-presets"] });
      resetForm();
      toast({
        title: t("tonePresets.toasts.updated"),
        description: t("tonePresets.toasts.updatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("tonePresets.toasts.error"),
        description: t("tonePresets.toasts.errorUpdate"),
        variant: "destructive",
      });
    },
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/tone-presets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tone-presets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan-info"] });
      toast({
        title: t("tonePresets.toasts.deleted"),
        description: t("tonePresets.toasts.deletedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("tonePresets.toasts.error"),
        description: t("tonePresets.toasts.errorDelete"),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData({
      name: "",
      description: "",
      style: "friendly",
      instructions: "",
    });
  };

  const openEditDialog = (preset: TonePreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || "",
      style: preset.style || "friendly",
      instructions: preset.instructions || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) return;

    if (editingPreset) {
      updatePreset.mutate({ id: editingPreset.id, data: formData });
    } else {
      createPreset.mutate(formData);
    }
  };

  const currentCount = planInfo?.currentUsage?.tonePresets || 0;
  const limit = planInfo?.limits?.maxTonePresets;
  const isUnlimited = limit === "unlimited";
  const canAddMore = isUnlimited || currentCount < (limit as number);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header + botón crear preset */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-presets-title">
              {t("tonePresets.title")}
            </h1>
            <p className="text-muted-foreground">{t("tonePresets.subtitle")}</p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (!open) resetForm();
              else setIsDialogOpen(true);
            }}
          >
            <DialogTrigger asChild>
              <Button
                disabled={!canAddMore && !editingPreset}
                data-testid="button-create-preset"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("tonePresets.createPreset")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingPreset
                    ? t("tonePresets.dialog.editTitle")
                    : t("tonePresets.dialog.createTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("tonePresets.dialog.description")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("tonePresets.dialog.name")}</Label>
                  <Input
                    id="name"
                    placeholder={t("tonePresets.dialog.namePlaceholder")}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    data-testid="input-preset-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="style">{t("tonePresets.dialog.style")}</Label>
                  <Select
                    value={formData.style}
                    onValueChange={(value) =>
                      setFormData({ ...formData, style: value })
                    }
                  >
                    <SelectTrigger data-testid="select-preset-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {toneStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div>
                            <span className="font-medium">{style.label}</span>
                            <span className="text-muted-foreground ml-2 text-sm">
                              - {style.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("tonePresets.dialog.descriptionLabel")}
                  </Label>
                  <Input
                    id="description"
                    placeholder={t("tonePresets.dialog.descriptionPlaceholder")}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    data-testid="input-preset-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">
                    {t("tonePresets.dialog.instructions")}
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder={t(
                      "tonePresets.dialog.instructionsPlaceholder",
                    )}
                    value={formData.instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, instructions: e.target.value })
                    }
                    className="min-h-[100px]"
                    data-testid="textarea-preset-instructions"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !formData.name ||
                    createPreset.isPending ||
                    updatePreset.isPending
                  }
                  data-testid="button-save-preset"
                >
                  {(createPreset.isPending || updatePreset.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingPreset
                    ? t("common.saveChanges")
                    : t("tonePresets.createPreset")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de límite de presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("tonePresets.presetLimit")}
            </CardTitle>
            <CardDescription>
              {isUnlimited
                ? t("tonePresets.unlimitedPresets")
                : t("tonePresets.presetsUsed")
                    .replace("{current}", String(currentCount))
                    .replace("{limit}", String(limit))}
            </CardDescription>
          </CardHeader>
          {!isUnlimited && (
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (currentCount / (limit as number)) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
              {!canAddMore && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t("tonePresets.upgradeToCreate")}
                </p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Lista de presets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {t("tonePresets.yourPresets")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPresets ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !presets?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t("tonePresets.noPresets")}</p>
                <p className="text-sm">{t("tonePresets.noPresetsDesc")}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {presets.map((preset) => (
                  <Card
                    key={preset.id}
                    className="bg-muted/30"
                    data-testid={`card-preset-${preset.id}`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{preset.name}</h3>
                            <Badge variant="outline">{preset.style}</Badge>
                            {preset.isDefault && (
                              <Badge variant="secondary">
                                {t("tonePresets.default")}
                              </Badge>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {preset.description}
                            </p>
                          )}
                          {preset.instructions && (
                            <p className="text-sm text-muted-foreground italic">
                              "{preset.instructions}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(preset)}
                            data-testid={`button-edit-preset-${preset.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePreset.mutate(preset.id)}
                            disabled={deletePreset.isPending}
                            data-testid={`button-delete-preset-${preset.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
