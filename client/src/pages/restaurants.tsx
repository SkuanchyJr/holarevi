import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  Plus,
  Loader2,
  MapPin,
  Link2,
  RefreshCw,
  Building2,
  Zap,
  Settings2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { LocationConfigSheet } from "@/components/location-config-sheet";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Restaurant, TonePreset } from "@shared/schema";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

const addRestaurantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  address: z.string().optional(),
  toneOfVoice: z.string().default("friendly"),
});

type AddRestaurantForm = z.infer<typeof addRestaurantSchema>;

function RestaurantCard({
  restaurant,
  onOpenConfig,
  onConnectGoogle,
  onSelectLocation,
  isSyncing,
  t,
}: {
  restaurant: Restaurant;
  onOpenConfig: () => void;
  onConnectGoogle: () => void;
  onSelectLocation: () => void;
  isSyncing: boolean;
  t: (key: string) => string;
}) {
  const hasGoogleAccount = Boolean(restaurant.googleAccountId);
  const hasGoogleLocation = Boolean(restaurant.googleLocationId);
  const isFullyConnected = restaurant.isConnected && hasGoogleAccount && hasGoogleLocation;
  const needsGoogleConnect = !restaurant.isConnected || !hasGoogleAccount;
  const needsLocationSelect = restaurant.isConnected && hasGoogleAccount && !hasGoogleLocation;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-border/80 transition-colors">
      {/* Top bar with status */}
      <div className={cn(
        "h-1 w-full",
        isFullyConnected ? "bg-green-500" : needsLocationSelect ? "bg-amber-500" : "bg-muted"
      )} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              isFullyConnected ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
            )}>
              <Store className={cn("h-5 w-5", isFullyConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground")} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{restaurant.name}</h3>
              {restaurant.address && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {restaurant.address}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {isFullyConnected ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                <CheckCircle className="h-3 w-3" />
                {t("restaurants.card.connected")}
              </span>
            ) : needsLocationSelect ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
                <Building2 className="h-3 w-3" />
                {t("restaurants.card.pendingLocation")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">
                <XCircle className="h-3 w-3" />
                {t("restaurants.card.notConnected")}
              </span>
            )}
          </div>
        </div>

        {/* Status pills */}
        {isFullyConnected && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              restaurant.autoPostEnabled
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-muted text-muted-foreground"
            )}>
              <Zap className="inline h-2.5 w-2.5 mr-1" />
              Auto-Publish: {restaurant.autoPostEnabled ? "ON" : "OFF"}
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              restaurant.autoSyncReviews
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}>
              <RefreshCw className="inline h-2.5 w-2.5 mr-1" />
              Auto-Sync: {restaurant.autoSyncReviews ? "ON" : "OFF"}
            </span>
          </div>
        )}

        {!isFullyConnected && (
          <p className="text-xs text-muted-foreground mb-4">
            {t("restaurants.card.connectToEnable")}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {needsGoogleConnect && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={onConnectGoogle}
              data-testid={`button-connect-google-${restaurant.id}`}
            >
              <Link2 className="h-3.5 w-3.5" />
              {t("restaurants.card.connectGoogle")}
            </Button>
          )}
          {needsLocationSelect && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={onSelectLocation}
              data-testid={`button-select-location-${restaurant.id}`}
            >
              <Building2 className="h-3.5 w-3.5" />
              {t("restaurants.card.selectLocation")}
            </Button>
          )}
          <Button
            size="sm"
            variant={isFullyConnected ? "default" : "outline"}
            className="h-8 text-xs gap-1.5"
            onClick={onOpenConfig}
            data-testid={`button-config-${restaurant.id}`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {t("restaurants.card.configuration")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Restaurants() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [configSheetOpen, setConfigSheetOpen] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [syncingRestaurantId, setSyncingRestaurantId] = useState<string | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [googleLocations, setGoogleLocations] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const form = useForm<AddRestaurantForm>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: { name: "", address: "", toneOfVoice: "friendly" },
  });

  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: tonePresets } = useQuery<TonePreset[]>({
    queryKey: ["/api/tone-presets"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddRestaurantForm) => await apiRequest("POST", "/api/restaurants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: t("restaurants.toasts.added"), description: t("restaurants.toasts.addedDesc") });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: t("restaurants.toasts.error"), description: t("restaurants.toasts.errorAdd"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Restaurant> }) =>
      await apiRequest("PATCH", `/api/restaurants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/restaurants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: t("restaurants.toasts.deleted"), description: t("restaurants.toasts.deletedDesc") });
    },
  });

  const handleOpenConfig = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setConfigSheetOpen(true);
  };

  const handleSaveConfig = async (config: Partial<Restaurant>) => {
    if (!selectedRestaurant) return;
    setConfigSaving(true);
    try {
      await apiRequest("PATCH", `/api/restaurants/${selectedRestaurant.id}`, config);
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: t("restaurants.toasts.updated"), description: t("restaurants.toasts.updatedDesc") });
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: "Failed to save configuration.", variant: "destructive" });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleDeleteFromConfig = () => {
    if (!selectedRestaurant) return;
    deleteMutation.mutate(selectedRestaurant.id);
    setConfigSheetOpen(false);
  };

  const handleSyncFromConfig = () => {
    if (selectedRestaurant) handleSyncReviews(selectedRestaurant);
  };

  const handleConnectGoogle = async (restaurant: Restaurant) => {
    try {
      const response = await fetch(`/api/google/connect/${restaurant.id}`, { credentials: "include" });
      if (!response.ok) {
        const data = await response.json();
        toast({ title: t("restaurants.toasts.googleNotConfigured"), description: data.message, variant: "destructive" });
        return;
      }
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: "Failed to connect to Google.", variant: "destructive" });
    }
  };

  const handleSyncReviews = async (restaurant: Restaurant) => {
    setSyncingRestaurantId(restaurant.id);
    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}/sync-reviews`, { method: "POST", credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        if (data.needsLocationSelection) { handleSelectLocation(restaurant); }
        else { toast({ title: t("restaurants.toasts.error"), description: data.message || t("restaurants.toasts.errorSync"), variant: "destructive" }); }
        return;
      }
      toast({ title: t("restaurants.toasts.synced"), description: t("restaurants.toasts.syncedDesc").replace("{count}", data.synced) });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: t("restaurants.toasts.errorSync"), variant: "destructive" });
    } finally {
      setSyncingRestaurantId(null);
    }
  };

  const handleSelectLocation = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setGoogleAccounts([]);
    setGoogleLocations([]);
    setSelectedAccountId("");
    setLoadingAccounts(true);
    setLocationDialogOpen(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}/google/accounts`, { credentials: "include" });
      if (!response.ok) throw new Error();
      const accounts = await response.json();
      setGoogleAccounts(accounts);
      if (accounts.length === 1) {
        const accountId = accounts[0].name?.replace("accounts/", "") || accounts[0].name;
        await handleAccountSelectWithAutoLocation(restaurant, accountId);
      }
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: "Failed to fetch Google accounts.", variant: "destructive" });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAccountSelectWithAutoLocation = async (restaurant: Restaurant, accountId: string) => {
    setSelectedAccountId(accountId);
    setGoogleLocations([]);
    setLoadingLocations(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}/google/locations/${accountId}`, { credentials: "include" });
      if (!response.ok) throw new Error();
      const locations = await response.json();
      setGoogleLocations(locations);
      if (locations.length === 1) {
        const locationId = locations[0].name?.replace(/^locations\//, "") || locations[0].name;
        await handleLocationSelectDirect(restaurant, accountId, locationId);
      }
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: "Failed to fetch business locations.", variant: "destructive" });
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleAccountSelect = async (accountId: string) => {
    if (!selectedRestaurant) return;
    setSelectedAccountId(accountId);
    setGoogleLocations([]);
    setLoadingLocations(true);
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/google/locations/${accountId}`, { credentials: "include" });
      if (!response.ok) throw new Error();
      const locations = await response.json();
      setGoogleLocations(locations);
      if (locations.length === 1) {
        const locationId = locations[0].name?.replace(/^locations\//, "") || locations[0].name;
        await handleLocationSelectDirect(selectedRestaurant, accountId, locationId);
      }
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: "Failed to fetch business locations.", variant: "destructive" });
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleLocationSelectDirect = async (restaurant: Restaurant, accountId: string, locationId: string) => {
    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}/google/select-location`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ accountId, locationId }),
      });
      if (!response.ok) throw new Error();
      toast({ title: t("restaurants.toasts.locationConnected"), description: t("restaurants.toasts.locationConnectedDesc") });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setLocationDialogOpen(false);
      const updatedRestaurant = await response.json();
      if (updatedRestaurant) handleSyncReviews(updatedRestaurant);
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: "Failed to save location selection.", variant: "destructive" });
    }
  };

  const handleLocationSelect = async (locationId: string) => {
    if (!selectedRestaurant || !selectedAccountId) return;
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/google/select-location`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ accountId: selectedAccountId, locationId }),
      });
      if (!response.ok) throw new Error();
      toast({ title: t("restaurants.toasts.locationConnected"), description: t("restaurants.toasts.locationConnectedDesc") });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setLocationDialogOpen(false);
      const updatedRestaurant = await response.json();
      if (updatedRestaurant) handleSyncReviews(updatedRestaurant);
    } catch {
      toast({ title: t("restaurants.toasts.error"), description: "Failed to save location selection.", variant: "destructive" });
    }
  };

  const connectedCount = restaurants?.filter(r => r.isConnected).length || 0;
  const autoPostCount = restaurants?.filter(r => r.autoPostEnabled).length || 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("restaurants.title")}
        subtitle={t("restaurants.subtitle")}
        actions={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-restaurant">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("restaurants.addRestaurant")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("restaurants.addDialog.title")}</DialogTitle>
                <DialogDescription>{t("restaurants.addDialog.description")}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 pt-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("restaurants.addDialog.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("restaurants.addDialog.namePlaceholder")} {...field} data-testid="input-restaurant-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("restaurants.addDialog.address")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("restaurants.addDialog.addressPlaceholder")} {...field} data-testid="input-restaurant-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="toneOfVoice" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("restaurants.addDialog.tone")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tone"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="friendly">{t("restaurants.addDialog.tones.friendly")}</SelectItem>
                          <SelectItem value="formal">{t("restaurants.addDialog.tones.formal")}</SelectItem>
                          <SelectItem value="casual">{t("restaurants.addDialog.tones.casual")}</SelectItem>
                          <SelectItem value="mediterranean">{t("restaurants.addDialog.tones.mediterranean")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t("restaurants.addDialog.toneDescription")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>{t("common.cancel")}</Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-restaurant">
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("restaurants.addRestaurant")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary strip */}
      {restaurants && restaurants.length > 0 && (
        <div className="flex items-center gap-6 px-4 py-3 rounded-xl border border-border bg-card text-sm">
          <span className="text-muted-foreground">{t("restaurants.total")}: <strong className="text-foreground">{restaurants.length}</strong></span>
          <span className="text-muted-foreground">{t("restaurants.connected")}: <strong className="text-green-600 dark:text-green-400">{connectedCount}</strong></span>
          <span className="text-muted-foreground">{t("restaurants.autoPost")}: <strong className="text-blue-600 dark:text-blue-400">{autoPostCount}</strong></span>
        </div>
      )}

      {/* Restaurant grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : restaurants && restaurants.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onOpenConfig={() => handleOpenConfig(restaurant)}
              onConnectGoogle={() => handleConnectGoogle(restaurant)}
              onSelectLocation={() => handleSelectLocation(restaurant)}
              isSyncing={syncingRestaurantId === restaurant.id}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={<Store className="h-5 w-5" />}
            title={t("restaurants.noRestaurants")}
            description={t("restaurants.noRestaurantsDesc")}
            action={
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("restaurants.addRestaurant")}
              </Button>
            }
          />
        </div>
      )}

      {/* Location Selection Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("restaurants.locationDialog.title")}</DialogTitle>
            <DialogDescription>{t("restaurants.locationDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("restaurants.locationDialog.loadingAccounts")}</span>
              </div>
            ) : googleAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t("restaurants.locationDialog.noAccounts")}</div>
            ) : (
              <>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                    {t("restaurants.locationDialog.selectAccount")}
                  </Label>
                  <Select value={selectedAccountId} onValueChange={handleAccountSelect}>
                    <SelectTrigger data-testid="select-google-account">
                      <SelectValue placeholder={t("restaurants.locationDialog.selectAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      {googleAccounts.map((account) => (
                        <SelectItem key={account.name} value={account.name?.replace("accounts/", "") || account.name}>
                          {account.accountName || account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAccountId && (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                      {t("restaurants.locationDialog.selectLocation")}
                    </Label>
                    {loadingLocations ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t("restaurants.locationDialog.loadingLocations")}</span>
                      </div>
                    ) : googleLocations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("restaurants.locationDialog.noLocations")}</p>
                    ) : (
                      <div className="space-y-2">
                        {googleLocations.map((location) => (
                          <button
                            key={location.name}
                            className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                            onClick={() => handleLocationSelect(location.name?.replace(/^locations\//, "") || location.name)}
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{location.title || location.locationName}</p>
                              {location.storefrontAddress && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {[location.storefrontAddress.addressLines?.join(", "), location.storefrontAddress.locality, location.storefrontAddress.postalCode].filter(Boolean).join(", ")}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>{t("common.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Config Sheet */}
      <LocationConfigSheet
        restaurant={selectedRestaurant}
        open={configSheetOpen}
        onOpenChange={setConfigSheetOpen}
        onSave={handleSaveConfig}
        onSyncReviews={handleSyncFromConfig}
        onDelete={handleDeleteFromConfig}
        isSyncing={syncingRestaurantId === selectedRestaurant?.id}
        isSaving={configSaving}
      />
    </div>
  );
}
