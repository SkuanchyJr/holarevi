import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

function LocationCard({ location }: { location: LocationOverview }) {
  const { t } = useLanguage();

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden hover:border-border/70 transition-colors"
      data-testid={`card-location-${location.id}`}
    >
      {/* Status strip */}
      <div className={cn("h-1 w-full", location.isConnected ? "bg-green-500" : "bg-muted")} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              location.isConnected ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
            )}>
              <Building2 className={cn(
                "h-5 w-5",
                location.isConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
              {location.address && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {location.address}
                </p>
              )}
            </div>
          </div>

          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
            location.isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          )}>
            {location.isConnected
              ? <><CheckCircle className="h-3 w-3" />{t("locations.connected")}</>
              : <><XCircle className="h-3 w-3" />{t("locations.notConnected")}</>
            }
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
            <p className="text-base font-bold text-primary">{location.reviewCount}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t("locations.stats.reviews")}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
            <p className="text-base font-bold text-foreground">{location.replyCount}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t("locations.stats.replies")}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <p className="text-base font-bold text-yellow-500">{location.averageRating.toFixed(1)}</p>
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mb-0.5" />
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t("locations.stats.avgRating")}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
            <p className={cn(
              "text-base font-bold",
              location.pendingReplies > 0 ? "text-amber-500" : "text-foreground"
            )}>
              {location.pendingReplies}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t("locations.stats.pending")}</p>
          </div>
        </div>

        {/* Last review */}
        {location.lastReviewDate && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("locations.lastReview")}
            </span>
            <span>
              {formatDistanceToNow(new Date(location.lastReviewDate), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Locations() {
  const { t } = useLanguage();
  const { data: locations, isLoading, error } = useQuery<LocationOverview[]>({
    queryKey: ["/api/locations/overview"],
  });
  const { data: planInfo } = useQuery<any>({ queryKey: ["/api/plan-info"] });
  const hasAccess = planInfo?.features?.hasMultiLocationDashboard;

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-2">{t("locations.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">{t("locations.upgradeMessage")}</p>
          <Button asChild data-testid="button-upgrade-locations">
            <Link href="/billing">
              {t("locations.upgradePlan")}
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const totalReviews = locations?.reduce((s, l) => s + l.reviewCount, 0) || 0;
  const totalReplies = locations?.reduce((s, l) => s + l.replyCount, 0) || 0;
  const totalPending = locations?.reduce((s, l) => s + l.pendingReplies, 0) || 0;
  const avgRating = locations?.length
    ? locations.reduce((s, l) => s + l.averageRating * l.reviewCount, 0) /
      (locations.reduce((s, l) => s + l.reviewCount, 0) || 1)
    : 0;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <PageHeader
        title={t("locations.title")}
        subtitle={t("locations.subtitle")}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/restaurants">
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
              {t("locations.addLocation")}
            </Link>
          </Button>
        }
      />

      {/* Summary metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("locations.metrics.totalLocations")}
          value={locations?.length || 0}
          description={`${locations?.filter(l => l.isConnected).length || 0} ${t("locations.metrics.connectedCount")}`}
          icon={<Building2 className="h-4 w-4" />}
          iconClassName="bg-primary/10 text-primary"
          data-testid="text-total-locations"
        />
        <StatCard
          title={t("locations.metrics.totalReviews")}
          value={totalReviews}
          description={`${totalReplies} ${t("locations.metrics.replied")} (${totalReviews > 0 ? Math.round((totalReplies / totalReviews) * 100) : 0}%)`}
          icon={<MessageSquare className="h-4 w-4" />}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
        <StatCard
          title={t("locations.metrics.avgRating")}
          value={avgRating.toFixed(1)}
          description={t("locations.metrics.acrossAll")}
          icon={<Star className="h-4 w-4" />}
          iconClassName="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-500"
        />
        <StatCard
          title={t("locations.metrics.pendingReplies")}
          value={totalPending}
          description={t("locations.metrics.awaitingAction")}
          icon={<Clock className="h-4 w-4" />}
          iconClassName={totalPending > 0
            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            : "bg-muted text-muted-foreground"
          }
        />
      </div>

      {/* Section label */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("locations.allLocations")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("locations.locationCount").replace("{count}", String(locations?.length || 0))}
          </p>
        </div>
      </div>

      {/* Location grid */}
      {!locations?.length ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title={t("locations.noLocations")}
            description={t("locations.noLocationsDesc")}
            action={
              <Button size="sm" asChild>
                <Link href="/restaurants">
                  <MapPin className="mr-1.5 h-3.5 w-3.5" />
                  {t("locations.addLocation")}
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}
    </div>
  );
}
