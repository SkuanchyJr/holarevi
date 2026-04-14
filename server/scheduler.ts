import { storage } from "./storage";
import { syncReviewsForRestaurant } from "./googleBusiness";
import { log } from "./index";

let isRunning = false;
const SYNC_INTERVAL = 5 * 60 * 1000;

export async function runDailySync() {
  if (isRunning) {
    log("Sync already running, skipping", "scheduler");
    return;
  }
  
  isRunning = true;
  log("Starting auto-sync for restaurants", "scheduler");
  
  try {
    const allConnected = await storage.getConnectedRestaurants();
    const restaurantsToSync = await storage.getRestaurantsWithAutoSync();
    const skippedCount = allConnected.length - restaurantsToSync.length;

    if (skippedCount > 0) {
      const skippedNames = allConnected
        .filter(r => !restaurantsToSync.find(a => a.id === r.id))
        .map(r => `${r.name} (${r.id})`);
      log(`Skipping ${skippedCount} restaurants with autoSync disabled: ${skippedNames.join(", ")}`, "scheduler");
    }
    log(`${restaurantsToSync.length} restaurants with autoSync enabled`, "scheduler");

    let totalSynced = 0;
    let totalReplies = 0;
    let totalPosted = 0;
    let totalErrors = 0;
    
    for (const restaurant of restaurantsToSync) {
      try {
        log(`Syncing reviews for restaurant: ${restaurant.name} (${restaurant.id})`, "scheduler");
        const result = await syncReviewsForRestaurant(restaurant, { isAutoSync: true });
        totalSynced += result.synced;
        totalReplies += result.repliesGenerated;
        totalPosted += result.repliesPosted;
        totalErrors += result.errors;
        log(`Synced ${restaurant.name}: ${result.synced} reviews, ${result.repliesGenerated} replies, ${result.repliesPosted} posted`, "scheduler");
      } catch (error) {
        log(`Failed to sync reviews for restaurant ${restaurant.name}: ${error}`, "scheduler");
        totalErrors++;
      }
    }
    
    log(`Auto-sync completed: ${totalSynced} reviews, ${totalReplies} replies generated, ${totalPosted} posted, ${totalErrors} errors`, "scheduler");
  } catch (error) {
    log(`Sync failed: ${error}`, "scheduler");
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  log("Starting sync scheduler (5-minute interval)", "scheduler");
  
  setTimeout(() => {
    runDailySync();
  }, 5000);
  
  setInterval(runDailySync, SYNC_INTERVAL);
}
