import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  MessageSquare,
  Clock,
  Loader2,
  Lock,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Building2,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { LocationOverview } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

function LocationCard({ location }: { location: LocationOverview }) {
  const { t } = useLanguage();

  return (
    <Card
      className="hover-elevate cursor-pointer"
      data-testid={`card-location-${location.id}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{location.name}</h3>
              {location.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location.address}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={location.isConnected ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {location.isConnected ? (
              <>
                <CheckCircle className="w-3 h-3" />
                {t("locations.connected")}
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                {t("locations.notConnected")}
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {location.reviewCount}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("locations.stats.reviews")}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {location.replyCount}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("locations.stats.replies")}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
              {location.averageRating.toFixed(1)}
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div className="text-xs text-muted-foreground">
              {t("locations.stats.avgRating")}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-500">
              {location.pendingReplies}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("locations.stats.pending")}
            </div>
          </div>
        </div>

        {location.lastReviewDate && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t("locations.lastReview")}
            </span>
            <span>
              {formatDistanceToNow(new Date(location.lastReviewDate), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Locations() {
  const { t } = useLanguage();
  const {
    data: locations,
    isLoading,
    error,
  } = useQuery<LocationOverview[]>({
    queryKey: ["/api/locations/overview"],
  });

  const { data: planInfo } = useQuery<any>({
    queryKey: ["/api/plan-info"],
  });

  const hasAccess = planInfo?.features?.hasMultiLocationDashboard;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="p-6">
        <div className="max-w-4xl py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">
                {t("locations.title")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("locations.upgradeMessage")}
              </p>
              <Link href="/billing">
                <Button data-testid="button-upgrade-locations">
                  {t("locations.upgradePlan")}
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalReviews =
    locations?.reduce((sum, loc) => sum + loc.reviewCount, 0) || 0;
  const totalReplies =
    locations?.reduce((sum, loc) => sum + loc.replyCount, 0) || 0;
  const totalPending =
    locations?.reduce((sum, loc) => sum + loc.pendingReplies, 0) || 0;
  const avgRating = locations?.length
    ? locations.reduce(
        (sum, loc) => sum + loc.averageRating * loc.reviewCount,
        0,
      ) / (locations.reduce((sum, loc) => sum + loc.reviewCount, 0) || 1)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-locations-title">
          {t("locations.title")}
        </h1>
        <p className="text-muted-foreground">{t("locations.subtitle")}</p>
      </div>

      {/* Métricas resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("locations.metrics.totalLocations")}
            </CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="text-total-locations"
            >
              {locations?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {locations?.filter((l) => l.isConnected).length || 0}{" "}
              {t("locations.metrics.connectedCount")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("locations.metrics.totalReviews")}
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews}</div>
            <p className="text-xs text-muted-foreground">
              {totalReplies} {t("locations.metrics.replied")} (
              {totalReviews > 0
                ? Math.round((totalReplies / totalReviews) * 100)
                : 0}
              %)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("locations.metrics.avgRating")}
            </CardTitle>
            <Star className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {avgRating.toFixed(1)}
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("locations.metrics.acrossAll")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("locations.metrics.pendingReplies")}
            </CardTitle>
            <Clock className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {totalPending}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("locations.metrics.awaitingAction")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Título de listado */}
      <Card className="mb-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t("locations.allLocations")}
          </CardTitle>
          <CardDescription>
            {t("locations.locationCount").replace(
              "{count}",
              String(locations?.length || 0),
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Listado de locations */}
      {!locations?.length ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {t("locations.noLocations")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("locations.noLocationsDesc")}
            </p>
            <Link href="/restaurants">
              <Button className="mt-4" data-testid="button-add-location">
                {t("locations.addLocation")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}
    </div>
  );
}
