import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import notificationImage from "@assets/image_1776346833496.png";

function SettingsSection({
  icon,
  title,
  description,
  badge,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden",
        className,
      )}
    >
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
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

export default function Settings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

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

  const hasChanges =
    user &&
    (firstName !== (user.firstName || "") ||
      lastName !== (user.lastName || ""));

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

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      "U"
    : "U";

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {/* Profile */}
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
          <div>
            <p className="font-semibold text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
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

        {hasChanges && (
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
        )}
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={<Bell className="h-4 w-4" />}
        title={t("settings.notifications.title")}
        description={t("settings.notifications.description")}
      >
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-start gap-3">
              <img
                src={notificationImage}
                alt={t("settings.notifications.title")}
                className="h-12 w-12 rounded-md object-cover"
                data-testid="img-notifications-preview"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {t("settings.notifications.receiveEmails")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.notifications.receiveEmailsDesc")}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <SettingRow
              label={t("settings.notifications.weeklySummaryActive")}
              description={t("settings.notifications.weeklySummaryActiveDesc")}
              control={
                <Badge variant="secondary" data-testid="badge-weekly-summary">
                  {t("settings.notifications.active")}
                </Badge>
              }
            />
            <Separator />
            <SettingRow
              label={t("settings.notifications.replyNotification")}
              description={t("settings.notifications.replyNotificationDesc")}
              control={
                <Badge
                  variant="secondary"
                  data-testid="badge-reply-notification"
                >
                  {t("settings.notifications.active")}
                </Badge>
              }
            />
            <Separator />
            <div className="flex items-start gap-3 rounded-md bg-muted/30 px-3 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {t("settings.notifications.noControls")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {t("settings.notifications.weeklySummary")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.weeklyDesc")}
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {t("settings.notifications.weekly")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.weeklyDesc")}
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {t("settings.notifications.repliesPosted")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.repliesPostedDesc")}
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Language & Region */}
      <SettingsSection
        icon={<Globe className="h-4 w-4" />}
        title={t("settings.languageRegion.title")}
        description={t("settings.languageRegion.description")}
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("settings.languageRegion.timezone")}
          </Label>
          <Select defaultValue="europe/madrid">
            <SelectTrigger className="max-w-xs" data-testid="select-timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="europe/madrid">Europe/Madrid (CET)</SelectItem>
              <SelectItem value="europe/london">Europe/London (GMT)</SelectItem>
              <SelectItem value="america/new_york">
                America/New_York (EST)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        icon={<Shield className="h-4 w-4" />}
        title={t("settings.security.title")}
        description={t("settings.security.description")}
      >
        <SettingRow
          label={t("settings.security.twoFactor")}
          description={t("settings.security.twoFactorDesc")}
          control={
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-7 text-xs"
            >
              {t("common.comingSoon")}
            </Button>
          }
        />
        <Separator />
        <SettingRow
          label={t("settings.security.activeSessions")}
          description={t("settings.security.activeSessionsDesc")}
          control={
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-7 text-xs"
            >
              {t("settings.security.viewSessions")}
            </Button>
          }
        />
      </SettingsSection>

      {/* Danger zone */}
      <SettingsSection
        icon={<Trash2 className="h-4 w-4 text-destructive" />}
        title={t("settings.dangerZone.title")}
        description={t("settings.dangerZone.description")}
        className="border-destructive/30"
      >
        <SettingRow
          label={t("settings.dangerZone.signOut")}
          description={t("settings.dangerZone.signOutDesc")}
          control={
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
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
            <AlertDialog>
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
                  <AlertDialogDescription>
                    {t("settings.dangerZone.confirmDeleteDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete-account"
                  >
                    {deleteAccountMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
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
