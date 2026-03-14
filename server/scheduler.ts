import { storage } from "./storage";
import { syncReviewsForRestaurant } from "./googleBusiness";
import { log } from "./index";

let isRunning = false;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes for near real-time sync

export async function runDailySync() {
  if (isRunning) {
    log("Sync already running, skipping", "scheduler");
    return;
  }
  
  isRunning = true;
  log("Starting auto-sync for restaurants", "scheduler");
  
  try {
    const restaurantsToSync = await storage.getRestaurantsWithAutoSync();
    log(`Found ${restaurantsToSync.length} restaurants with auto-sync enabled`, "scheduler");
    
    for (const restaurant of restaurantsToSync) {
      try {
        log(`Syncing reviews for restaurant: ${restaurant.name} (${restaurant.id})`, "scheduler");
        await syncReviewsForRestaurant(restaurant);
        log(`Successfully synced reviews for: ${restaurant.name}`, "scheduler");
      } catch (error) {
        log(`Failed to sync reviews for restaurant ${restaurant.name}: ${error}`, "scheduler");
      }
    }
    
    log("Auto-sync completed", "scheduler");
  } catch (error) {
    log(`Sync failed: ${error}`, "scheduler");
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  log("Starting sync scheduler (5-minute interval)", "scheduler");
  
  // Run initial sync after a short delay to let the server fully start
  setTimeout(() => {
    runDailySync();
  }, 5000);
  
  // Schedule recurring syncs every 5 minutes
  setInterval(runDailySync, SYNC_INTERVAL);
}
