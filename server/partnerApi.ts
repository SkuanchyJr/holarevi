import { storage } from "./storage";
import type { Restaurant, InsertReview } from "@shared/schema";
import { generateReviewReply } from "./openai";
import { canSendReply, getMonthlyReplyUsage } from "./planHelpers";

const EMBEDSOCIAL_API_BASE = "https://api.embedsocial.com";

/**
 * Check if a review should be auto-published based on the restaurant's rules
 */
function shouldAutoPublish(
  restaurant: Restaurant,
  rating: number,
  hasComment: boolean,
  detectedLanguage?: string | null
): boolean {
  // Must have auto-post enabled
  if (!restaurant.autoPostEnabled) {
    return false;
  }
  
  // Check review type filters
  const allowWithComment = restaurant.autoPublishWithComment ?? true;
  const allowWithoutComment = restaurant.autoPublishWithoutComment ?? true;
  const allowNegative = restaurant.autoPublishNegative ?? true;
  
  // Check minimum star threshold (default: 1 = all reviews)
  // BUT: if allowNegative is true and rating is 1-2 stars, bypass the min star check
  const minStars = restaurant.autoPublishMinStars ?? 1;
  const isNegativeReview = rating <= 2;
  
  if (isNegativeReview) {
    // For negative reviews, check if they're explicitly allowed
    if (!allowNegative) {
      console.log(`[Partner API Auto-Publish] Skipped: Negative review (${rating} stars) not allowed`);
      return false;
    }
    // If negative reviews are allowed, bypass the min star check for 1-2 star reviews
  } else {
    // For non-negative reviews (3-5 stars), apply min star threshold normally
    if (rating < minStars) {
      console.log(`[Partner API Auto-Publish] Skipped: Rating ${rating} < min ${minStars}`);
      return false;
    }
  }
  
  // Check comment filter
  if (hasComment && !allowWithComment) {
    console.log(`[Partner API Auto-Publish] Skipped: Reviews with comments not allowed`);
    return false;
  }
  
  if (!hasComment && !allowWithoutComment) {
    console.log(`[Partner API Auto-Publish] Skipped: Reviews without comments not allowed`);
    return false;
  }
  
  // Check language filter (if specified)
  // "auto" and "all" both mean accept all languages
  const allowedLanguage = restaurant.autoPublishLanguage;
  if (allowedLanguage && allowedLanguage !== "all" && allowedLanguage !== "auto" && detectedLanguage) {
    if (detectedLanguage !== allowedLanguage) {
      console.log(`[Partner API Auto-Publish] Skipped: Language ${detectedLanguage} doesn't match filter ${allowedLanguage}`);
      return false;
    }
  }
  
  return true;
}
const EMBEDSOCIAL_OAUTH_BASE = `${EMBEDSOCIAL_API_BASE}/v1/oauth/gbp`;

interface PartnerApiConfig {
  apiKey: string;
  baseUrl: string;
  oauthBase: string;
}

function getConfig(): PartnerApiConfig {
  const apiKey = process.env.PARTNER_API_KEY;
  
  if (!apiKey) {
    throw new Error("[EmbedSocial API] PARTNER_API_KEY is not configured");
  }
  
  return {
    apiKey,
    baseUrl: EMBEDSOCIAL_API_BASE,
    oauthBase: EMBEDSOCIAL_OAUTH_BASE,
  };
}

export function getEmbedSocialOAuthUrl(redirectUri: string, state: string): string {
  // Validate config exists (will throw if PARTNER_API_KEY not set)
  getConfig();
  
  // Use Google's standard OAuth2 authorize endpoint with EmbedSocial's client_id
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthUrl.searchParams.set('client_id', 'embedsocial');
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/business.manage');
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('access_type', 'offline');
  oauthUrl.searchParams.set('prompt', 'consent');
  
  console.log(`[EmbedSocial] Generated Google OAuth URL: ${oauthUrl.toString()}`);
  return oauthUrl.toString();
}

export async function exchangeEmbedSocialCode(
  code: string, 
  redirectUri: string
): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; expiresIn?: number; error?: string }> {
  const config = getConfig();
  
  try {
    console.log(`[EmbedSocial] Exchanging code for tokens...`);
    
    const formData = new URLSearchParams();
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', config.apiKey);
    
    const response = await fetch(`${config.oauthBase}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': config.apiKey,
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EmbedSocial] Token exchange failed: ${response.status} - ${errorText}`);
      return { success: false, error: `Token exchange failed: ${errorText}` };
    }
    
    const data = await response.json();
    console.log(`[EmbedSocial] Token exchange successful`);
    
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 3600,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[EmbedSocial] Token exchange error: ${message}`);
    return { success: false, error: message };
  }
}

export async function refreshEmbedSocialToken(
  refreshToken: string
): Promise<{ success: boolean; accessToken?: string; expiresIn?: number; error?: string }> {
  const config = getConfig();
  
  try {
    console.log(`[EmbedSocial] Refreshing access token...`);
    
    const formData = new URLSearchParams();
    formData.append('refresh_token', refreshToken);
    formData.append('grant_type', 'refresh_token');
    formData.append('client_id', config.apiKey);
    
    const response = await fetch(`${config.oauthBase}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': config.apiKey,
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EmbedSocial] Token refresh failed: ${response.status} - ${errorText}`);
      return { success: false, error: `Token refresh failed: ${errorText}` };
    }
    
    const data = await response.json();
    console.log(`[EmbedSocial] Token refresh successful`);
    
    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[EmbedSocial] Token refresh error: ${message}`);
    return { success: false, error: message };
  }
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const config = getConfig();
  const url = `${config.baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": config.apiKey,
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  
  try {
    console.log(`[EmbedSocial] ${options.method || "GET"} ${endpoint}`);
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EmbedSocial] Error ${response.status}: ${errorText}`);
      return { 
        success: false, 
        error: `API Error ${response.status}: ${errorText}` 
      };
    }
    
    const data = await response.json() as T;
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[EmbedSocial] Request failed: ${message}`);
    return { success: false, error: message };
  }
}

export async function fetchEmbedSocialLocations(accessToken: string): Promise<PartnerLocation[]> {
  const result = await makeRequest<{ locations: PartnerLocation[] } | PartnerLocation[]>(
    "/v1/oauth/gbp/locations",
    {},
    accessToken
  );
  
  if (!result.success || !result.data) {
    console.error("[EmbedSocial] Failed to fetch locations:", result.error);
    return [];
  }
  
  const locations = Array.isArray(result.data) ? result.data : result.data.locations || [];
  console.log(`[EmbedSocial] Fetched ${locations.length} locations`);
  return locations;
}

export async function fetchEmbedSocialAccounts(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const result = await makeRequest<{ accounts: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>>(
    "/v1/oauth/gbp/accounts",
    {},
    accessToken
  );
  
  if (!result.success || !result.data) {
    console.error("[EmbedSocial] Failed to fetch accounts:", result.error);
    return [];
  }
  
  const accounts = Array.isArray(result.data) ? result.data : result.data.accounts || [];
  console.log(`[EmbedSocial] Fetched ${accounts.length} accounts`);
  return accounts;
}

export interface PartnerLocation {
  id: string;
  name: string;
  address?: string;
  placeId?: string;
  accountId?: string;
  status?: string;
}

export interface PartnerReview {
  id: string;
  locationId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  hasReply: boolean;
  replyText?: string;
  replyCreatedAt?: string;
}

export interface PartnerStats {
  locationId: string;
  totalReviews: number;
  averageRating: number;
  repliedCount: number;
  pendingCount: number;
  ratingDistribution: Record<number, number>;
  monthlyTrends?: Array<{
    month: string;
    reviews: number;
    averageRating: number;
  }>;
}

export async function fetchPartnerLocations(customerId?: string): Promise<PartnerLocation[]> {
  const endpoint = customerId ? `/locations?customer_id=${customerId}` : "/locations";
  const result = await makeRequest<{ locations: PartnerLocation[] }>(endpoint);
  
  if (!result.success || !result.data) {
    console.error("[Partner API] Failed to fetch locations:", result.error);
    return [];
  }
  
  console.log(`[Partner API] Fetched ${result.data.locations?.length || 0} locations`);
  return result.data.locations || [];
}

export async function fetchPartnerReviews(
  locationId: string,
  options?: { 
    limit?: number; 
    offset?: number;
    since?: string;
  }
): Promise<PartnerReview[]> {
  const params = new URLSearchParams();
  params.set("location_id", locationId);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  if (options?.since) params.set("since", options.since);
  
  const endpoint = `/reviews?${params.toString()}`;
  const result = await makeRequest<{ reviews: PartnerReview[] }>(endpoint);
  
  if (!result.success || !result.data) {
    console.error("[Partner API] Failed to fetch reviews:", result.error);
    return [];
  }
  
  console.log(`[Partner API] Fetched ${result.data.reviews?.length || 0} reviews for location ${locationId}`);
  return result.data.reviews || [];
}

export async function postPartnerReply(
  reviewId: string,
  replyText: string
): Promise<{ success: boolean; error?: string }> {
  const result = await makeRequest<{ success: boolean }>(
    `/reviews/${reviewId}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ reply: replyText }),
    }
  );
  
  if (!result.success) {
    console.error(`[Partner API] Failed to post reply for review ${reviewId}:`, result.error);
    return { success: false, error: result.error };
  }
  
  console.log(`[Partner API] Reply posted for review ${reviewId}`);
  return { success: true };
}

export async function fetchPartnerStats(locationId: string): Promise<PartnerStats | null> {
  const result = await makeRequest<PartnerStats>(`/stats?location_id=${locationId}`);
  
  if (!result.success || !result.data) {
    console.error("[Partner API] Failed to fetch stats:", result.error);
    return null;
  }
  
  console.log(`[Partner API] Fetched stats for location ${locationId}`);
  return result.data;
}

function detectLanguage(text: string): string {
  if (!text) return "en";
  
  const spanishPatterns = /\b(muy|bueno|excelente|gracias|comida|servicio|restaurante|pero|porque|también|está|están)\b/i;
  const catalanPatterns = /\b(molt|bo|excel·lent|gràcies|menjar|servei|restaurant|però|perquè|també|està|estan)\b/i;
  
  if (catalanPatterns.test(text)) return "ca";
  if (spanishPatterns.test(text)) return "es";
  return "en";
}

function analyzeSentiment(rating: number, comment: string): string {
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";
  return "neutral";
}

export async function syncReviewsViaPartnerApi(restaurant: Restaurant, options?: { isAutoSync?: boolean }): Promise<{ synced: number; errors: number }> {
  const isAutoSync = options?.isAutoSync ?? false;
  const logPrefix = isAutoSync ? "[Partner API AutoSync]" : "[Partner API]";
  console.log(`${logPrefix} Starting review sync for restaurant: ${restaurant.name} (${restaurant.id})`);
  
  if (!restaurant.googleLocationId) {
    console.log(`${logPrefix} Restaurant has no location ID, skipping sync`);
    return { synced: 0, errors: 0 };
  }
  
  const partnerReviews = await fetchPartnerReviews(restaurant.googleLocationId);
  let synced = 0;
  let errors = 0;
  
  for (const partnerReview of partnerReviews) {
    try {
      const existingReview = await storage.getReviewByGoogleId(partnerReview.id);
      if (existingReview) {
        console.log(`[Partner API] Review ${partnerReview.id} already exists, skipping`);
        continue;
      }
      
      const rating = partnerReview.rating;
      const comment = partnerReview.comment || "";
      const language = detectLanguage(comment);
      const sentiment = analyzeSentiment(rating, comment);
      
      const reviewData: InsertReview = {
        restaurantId: restaurant.id,
        googleReviewId: partnerReview.id,
        reviewerName: partnerReview.reviewerName || "Customer",
        reviewerPhotoUrl: partnerReview.reviewerPhotoUrl,
        rating,
        comment,
        language,
        sentiment,
        replyStatus: partnerReview.hasReply ? "posted" : "pending",
        postedReply: partnerReview.replyText,
        repliedAt: partnerReview.replyCreatedAt ? new Date(partnerReview.replyCreatedAt) : undefined,
        reviewedAt: partnerReview.createdAt ? new Date(partnerReview.createdAt) : new Date(),
      };
      
      const savedReview = await storage.createReview(reviewData);
      console.log(`${logPrefix} Saved review: ${savedReview.id}`);
      
      if (!partnerReview.hasReply) {
        if (isAutoSync && !restaurant.autoPostEnabled) {
          console.log(`${logPrefix} autoPostEnabled is OFF for ${restaurant.name}, skipping AI reply generation (review saved as pending)`);
          synced++;
          continue;
        }
        try {
          // Check plan limits before generating AI reply
          const user = await storage.getUser(restaurant.userId);
          if (!user) {
            console.log(`[Partner API] User not found for restaurant ${restaurant.id}, skipping AI reply`);
            synced++;
            continue;
          }
          
          // Check and possibly reset monthly usage
          const { used, needsReset } = getMonthlyReplyUsage(user);
          if (needsReset) {
            await storage.updateUserReplyUsage(user.id, 0, new Date());
          }
          
          const replyCheck = canSendReply(user);
          if (!replyCheck.allowed && !needsReset) {
            console.log(`[Partner API] User ${user.id} has reached reply limit (${replyCheck.current}/${replyCheck.limit}), skipping AI reply`);
            synced++;
            continue;
          }
          
          // Fetch tone preset for custom instructions
          let customInstructions: string | undefined;
          let toneStyle = restaurant.toneOfVoice || "friendly";
          
          if (restaurant.tonePresetId) {
            const tonePreset = await storage.getTonePreset(restaurant.tonePresetId);
            if (tonePreset && tonePreset.userId === restaurant.userId) {
              customInstructions = tonePreset.instructions || undefined;
              toneStyle = tonePreset.style || toneStyle;
              console.log(`[Partner API] Using tone preset "${tonePreset.name}" for restaurant ${restaurant.id}`);
            }
          }
          
          const aiReply = await generateReviewReply({
            reviewerName: reviewData.reviewerName || "Customer",
            rating,
            comment,
            restaurantName: restaurant.name,
            toneOfVoice: toneStyle,
            customInstructions,
          });
          
          await storage.updateReview(savedReview.id, {
            generatedReply: aiReply.reply,
            language: aiReply.language,
            sentiment: aiReply.sentiment,
          });
          
          console.log(`[Partner API] Generated AI reply for review: ${savedReview.id}`);
          
          // Increment usage after successful generation
          const currentUsed = needsReset ? 0 : (user.monthlyRepliesUsed || 0);
          await storage.updateUserReplyUsage(user.id, currentUsed + 1);
          
          // Check if review should be auto-published based on rules
          if (shouldAutoPublish(restaurant, rating, !!comment, aiReply.language)) {
            console.log(`[Partner API] Auto-publishing reply for review: ${savedReview.id}`);
            const postResult = await postPartnerReply(partnerReview.id, aiReply.reply);
            if (postResult.success) {
              await storage.updateReview(savedReview.id, {
                postedReply: aiReply.reply,
                replyStatus: "posted",
                repliedAt: new Date(),
              });
            }
          } else if (restaurant.autoPostEnabled) {
            console.log(`[Partner API] Review ${savedReview.id} didn't match auto-publish rules, saving as draft`);
          }
        } catch (aiError) {
          console.error(`[Partner API] AI reply generation failed:`, aiError);
        }
      }
      
      synced++;
    } catch (error) {
      console.error(`[Partner API] Error processing review:`, error);
      errors++;
    }
  }
  
  console.log(`[Partner API] Sync complete: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

export async function postReplyViaPartnerApi(
  restaurant: Restaurant, 
  reviewId: string, 
  reply: string
): Promise<boolean> {
  const review = await storage.getReview(reviewId);
  if (!review || !review.googleReviewId) {
    console.error("[Partner API] Review not found or missing Partner review ID");
    return false;
  }
  
  const result = await postPartnerReply(review.googleReviewId, reply);
  
  if (result.success) {
    await storage.updateReview(reviewId, {
      postedReply: reply,
      replyStatus: "posted",
      repliedAt: new Date(),
    });
    console.log(`[Partner API] Reply posted for review: ${reviewId}`);
    return true;
  }
  
  return false;
}

export async function syncAllRestaurantsViaPartnerApi(): Promise<void> {
  console.log("[Partner API AutoSync] Starting sync for restaurants with autoSync enabled...");
  
  const allConnected = await storage.getConnectedRestaurants();
  const autoSyncRestaurants = await storage.getRestaurantsWithAutoSync();
  const skippedCount = allConnected.length - autoSyncRestaurants.length;

  if (skippedCount > 0) {
    const skippedNames = allConnected
      .filter(r => !autoSyncRestaurants.find(a => a.id === r.id))
      .map(r => `${r.name} (${r.id})`);
    console.log(`[Partner API AutoSync] Skipping ${skippedCount} restaurants with autoSync disabled: ${skippedNames.join(", ")}`);
  }

  console.log(`[Partner API AutoSync] ${autoSyncRestaurants.length} restaurants with autoSync enabled`);
  
  for (const restaurant of autoSyncRestaurants) {
    try {
      await syncReviewsViaPartnerApi(restaurant, { isAutoSync: true });
    } catch (error) {
      console.error(`[Partner API AutoSync] Error syncing restaurant ${restaurant.id} (${restaurant.name}):`, error);
    }
  }
  
  console.log("[Partner API AutoSync] Sync complete for all restaurants");
}

export function isPartnerApiConfigured(): boolean {
  return !!process.env.PARTNER_API_KEY;
}
