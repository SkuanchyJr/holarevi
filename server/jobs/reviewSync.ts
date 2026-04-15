import cron from "node-cron";
import { storage } from "../storage";
import { syncReviewsForRestaurant } from "../googleBusiness";
import {
  syncReviewsViaPartnerApi,
  isPartnerApiConfigured,
} from "../partnerApi";

let isRunning = false;

export function initReviewSyncJob() {
    cron.schedule("*/5 * * * *", async () => {
        if (isRunning) {
            console.log("[ReviewSync] Sync already running, skipping this cycle");
            return;
        }

        isRunning = true;
        const syncSource = isPartnerApiConfigured() ? "partner" : "google";
        console.log(`[ReviewSync] Starting periodic review sync via ${syncSource}...`);

        try {
            const allConnected = await storage.getConnectedRestaurants();
            const connectedRestaurants = await storage.getRestaurantsWithAutoSync();
            const skippedCount = allConnected.length - connectedRestaurants.length;

            if (skippedCount > 0) {
                const skippedNames = allConnected
                    .filter(r => !connectedRestaurants.find(a => a.id === r.id))
                    .map(r => `${r.name} (${r.id})`);
                console.log(`[ReviewSync] Skipping ${skippedCount} restaurants with autoSync disabled: ${skippedNames.join(", ")}`);
            }
            console.log(`[ReviewSync] ${connectedRestaurants.length} restaurants with autoSync enabled`);

            const BATCH_SIZE = 5;
            const BATCH_DELAY_MS = 10000;

            let totalSynced = 0;
            let totalReplies = 0;
            let totalPosted = 0;
            let totalErrors = 0;

            for (let i = 0; i < connectedRestaurants.length; i += BATCH_SIZE) {
                const batch = connectedRestaurants.slice(i, i + BATCH_SIZE);
                console.log(`[ReviewSync] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} restaurants)`);

                await Promise.all(
                    batch.map(async (restaurant) => {
                        try {
                            if (isPartnerApiConfigured()) {
                                const result = await syncReviewsViaPartnerApi(restaurant, { isAutoSync: true });
                                totalSynced += result.synced;
                                totalErrors += result.errors;
                                console.log(`[ReviewSync] Synced ${restaurant.name}: ${result.synced} reviews, ${result.errors} errors (via partner)`);
                            } else {
                                const result = await syncReviewsForRestaurant(restaurant, { isAutoSync: true });
                                totalSynced += result.synced;
                                totalReplies += result.repliesGenerated;
                                totalPosted += result.repliesPosted;
                                totalErrors += result.errors;
                                console.log(`[ReviewSync] Synced ${restaurant.name}: ${result.synced} reviews, ${result.repliesGenerated} replies generated, ${result.repliesPosted} posted, ${result.errors} errors (via google)`);
                            }
                        } catch (err) {
                            console.error(`[ReviewSync] Error syncing restaurant ${restaurant.id} (${restaurant.name}):`, err);
                            totalErrors++;
                        }
                    })
                );

                if (i + BATCH_SIZE < connectedRestaurants.length) {
                    console.log(`[ReviewSync] Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
                    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
                }
            }

            console.log(`[ReviewSync] Periodic sync completed: ${totalSynced} reviews, ${totalReplies} replies generated, ${totalPosted} posted, ${totalErrors} errors`);
        } catch (error) {
            console.error("[ReviewSync] Critical error in review sync job:", error);
        } finally {
            isRunning = false;
        }
    });

    console.log("[ReviewSync] Review sync job initialized (scheduled every 5 minutes, only for locations with autoSync enabled)");
}
