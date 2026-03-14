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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Store,
  Plus,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  MapPin,
  Link2,
  RefreshCw,
  Building2,
  Zap,
  Settings2,
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
  t,
}: {
  restaurant: Restaurant;
  onOpenConfig: () => void;
  onConnectGoogle: () => void;
  onSelectLocation: () => void;
  t: (key: string) => string;
}) {
  const getToneLabel = (tone: string) => {
    const key = `restaurants.addDialog.tones.${tone}`;
    return t(key);
  };

  // Connection status checks based on actual backend fields
  const hasGoogleAccount = Boolean(restaurant.googleAccountId);
  const hasGoogleLocation = Boolean(restaurant.googleLocationId);
  const isFullyConnected = restaurant.isConnected && hasGoogleAccount && hasGoogleLocation;
  const needsGoogleConnect = !restaurant.isConnected || !hasGoogleAccount;
  const needsLocationSelect = restaurant.isConnected && hasGoogleAccount && !hasGoogleLocation;

  return (
    <Card className="hover-elevate">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Left side: Info */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Store className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{restaurant.name}</h3>
                {isFullyConnected ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {t("restaurants.card.connected")}
                  </Badge>
                ) : needsLocationSelect ? (
                  <Badge
                    variant="secondary"
                    className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                  >
                    <Building2 className="mr-1 h-3 w-3" />
                    {t("restaurants.card.pendingLocation") || "Seleccionar ubicación"}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                  >
                    <Link2 className="mr-1 h-3 w-3" />
                    {t("restaurants.card.notConnected")}
                  </Badge>
                )}
              </div>

              {restaurant.address && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{restaurant.address}</span>
                </div>
              )}

              {/* Status indicators - only show when fully connected */}
              {isFullyConnected ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-xs">
                    {getToneLabel(restaurant.toneOfVoice || "friendly")}{" "}
                    {t("restaurants.card.tone")}
                  </Badge>
                  {restaurant.autoPostEnabled ? (
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs"
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      Auto-Publish: ON
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Auto-Publish: OFF
                    </Badge>
                  )}
                  {restaurant.autoSyncReviews ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Auto-Sync: ON
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Auto-Sync: OFF
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pt-1">
                  {t("restaurants.card.connectToEnable") || "Conecta con Google para habilitar funciones"}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Action buttons */}
          <div className="flex flex-col items-stretch gap-2 md:items-end">
            {needsGoogleConnect && (
              <Button
                onClick={onConnectGoogle}
                className="gap-2"
                data-testid={`button-connect-google-${restaurant.id}`}
              >
                <Link2 className="h-4 w-4" />
                {t("restaurants.card.connectGoogle") || "Conectar con Google"}
              </Button>
            )}
            {needsLocationSelect && (
              <Button
                onClick={onSelectLocation}
                className="gap-2"
                data-testid={`button-select-location-${restaurant.id}`}
              >
                <Building2 className="h-4 w-4" />
                {t("restaurants.card.selectLocation") || "Seleccionar Ubicación"}
              </Button>
            )}
            <Button
              onClick={onOpenConfig}
              variant={isFullyConnected ? "default" : "outline"}
              className="gap-2"
              data-testid={`button-config-${restaurant.id}`}
            >
              <Settings2 className="h-4 w-4" />
              {t("restaurants.card.configuration") || "Configuration"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Restaurants() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [configSheetOpen, setConfigSheetOpen] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [syncingRestaurantId, setSyncingRestaurantId] = useState<string | null>(
    null,
  );
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [googleLocations, setGoogleLocations] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const form = useForm<AddRestaurantForm>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: {
      name: "",
      address: "",
      toneOfVoice: "friendly",
    },
  });

  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: tonePresets } = useQuery<TonePreset[]>({
    queryKey: ["/api/tone-presets"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddRestaurantForm) => {
      return await apiRequest("POST", "/api/restaurants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({
        title: t("restaurants.toasts.added"),
        description: t("restaurants.toasts.addedDesc"),
      });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: t("restaurants.toasts.error"),
        description: t("restaurants.toasts.errorAdd"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Restaurant>;
    }) => {
      return await apiRequest("PATCH", `/api/restaurants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({
        title: t("restaurants.toasts.updated"),
        description: t("restaurants.toasts.updatedDesc"),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/restaurants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({
        title: t("restaurants.toasts.deleted"),
        description: t("restaurants.toasts.deletedDesc"),
      });
    },
  });

  const handleToggleAutoPost = (restaurant: Restaurant, enabled: boolean) => {
    updateMutation.mutate({
      id: restaurant.id,
      data: { autoPostEnabled: enabled },
    });
  };

  const autoSyncMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return await apiRequest("PATCH", `/api/restaurants/${id}/auto-sync`, { enabled });
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({
        title: enabled ? t("restaurants.toasts.autoSyncEnabled") : t("restaurants.toasts.autoSyncDisabled"),
        description: enabled ? t("restaurants.toasts.autoSyncEnabledDesc") : t("restaurants.toasts.autoSyncDisabledDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("restaurants.toasts.error"),
        description: t("restaurants.toasts.errorAutoSync"),
        variant: "destructive",
      });
    },
  });

  const handleToggleAutoSync = (restaurant: Restaurant, enabled: boolean) => {
    autoSyncMutation.mutate({ id: restaurant.id, enabled });
  };

  const handleOpenSettings = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setSettingsDialogOpen(true);
  };

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
      toast({
        title: "Configuration saved",
        description: "Location settings have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration.",
        variant: "destructive",
      });
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
    if (!selectedRestaurant) return;
    handleSyncReviews(selectedRestaurant);
  };

  const handleConnectGoogle = async (restaurant: Restaurant) => {
    try {
      const response = await fetch(`/api/google/connect/${restaurant.id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: t("restaurants.toasts.googleNotConfigured"),
          description:
            data.message ||
            "Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.",
          variant: "destructive",
        });
        return;
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: t("restaurants.toasts.error"),
        description: "Failed to connect to Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSyncReviews = async (restaurant: Restaurant) => {
    setSyncingRestaurantId(restaurant.id);
    try {
      const response = await fetch(
        `/api/restaurants/${restaurant.id}/sync-reviews`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.needsLocationSelection) {
          handleSelectLocation(restaurant);
        } else {
          toast({
            title: t("restaurants.toasts.error"),
            description: data.message || t("restaurants.toasts.errorSync"),
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: t("restaurants.toasts.synced"),
        description: t("restaurants.toasts.syncedDesc").replace(
          "{count}",
          data.synced,
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    } catch (error) {
      toast({
        title: t("restaurants.toasts.error"),
        description: t("restaurants.toasts.errorSync"),
        variant: "destructive",
      });
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
      const response = await fetch(
        `/api/restaurants/${restaurant.id}/google/accounts`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }

      const accounts = await response.json();
      setGoogleAccounts(accounts);

      if (accounts.length === 1) {
        const accountId =
          accounts[0].name?.replace("accounts/", "") || accounts[0].name;
        await handleAccountSelectWithAutoLocation(restaurant, accountId);
      }
    } catch (error) {
      toast({
        title: t("restaurants.toasts.error"),
        description: "Failed to fetch Google accounts.",
        variant: "destructive",
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAccountSelectWithAutoLocation = async (
    restaurant: Restaurant,
    accountId: string,
  ) => {
    setSelectedAccountId(accountId);
    setGoogleLocations([]);
    setLoadingLocations(true);

    try {
      const response = await fetch(
        `/api/restaurants/${restaurant.id}/google/locations/${accountId}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }

      const locations = await response.json();
      setGoogleLocations(locations);

      if (locations.length === 1) {
        const locationId =
          locations[0].name?.replace(/^locations\//, "") || locations[0].name;
        await handleLocationSelectDirect(restaurant, accountId, locationId);
      }
    } catch (error) {
      toast({
        title: t("restaurants.toasts.error"),
        description: "Failed to fetch business locations.",
        variant: "destructive",
      });
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
      const response = await fetch(
        `/api/restaurants/${selectedRestaurant.id}/google/locations/${accountId}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }

      const locations = await response.json();
      setGoogleLocations(locations);

      if (locations.length === 1) {
        const locationId =
          locations[0].name?.replace(/^locations\//, "") || locations[0].name;
        await handleLocationSelectDirect(
          selectedRestaurant,
          accountId,
          locationId,
        );
      }
    } catch (error) {
      toast({
        title: t("restaurants.toasts.error"),
        description: "Failed to fetch business locations.",
        variant: "destructive",
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleLocationSelectDirect = async (
    restaurant: Restaurant,
    accountId: string,
    locationId: string,
  ) => {
    try {
      const response = await fetch(
        `/api/restaurants/${restaurant.id}/google/select-location`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountId: accountId,
            locationId: locationId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save location");
      }

      toast({
        title: t("restaurants.toasts.locationConnected"),
        description: t("restaurants.toasts.locationConnectedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setLocationDialogOpen(false);

      const updatedRestaurant = await response.json();
      if (updatedRestaurant) {
        handleSyncReviews(updatedRestaurant);
      }
    } catch (error) {
      toast({
        title: t("restaurants.toasts.error"),
        description: "Failed to save location selection.",
        variant: "destructive",
      });
    }
  };

  const handleLocationSelect = async (locationId: string) => {
    if (!selectedRestaurant || !selectedAccountId) return;

    try {
      const response = await fetch(
        `/api/restaurants/${selectedRestaurant.id}/google/select-location`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accountId: selectedAccountId,
            locationId: locationId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save location");
      }

      toast({
        title: t("restaurants.toasts.locationConnected"),
        description: t("restaurants.toasts.locationConnectedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setLocationDialogOpen(false);

      const updatedRestaurant = await response.json();
      if (updatedRestaurant) {
        handleSyncReviews(updatedRestaurant);
      }
    } catch (error) {
      toast({
        title: t("restaurants.toasts.error"),
        description: "Failed to save location selection.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: AddRestaurantForm) => {
    createMutation.mutate(data);
  };

  const totalRestaurants = restaurants?.length ?? 0;
  const connectedRestaurants = restaurants
    ? restaurants.filter((r) => r.isConnected).length
    : 0;
  const autoPostEnabledCount = restaurants
    ? restaurants.filter((r) => r.autoPostEnabled).length
    : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* PANEL LATERAL IZQUIERDO */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                {t("restaurants.title")}
              </CardTitle>
              <CardDescription>{t("restaurants.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    data-testid="button-add-restaurant"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("restaurants.addRestaurant")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t("restaurants.addDialog.title")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("restaurants.addDialog.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("restaurants.addDialog.name")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "restaurants.addDialog.namePlaceholder",
                                )}
                                {...field}
                                data-testid="input-restaurant-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("restaurants.addDialog.address")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "restaurants.addDialog.addressPlaceholder",
                                )}
                                {...field}
                                data-testid="input-restaurant-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="toneOfVoice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("restaurants.addDialog.tone")}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-tone">
                                  <SelectValue placeholder="Select tone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="friendly">
                                  {t("restaurants.addDialog.tones.friendly")}
                                </SelectItem>
                                <SelectItem value="formal">
                                  {t("restaurants.addDialog.tones.formal")}
                                </SelectItem>
                                <SelectItem value="casual">
                                  {t("restaurants.addDialog.tones.casual")}
                                </SelectItem>
                                <SelectItem value="mediterranean">
                                  {t(
                                    "restaurants.addDialog.tones.mediterranean",
                                  )}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t("restaurants.addDialog.toneDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddDialogOpen(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending}
                          data-testid="button-save-restaurant"
                        >
                          {createMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {t("restaurants.addRestaurant")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <p className="text-xs text-muted-foreground">
                {t("restaurants.subtitle")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {t("restaurants.overview") ?? "Overview"}
              </CardTitle>
              <CardDescription>
                {t("restaurants.overviewDescription") ??
                  "Resumen rápido de tus locales."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("restaurants.total") ?? "Total"}
                </p>
                <p className="mt-1 text-lg font-semibold">{totalRestaurants}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("restaurants.connected") ?? "Conectados"}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {connectedRestaurants}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("restaurants.autoPost") ?? "Auto-post ON"}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {autoPostEnabledCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* COLUMNA DERECHA: LISTA + HEADER */}
        <main className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {t("restaurants.listTitle") ?? t("restaurants.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("restaurants.listSubtitle") ??
                  "Gestiona tus locales, conecta Google y controla el auto-post."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                {t("restaurants.filter.all") ?? "Todos"}
              </Badge>
              <Badge variant="outline">
                {t("restaurants.filter.connected") ?? "Conectados"}
              </Badge>
              <Badge variant="outline">
                {t("restaurants.filter.disconnected") ?? "Sin conectar"}
              </Badge>
              <Badge variant="outline">
                {t("restaurants.filter.autoPost") ?? "Auto-post ON"}
              </Badge>
            </div>
          </div>

          {/* Restaurant List */}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : restaurants && restaurants.length > 0 ? (
              restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onOpenConfig={() => handleOpenConfig(restaurant)}
                  onConnectGoogle={() => handleConnectGoogle(restaurant)}
                  onSelectLocation={() => handleSelectLocation(restaurant)}
                  t={t}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">
                    {t("restaurants.noRestaurants")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("restaurants.noRestaurantsDesc")}
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("restaurants.addRestaurant")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("restaurants.card.settings")}</DialogTitle>
            <DialogDescription>{selectedRestaurant?.name}</DialogDescription>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="space-y-4">
              <div>
                <Label>{t("restaurants.settings.tonePreset")}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("restaurants.settings.tonePresetDescription")}
                </p>
                <Select
                  value={selectedRestaurant.tonePresetId || "none"}
                  onValueChange={(value) => {
                    const newPresetId = value === "none" ? null : value;
                    updateMutation.mutate({
                      id: selectedRestaurant.id,
                      data: { tonePresetId: newPresetId },
                    });
                    setSelectedRestaurant({
                      ...selectedRestaurant,
                      tonePresetId: newPresetId,
                    });
                  }}
                >
                  <SelectTrigger
                    className="mt-2"
                    data-testid="select-settings-tone-preset"
                  >
                    <SelectValue placeholder={t("restaurants.settings.selectPreset")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("restaurants.settings.noPreset")}
                    </SelectItem>
                    {tonePresets?.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name} ({preset.style})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("restaurants.addDialog.tone")}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("restaurants.settings.defaultToneDescription")}
                </p>
                <Select
                  value={selectedRestaurant.toneOfVoice || "friendly"}
                  onValueChange={(value) => {
                    updateMutation.mutate({
                      id: selectedRestaurant.id,
                      data: { toneOfVoice: value },
                    });
                    setSelectedRestaurant({
                      ...selectedRestaurant,
                      toneOfVoice: value,
                    });
                  }}
                >
                  <SelectTrigger
                    className="mt-2"
                    data-testid="select-settings-tone"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">
                      {t("restaurants.addDialog.tones.friendly")}
                    </SelectItem>
                    <SelectItem value="formal">
                      {t("restaurants.addDialog.tones.formal")}
                    </SelectItem>
                    <SelectItem value="casual">
                      {t("restaurants.addDialog.tones.casual")}
                    </SelectItem>
                    <SelectItem value="mediterranean">
                      {t("restaurants.addDialog.tones.mediterranean")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("restaurants.card.autoPost")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("restaurants.addDialog.toneDescription")}
                  </p>
                </div>
                <Switch
                  checked={selectedRestaurant.autoPostEnabled || false}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({
                      id: selectedRestaurant.id,
                      data: { autoPostEnabled: checked },
                    });
                    setSelectedRestaurant({
                      ...selectedRestaurant,
                      autoPostEnabled: checked,
                    });
                  }}
                  data-testid="switch-settings-auto-post"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSettingsDialogOpen(false)}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Selection Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("restaurants.locationDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("restaurants.locationDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">
                  {t("restaurants.locationDialog.loadingAccounts")}
                </span>
              </div>
            ) : googleAccounts.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t("restaurants.locationDialog.noAccounts")}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label>{t("restaurants.locationDialog.selectAccount")}</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={handleAccountSelect}
                  >
                    <SelectTrigger
                      className="mt-2"
                      data-testid="select-google-account"
                    >
                      <SelectValue
                        placeholder={t(
                          "restaurants.locationDialog.selectAccount",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {googleAccounts.map((account) => (
                        <SelectItem
                          key={account.name}
                          value={
                            account.name?.replace("accounts/", "") ||
                            account.name
                          }
                        >
                          {account.accountName || account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAccountId && (
                  <div>
                    <Label>
                      {t("restaurants.locationDialog.selectLocation")}
                    </Label>
                    {loadingLocations ? (
                      <div className="flex items-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          {t("restaurants.locationDialog.loadingLocations")}
                        </span>
                      </div>
                    ) : googleLocations.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">
                        {t("restaurants.locationDialog.noLocations")}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {googleLocations.map((location) => (
                          <Card
                            key={location.name}
                            className="cursor-pointer hover-elevate"
                            onClick={() =>
                              handleLocationSelect(
                                location.name?.replace(/^locations\//, "") ||
                                  location.name,
                              )
                            }
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">
                                    {location.title || location.locationName}
                                  </p>
                                  {location.storefrontAddress && (
                                    <p className="text-sm text-muted-foreground">
                                      {[
                                        location.storefrontAddress.addressLines?.join(
                                          ", ",
                                        ),
                                        location.storefrontAddress.locality,
                                        location.storefrontAddress.postalCode,
                                      ]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLocationDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Configuration Sheet */}
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
  