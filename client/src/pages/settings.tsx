import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  Bell,
  Globe,
  Shield,
  LogOut,
  Loader2,
  Trash2,
  Mail,
  Download,
  Palette,
  Check,
  KeyRound,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Layout primitives                                                         */
/* -------------------------------------------------------------------------- */

function SettingsSection({
  icon,
  title,
  description,
  badge,
  children,
  className,
  destructive,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  destructive?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        destructive ? "border-destructive/30" : "border-border",
        className,
      )}
    >
      <header className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            destructive
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Settings                                                                  */
/* -------------------------------------------------------------------------- */

type ThemeMode = "light" | "dark" | "system";

interface UserPreferences {
  theme: ThemeMode;
  timezone: string;
  language: string;
  notifyWeeklySummary: boolean;
  notifyReplies: boolean;
  notifyProductUpdates: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: "system",
  timezone: "europe/madrid",
  language: "es",
  notifyWeeklySummary: true,
  notifyReplies: true,
  notifyProductUpdates: false,
};

export default function Settings() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();

  /* ---------------- Profile --------------- */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/user", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("settings.profile.saved"),
        description: t("settings.profile.savedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("settings.profile.saveError"),
        variant: "destructive",
      });
    },
  });

  const hasProfileChanges =
    user &&
    (firstName !== (user.firstName || "") || lastName !== (user.lastName || ""));

  /* ---------------- Preferences (server-backed) --------------- */
  const { data: prefs } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    // fallback until server responds
    placeholderData: DEFAULT_PREFS,
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (patch: Partial<UserPreferences>) => {
      const res = await apiRequest("PATCH", "/api/user/preferences", patch);
      return res.json();
    },
    onMutate: async (patch) => {
      // optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/user/preferences"] });
      const prev = queryClient.getQueryData<UserPreferences>([
        "/api/user/preferences",
      ]);
      queryClient.setQueryData<UserPreferences>(
        ["/api/user/preferences"],
        (old) => ({ ...(old ?? DEFAULT_PREFS), ...patch }),
      );
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["/api/user/preferences"], ctx.prev);
      }
      toast({
        title: t("common.error"),
        description: t("settings.preferences.saveError"),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  const current: UserPreferences = prefs ?? DEFAULT_PREFS;

  const setPref = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => updatePrefsMutation.mutate({ [key]: value } as Partial<UserPreferences>);

  /* ---------------- Export data --------------- */
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/auth/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: t("settings.dangerZone.exportReady"),
        description: t("settings.dangerZone.exportReadyDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("settings.dangerZone.exportError"),
        variant: "destructive",
      });
    },
  });

  /* ---------------- Delete account --------------- */
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/auth/account");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("settings.dangerZone.accountDeleted"),
        description: t("settings.dangerZone.accountDeletedDesc"),
      });
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("settings.dangerZone.deleteError"),
        variant: "destructive",
      });
    },
  });

  /* ---------------- Helpers --------------- */
  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      "U"
    : "U";

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : null;

  /* ---------------- Render --------------- */
  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {/* ----------------------- Profile ----------------------- */}
      <SettingsSection
        icon={<User className="h-4 w-4" />}
        title={t("settings.profile.title")}
        description={t("settings.profile.description")}
      >
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <Avatar className="h-14 w-14">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              className="object-cover"
            />
            <AvatarFallback className="text-base bg-primary/10 text-primary font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
            {memberSince && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.profile.memberSince", { date: memberSince })}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="firstName"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t("settings.profile.firstName")}
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              data-testid="input-first-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="lastName"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t("settings.profile.lastName")}
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              data-testid="input-last-name"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t("settings.profile.email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              data-testid="input-email"
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.profile.emailManagedByProvider")}
            </p>
          </div>
        </div>

        {hasProfileChanges && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                updateProfileMutation.mutate({ firstName, lastName })
              }
              disabled={updateProfileMutation.isPending}
              size="sm"
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {t("common.saveChanges")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFirstName(user?.firstName || "");
                setLastName(user?.lastName || "");
              }}
              disabled={updateProfileMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </SettingsSection>

      {/* ----------------------- Appearance ----------------------- */}
      <SettingsSection
        icon={<Palette className="h-4 w-4" />}
        title={t("settings.appearance.title")}
        description={t("settings.appearance.description")}
      >
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("settings.appearance.theme")}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "light", icon: Sun, label: t("settings.appearance.light") },
                { value: "dark", icon: Moon, label: t("settings.appearance.dark") },
                { value: "system", icon: Monitor, label: t("settings.appearance.system") },
              ] as const
            ).map(({ value, icon: Icon, label }) => {
              const active = current.theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPref("theme", value)}
                  data-testid={`button-theme-${value}`}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {active && (
                    <Check className="absolute top-1.5 right-1.5 h-3 w-3 text-primary" />
                  )}
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </SettingsSection>

      {/* ----------------------- Notifications ----------------------- */}
      <SettingsSection
        icon={<Bell className="h-4 w-4" />}
        title={t("settings.notifications.title")}
        description={t("settings.notifications.description")}
      >
        <SettingRow
          label={t("settings.notifications.weeklySummary")}
          description={t("settings.notifications.weeklyDesc")}
          control={
            <Switch
              checked={current.notifyWeeklySummary}
              onCheckedChange={(v) => setPref("notifyWeeklySummary", v)}
              data-testid="switch-weekly-summary"
            />
          }
        />
        <Separator />
        <SettingRow
          label={t("settings.notifications.repliesPosted")}
          description={t("settings.notifications.repliesPostedDesc")}
          control={
            <Switch
              checked={current.notifyReplies}
              onCheckedChange={(v) => setPref("notifyReplies", v)}
              data-testid="switch-reply-notification"
            />
          }
        />
        <Separator />
        <SettingRow
          label={t("settings.notifications.productUpdates")}
          description={t("settings.notifications.productUpdatesDesc")}
          control={
            <Switch
              checked={current.notifyProductUpdates}
              onCheckedChange={(v) => setPref("notifyProductUpdates", v)}
              data-testid="switch-product-updates"
            />
          }
        />

        <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2.5">
          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {t("settings.notifications.sentTo", { email: user?.email })}
          </p>
        </div>
      </SettingsSection>

      {/* ----------------------- Language & Region ----------------------- */}
      <SettingsSection
        icon={<Globe className="h-4 w-4" />}
        title={t("settings.languageRegion.title")}
        description={t("settings.languageRegion.description")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("settings.languageRegion.language")}
            </Label>
            <Select
              value={current.language}
              onValueChange={(v) => {
                setPref("language", v);
                setLanguage?.(v);
              }}
            >
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ca">Català</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("settings.languageRegion.timezone")}
            </Label>
            <Select
              value={current.timezone}
              onValueChange={(v) => setPref("timezone", v)}
            >
              <SelectTrigger data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="europe/madrid">Europe/Madrid (CET)</SelectItem>
                <SelectItem value="europe/london">Europe/London (GMT)</SelectItem>
                <SelectItem value="europe/paris">Europe/Paris (CET)</SelectItem>
                <SelectItem value="america/new_york">America/New_York (EST)</SelectItem>
                <SelectItem value="america/los_angeles">America/Los_Angeles (PST)</SelectItem>
                <SelectItem value="asia/tokyo">Asia/Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>

      {/* ----------------------- Security ----------------------- */}
      <SettingsSection
        icon={<Shield className="h-4 w-4" />}
        title={t("settings.security.title")}
        description={t("settings.security.description")}
      >
        <SettingRow
          label={t("settings.security.password")}
          description={t("settings.security.passwordDesc")}
          control={
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <a href="/account/password" data-testid="button-change-password">
                <KeyRound className="mr-1.5 h-3 w-3" />
                {t("settings.security.change")}
              </a>
            </Button>
          }
        />
        <Separator />
        <SettingRow
          label={t("settings.security.twoFactor")}
          description={t("settings.security.twoFactorDesc")}
          control={
            <Badge variant="outline" className="h-6 text-[10px]">
              {t("common.comingSoon")}
            </Badge>
          }
        />
        <Separator />
        <SettingRow
          label={t("settings.security.activeSessions")}
          description={t("settings.security.activeSessionsDesc")}
          control={
            <Badge variant="outline" className="h-6 text-[10px]">
              {t("common.comingSoon")}
            </Badge>
          }
        />
      </SettingsSection>

      {/* ----------------------- Danger zone ----------------------- */}
      <SettingsSection
        destructive
        icon={<Trash2 className="h-4 w-4" />}
        title={t("settings.dangerZone.title")}
        description={t("settings.dangerZone.description")}
      >
        <SettingRow
          label={t("settings.dangerZone.exportData")}
          description={t("settings.dangerZone.exportDataDesc")}
          control={
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => exportDataMutation.mutate()}
              disabled={exportDataMutation.isPending}
              data-testid="button-export-data"
            >
              {exportDataMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3 w-3" />
              )}
              {t("settings.dangerZone.export")}
            </Button>
          }
        />
        <Separator />
        <SettingRow
          label={t("settings.dangerZone.signOut")}
          description={t("settings.dangerZone.signOutDesc")}
          control={
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <a href="/api/auth/logout" data-testid="button-logout">
                <LogOut className="mr-1.5 h-3 w-3" />
                {t("common.logout")}
              </a>
            </Button>
          }
        />
        <Separator />
        <SettingRow
          label={t("settings.dangerZone.deleteAccount")}
          description={t("settings.dangerZone.deleteAccountDesc")}
          control={
            <AlertDialog
              onOpenChange={(open) => !open && setDeleteConfirm("")}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  {t("common.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings.dangerZone.confirmDeleteTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      {t("settings.dangerZone.confirmDeleteDesc")}
                    </span>
                    <span className="block text-foreground font-medium">
                      {t("settings.dangerZone.typeToConfirm", {
                        word: "DELETE",
                      })}
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                  data-testid="input-delete-confirm"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={
                      deleteAccountMutation.isPending ||
                      deleteConfirm !== "DELETE"
                    }
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete-account"
                  >
                    {deleteAccountMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("settings.dangerZone.confirmDelete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        />
      </SettingsSection>
    </div>
  );
}