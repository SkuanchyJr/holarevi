import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { User, Bell, Globe, Shield, LogOut, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  
  const hasChanges = user && (firstName !== (user.firstName || "") || lastName !== (user.lastName || ""));

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
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("settings.profile.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.profile.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName">{t("settings.profile.firstName")}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-2"
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">{t("settings.profile.lastName")}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-2"
                data-testid="input-last-name"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="email">{t("settings.profile.email")}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="mt-2"
                data-testid="input-email"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t("settings.profile.emailManagedByProvider")}
              </p>
            </div>
          </div>
          {hasChanges && (
            <Button
              onClick={() => updateProfileMutation.mutate({ firstName, lastName })}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("common.saveChanges")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("settings.notifications.title")}
            <Badge variant="outline" className="ml-auto text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
              {t("common.comingSoon").toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t("settings.notifications.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.notifications.email")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.notifications.emailDesc")}
              </p>
            </div>
            <Switch data-testid="switch-email-notifications" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.notifications.negativeAlerts")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.notifications.negativeAlertsDesc")}
              </p>
            </div>
            <Switch data-testid="switch-negative-alerts" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.notifications.weeklySummary")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.notifications.weeklySummaryDesc")}
              </p>
            </div>
            <Switch data-testid="switch-weekly-summary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.languageRegion.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.languageRegion.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label>{t("settings.languageRegion.timezone")}</Label>
            <Select defaultValue="europe/madrid">
              <SelectTrigger className="mt-2 max-w-sm" data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="europe/madrid">Europe/Madrid (CET)</SelectItem>
                <SelectItem value="europe/london">Europe/London (GMT)</SelectItem>
                <SelectItem value="america/new_york">America/New_York (EST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("settings.security.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.security.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.security.twoFactor")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.security.twoFactorDesc")}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              {t("common.comingSoon")}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.security.activeSessions")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.security.activeSessionsDesc")}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              {t("settings.security.viewSessions")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">{t("settings.dangerZone.title")}</CardTitle>
          <CardDescription>
            {t("settings.dangerZone.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.dangerZone.signOut")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.dangerZone.signOutDesc")}
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/api/logout" data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                {t("common.logout")}
              </a>
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.dangerZone.deleteAccount")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.dangerZone.deleteAccountDesc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-delete-account">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("common.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.dangerZone.confirmDeleteTitle")}</AlertDialogTitle>
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
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {t("settings.dangerZone.confirmDelete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
