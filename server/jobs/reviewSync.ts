import cron from "node-cron";
import { storage } from "../storage";
import { syncReviewsForRestaurant } from "../googleBusiness";

/**
 * Background job to periodically sync reviews for all connected restaurants.
 * Processes restaurants in batches to avoid Google API rate limits.
 */
export function initReviewSyncJob() {
    // Run every 30 minutes (0, 30 * * * *)
    cron.schedule("*/30 * * * *", async () => {
        console.log("[Cron Job] Starting periodic review sync...");

        try {
            const connectedRestaurants = await storage.getConnectedRestaurants();
            console.log(`[Cron Job] Found ${connectedRestaurants.length} connected restaurants to sync`);

            // Process in batches of 5 to avoid overloading/rate limits
            const BATCH_SIZE = 5;
            const BATCH_DELAY_MS = 10000; // 10 seconds between batches

            for (let i = 0; i < connectedRestaurants.length; i += BATCH_SIZE) {
                const batch = connectedRestaurants.slice(i, i + BATCH_SIZE);
                console.log(`[Cron Job] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} restaurants)`);

                await Promise.all(
                    batch.map(async (restaurant) => {
                        try {
                            const result = await syncReviewsForRestaurant(restaurant);
                            console.log(`[Cron Job] Synced ${restaurant.name}: ${result.synced} reviews, ${result.errors} errors`);
                        } catch (err) {
                            console.error(`[Cron Job] Error syncing restaurant ${restaurant.id}:`, err);
                        }
                    })
                );

                if (i + BATCH_SIZE < connectedRestaurants.length) {
                    console.log(`[Cron Job] Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
                    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
                }
            }

            console.log("[Cron Job] Periodic sync completed successfully");
        } catch (error) {
            console.error("[Cron Job] Critical error in review sync job:", error);
        }
    });

    console.log("[Cron Job] Review sync job initialized (scheduled for every 30 minutes)");
}
