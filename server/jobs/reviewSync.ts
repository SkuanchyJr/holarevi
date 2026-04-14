import cron from "node-cron";
import { storage } from "../storage";
import { syncReviewsForRestaurant } from "../googleBusiness";

export function initReviewSyncJob() {
    cron.schedule("*/30 * * * *", async () => {
        console.log("[Cron Job] Starting periodic review sync...");

        try {
            const allConnected = await storage.getConnectedRestaurants();
            const connectedRestaurants = await storage.getRestaurantsWithAutoSync();
            const skippedCount = allConnected.length - connectedRestaurants.length;

            console.log(`[Cron Job] ${connectedRestaurants.length} restaurants with autoSync enabled, ${skippedCount} skipped (autoSync disabled)`);

            const BATCH_SIZE = 5;
            const BATCH_DELAY_MS = 10000;

            let totalSynced = 0;
            let totalReplies = 0;
            let totalPosted = 0;
            let totalErrors = 0;

            for (let i = 0; i < connectedRestaurants.length; i += BATCH_SIZE) {
                const batch = connectedRestaurants.slice(i, i + BATCH_SIZE);
                console.log(`[Cron Job] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} restaurants)`);

                await Promise.all(
                    batch.map(async (restaurant) => {
                        try {
                            const result = await syncReviewsForRestaurant(restaurant, { isAutoSync: true });
                            totalSynced += result.synced;
                            totalReplies += result.repliesGenerated;
                            totalPosted += result.repliesPosted;
                            totalErrors += result.errors;
                            console.log(`[Cron Job] Synced ${restaurant.name}: ${result.synced} reviews, ${result.repliesGenerated} replies generated, ${result.repliesPosted} posted, ${result.errors} errors`);
                        } catch (err) {
                            console.error(`[Cron Job] Error syncing restaurant ${restaurant.id} (${restaurant.name}):`, err);
                            totalErrors++;
                        }
                    })
                );

                if (i + BATCH_SIZE < connectedRestaurants.length) {
                    console.log(`[Cron Job] Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
                    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
                }
            }

            console.log(`[Cron Job] Periodic sync completed: ${totalSynced} reviews, ${totalReplies} replies generated, ${totalPosted} posted, ${totalErrors} errors`);
        } catch (error) {
            console.error("[Cron Job] Critical error in review sync job:", error);
        }
    });

    console.log("[Cron Job] Review sync job initialized (scheduled for every 30 minutes)");
}
