import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Palette, Plus, Trash2, Edit, Loader2, Lock, Sparkles } from "lucide-react";
import type { TonePreset } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const STYLE_COLORS: Record<string, string> = {
  friendly: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  formal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  casual: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  professional: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  warm: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  mediterranean: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function TonePresets() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<TonePreset | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", style: "friendly", instructions: "" });

  const toneStyles = [
    { value: "friendly", label: t("tonePresets.styles.friendly"), description: t("tonePresets.styles.friendlyDesc") },
    { value: "formal", label: t("tonePresets.styles.formal"), description: t("tonePresets.styles.formalDesc") },
    { value: "casual", label: t("tonePresets.styles.casual"), description: t("tonePresets.styles.casualDesc") },
    { value: "professional", label: t("tonePresets.styles.professional"), description: t("tonePresets.styles.professionalDesc") },
    { value: "warm", label: t("tonePresets.styles.warm"), description: t("tonePresets.styles.warmDesc") },
  ];

  const { data: presets, isLoading } = useQuery<TonePreset[]>({ queryKey: ["/api/tone-presets"] });
  const { data: planInfo } = useQuery<any>({ queryKey: ["/api/plan-info"] });

  const createPreset = useMutation({
    mutationFn: async (data: typeof formData) => (await apiRequest("POST", "/api/tone-presets", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tone-presets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan-info"] });
      resetForm();
      toast({ title: t("tonePresets.toasts.created"), description: t("tonePresets.toasts.createdDesc") });
    },
    onError: (error: any) => {
      toast({ title: t("tonePresets.toasts.error"), description: error?.message || t("tonePresets.toasts.errorCreate"), variant: "destructive" });
    },
  });

  const updatePreset = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) =>
      (await apiRequest("PATCH", `/api/tone-presets/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tone-presets"] });
      resetForm();
      toast({ title: t("tonePresets.toasts.updated"), description: t("tonePresets.toasts.updatedDesc") });
    },
    onError: () => {
      toast({ title: t("tonePresets.toasts.error"), description: t("tonePresets.toasts.errorUpdate"), variant: "destructive" });
    },
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/tone-presets/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tone-presets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plan-info"] });
      toast({ title: t("tonePresets.toasts.deleted"), description: t("tonePresets.toasts.deletedDesc") });
    },
    onError: () => {
      toast({ title: t("tonePresets.toasts.error"), description: t("tonePresets.toasts.errorDelete"), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData({ name: "", description: "", style: "friendly", instructions: "" });
  };

  const openEditDialog = (preset: TonePreset) => {
    setEditingPreset(preset);
    setFormData({ name: preset.name, description: preset.description || "", style: preset.style || "friendly", instructions: preset.instructions || "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) return;
    if (editingPreset) updatePreset.mutate({ id: editingPreset.id, data: formData });
    else createPreset.mutate(formData);
  };

  const currentCount = planInfo?.currentUsage?.tonePresets || 0;
  const limit = planInfo?.limits?.maxTonePresets;
  const isUnlimited = limit === "unlimited";
  const canAddMore = isUnlimited || currentCount < (limit as number);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title={t("tonePresets.title")}
        subtitle={t("tonePresets.subtitle")}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canAddMore && !editingPreset} data-testid="button-create-preset">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("tonePresets.createPreset")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPreset ? t("tonePresets.dialog.editTitle") : t("tonePresets.dialog.createTitle")}</DialogTitle>
                <DialogDescription>{t("tonePresets.dialog.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tonePresets.dialog.name")}</Label>
                  <Input placeholder={t("tonePresets.dialog.namePlaceholder")} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-preset-name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tonePresets.dialog.style")}</Label>
                  <Select value={formData.style} onValueChange={(v) => setFormData({ ...formData, style: v })}>
                    <SelectTrigger data-testid="select-preset-style"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {toneStyles.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className="font-medium">{s.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">— {s.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tonePresets.dialog.descriptionLabel")}</Label>
                  <Input placeholder={t("tonePresets.dialog.descriptionPlaceholder")} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} data-testid="input-preset-description" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tonePresets.dialog.instructions")}</Label>
                  <Textarea placeholder={t("tonePresets.dialog.instructionsPlaceholder")} value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} className="min-h-[90px] resize-none" data-testid="textarea-preset-instructions" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>{t("common.cancel")}</Button>
                <Button onClick={handleSubmit} disabled={!formData.name || createPreset.isPending || updatePreset.isPending} data-testid="button-save-preset">
                  {(createPreset.isPending || updatePreset.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPreset ? t("common.saveChanges") : t("tonePresets.createPreset")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Usage bar */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">{t("tonePresets.presetLimit")}</p>
          <p className="text-sm text-muted-foreground">
            {isUnlimited
              ? t("tonePresets.unlimitedPresets")
              : t("tonePresets.presetsUsed").replace("{current}", String(currentCount)).replace("{limit}", String(limit))}
          </p>
        </div>
        {!isUnlimited && (
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min((currentCount / (limit as number)) * 100, 100)}%` }}
            />
          </div>
        )}
        {!canAddMore && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            {t("tonePresets.upgradeToCreate")}
          </p>
        )}
      </div>

      {/* Presets list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !presets?.length ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title={t("tonePresets.noPresets")}
              description={t("tonePresets.noPresetsDesc")}
              action={
                <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("tonePresets.createPreset")}
                </Button>
              }
            />
          </div>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4" data-testid={`card-preset-${preset.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{preset.name}</span>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STYLE_COLORS[preset.style || "friendly"])}>
                    {preset.style}
                  </span>
                  {preset.isDefault && (
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {t("tonePresets.default")}
                    </span>
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-muted-foreground mb-1">{preset.description}</p>
                )}
                {preset.instructions && (
                  <p className="text-xs text-foreground/60 italic line-clamp-2">"{preset.instructions}"</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(preset)} data-testid={`button-edit-preset-${preset.id}`}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deletePreset.mutate(preset.id)} disabled={deletePreset.isPending} data-testid={`button-delete-preset-${preset.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
