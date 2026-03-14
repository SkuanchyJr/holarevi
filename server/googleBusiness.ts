import { storage } from "./storage";
import type { Restaurant, InsertReview } from "@shared/schema";
import { generateReviewReply } from "./openai";
import { canSendReply, getMonthlyReplyUsage, PLAN_ERROR_CODES } from "./planHelpers";

const GOOGLE_API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";

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
      console.log(`[Auto-Publish] Skipped: Negative review (${rating} stars) not allowed`);
      return false;
    }
    // If negative reviews are allowed, bypass the min star check for 1-2 star reviews
  } else {
    // For non-negative reviews (3-5 stars), apply min star threshold normally
    if (rating < minStars) {
      console.log(`[Auto-Publish] Skipped: Rating ${rating} < min ${minStars}`);
      return false;
    }
  }
  
  // Check comment filter
  if (hasComment && !allowWithComment) {
    console.log(`[Auto-Publish] Skipped: Reviews with comments not allowed`);
    return false;
  }
  
  if (!hasComment && !allowWithoutComment) {
    console.log(`[Auto-Publish] Skipped: Reviews without comments not allowed`);
    return false;
  }
  
  // Check language filter (if specified)
  // "auto" and "all" both mean accept all languages
  const allowedLanguage = restaurant.autoPublishLanguage;
  if (allowedLanguage && allowedLanguage !== "all" && allowedLanguage !== "auto" && detectedLanguage) {
    if (detectedLanguage !== allowedLanguage) {
      console.log(`[Auto-Publish] Skipped: Language ${detectedLanguage} doesn't match filter ${allowedLanguage}`);
      return false;
    }
  }
  
  return true;
}

const GOOGLE_ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

async function refreshAccessToken(restaurant: Restaurant): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !restaurant.googleRefreshToken) {
    console.error("[Google Business] Missing credentials or refresh token");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: restaurant.googleRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Google Business] Token refresh failed:", error);
      return null;
    }

    const tokens = await response.json();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    await storage.updateRestaurant(restaurant.id, {
      googleAccessToken: tokens.access_token,
      googleTokenExpiresAt: expiresAt,
    });

    console.log(`[Google Business] Token refreshed for restaurant ${restaurant.id}`);
    return tokens.access_token;
  } catch (error) {
    console.error("[Google Business] Token refresh error:", error);
    return null;
  }
}

async function getValidAccessToken(restaurant: Restaurant): Promise<string | null> {
  if (!restaurant.googleAccessToken) {
    return null;
  }

  const now = new Date();
  const expiresAt = restaurant.googleTokenExpiresAt ? new Date(restaurant.googleTokenExpiresAt) : null;

  if (expiresAt && expiresAt > now) {
    return restaurant.googleAccessToken;
  }

  return await refreshAccessToken(restaurant);
}

export async function fetchGoogleAccounts(restaurant: Restaurant): Promise<any[]> {
  const accessToken = await getValidAccessToken(restaurant);
  if (!accessToken) {
    console.error("[Google Business] No valid access token");
    return [];
  }

  try {
    const response = await fetch(`${GOOGLE_ACCOUNT_API}/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google Business] Failed to fetch accounts - Status: ${response.status}, Error:`, errorText);
      
      // Parse error for more details
      try {
        const errorData = JSON.parse(errorText);
        console.error("[Google Business] Error details:", JSON.stringify(errorData, null, 2));
        
        // Check for common API access issues
        if (response.status === 403) {
          console.error("[Google Business] 403 FORBIDDEN - This usually means:");
          console.error("  1. Google Business Profile API is not enabled in your Google Cloud Console");
          console.error("  2. You haven't applied for/received Google Business Profile API access");
          console.error("  3. The API access request hasn't been approved yet");
        }
      } catch (e) {
        // Error is not JSON
      }
      return [];
    }

    const data = await response.json();
    console.log("[Google Business] Fetched accounts:", JSON.stringify(data, null, 2));
    
    // Handle case where user has no Business Profile accounts
    if (!data.accounts || data.accounts.length === 0) {
      console.log("[Google Business] No accounts found - User may not have Business Profile API access approved");
    }
    
    return data.accounts || [];
  } catch (error) {
    console.error("[Google Business] Error fetching accounts:", error);
    return [];
  }
}

export async function fetchGoogleLocations(restaurant: Restaurant, accountId: string): Promise<any[]> {
  const accessToken = await getValidAccessToken(restaurant);
  if (!accessToken) {
    console.error("[Google Business] No valid access token");
    return [];
  }

  try {
    // Ensure accountId is in the correct format (without 'accounts/' prefix for the URL)
    const cleanAccountId = accountId.replace(/^accounts\//, '');
    
    // Build URL with required readMask parameter
    // The readMask specifies which fields to return
    const url = new URL(`${GOOGLE_API_BASE}/accounts/${cleanAccountId}/locations`);
    url.searchParams.set('readMask', 'name,title,storefrontAddress,metadata');
    
    console.log(`[Google Business] Fetching locations from: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google Business] Failed to fetch locations - Status: ${response.status}`);
      console.error(`[Google Business] Error response:`, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.error("[Google Business] Error details:", JSON.stringify(errorData, null, 2));
        
        if (response.status === 403) {
          console.error("[Google Business] 403 FORBIDDEN - Possible causes:");
          console.error("  1. The account ID might be incorrect");
          console.error("  2. The user doesn't have access to this account");
          console.error("  3. The Business Profile API is not enabled");
        } else if (response.status === 404) {
          console.error("[Google Business] 404 NOT FOUND - The account might not exist or the format is wrong");
        }
      } catch (e) {
        // Error is not JSON
      }
      return [];
    }

    const data = await response.json();
    console.log("[Google Business] Fetched locations response:", JSON.stringify(data, null, 2));
    
    // Handle different response formats
    const locations = data.locations || [];
    console.log(`[Google Business] Found ${locations.length} locations`);
    
    return locations;
  } catch (error) {
    console.error("[Google Business] Error fetching locations:", error);
    return [];
  }
}

export async function fetchGoogleReviews(restaurant: Restaurant): Promise<any[]> {
  const accessToken = await getValidAccessToken(restaurant);
  if (!accessToken) {
    console.error("[Google Business] No valid access token");
    return [];
  }

  if (!restaurant.googleAccountId || !restaurant.googleLocationId) {
    console.error("[Google Business] Missing account or location ID for restaurant:", restaurant.id);
    return [];
  }

  try {
    const accountName = restaurant.googleAccountId.startsWith("accounts/") 
      ? restaurant.googleAccountId 
      : `accounts/${restaurant.googleAccountId}`;
    const locationName = restaurant.googleLocationId.startsWith("locations/")
      ? restaurant.googleLocationId
      : `locations/${restaurant.googleLocationId}`;
    
    const baseUrl = `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`;
    
    // Fetch ALL reviews with pagination - no limit for syncing
    const allReviews: any[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    
    do {
      // Build URL with pagination parameters
      const url = new URL(baseUrl);
      url.searchParams.set('pageSize', '50'); // Max allowed by Google API
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }
      
      console.log(`[Google Business] Fetching reviews page ${pageCount + 1} from: ${url.toString()}`);
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[Google Business] Failed to fetch reviews:", error);
        break;
      }

      const data = await response.json();
      const pageReviews = data.reviews || [];
      allReviews.push(...pageReviews);
      
      // Get next page token for pagination
      pageToken = data.nextPageToken;
      pageCount++;
      
      console.log(`[Google Business] Page ${pageCount}: fetched ${pageReviews.length} reviews (total: ${allReviews.length})`);
      
    } while (pageToken); // Continue until no more pages
    
    console.log(`[Google Business] Fetched ALL ${allReviews.length} reviews across ${pageCount} page(s)`);
    return allReviews;
  } catch (error) {
    console.error("[Google Business] Error fetching reviews:", error);
    return [];
  }
}

function mapStarRating(starRating: string): number {
  const ratingMap: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return ratingMap[starRating] || 3;
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

export async function syncReviewsForRestaurant(restaurant: Restaurant): Promise<{ synced: number; errors: number }> {
  console.log(`[Google Business] Starting review sync for restaurant: ${restaurant.name} (${restaurant.id})`);
  
  if (!restaurant.isConnected || !restaurant.googleAccountId || !restaurant.googleLocationId) {
    console.log(`[Google Business] Restaurant not fully connected, skipping sync`);
    return { synced: 0, errors: 0 };
  }

  const googleReviews = await fetchGoogleReviews(restaurant);
  let synced = 0;
  let errors = 0;

  for (const googleReview of googleReviews) {
    try {
      const googleReviewId = googleReview.reviewId || googleReview.name?.split("/").pop();
      
      const existingReview = await storage.getReviewByGoogleId(googleReviewId);
      if (existingReview) {
        console.log(`[Google Business] Review ${googleReviewId} already exists, skipping`);
        continue;
      }

      const rating = mapStarRating(googleReview.starRating);
      const comment = googleReview.comment || "";
      const language = detectLanguage(comment);
      const sentiment = analyzeSentiment(rating, comment);

      // Check if the review already has a business reply on Google
      // Google API returns reviewReply object with comment field for existing replies
      const existingGoogleReply = googleReview.reviewReply?.comment || null;
      const hasExistingReply = !!existingGoogleReply;

      const reviewData: InsertReview = {
        restaurantId: restaurant.id,
        googleReviewId,
        reviewerName: googleReview.reviewer?.displayName || "Google User",
        reviewerPhotoUrl: googleReview.reviewer?.profilePhotoUrl,
        rating,
        comment,
        language,
        sentiment,
        // If already has a reply on Google, mark as posted; otherwise pending
        replyStatus: hasExistingReply ? "posted" : "pending",
        // Store the existing reply if present
        postedReply: existingGoogleReply,
        repliedAt: hasExistingReply && googleReview.reviewReply?.updateTime 
          ? new Date(googleReview.reviewReply.updateTime) 
          : (hasExistingReply ? new Date() : undefined),
        reviewedAt: googleReview.createTime ? new Date(googleReview.createTime) : new Date(),
      };

      const savedReview = await storage.createReview(reviewData);
      
      if (hasExistingReply) {
        console.log(`[Google Business] Saved review ${savedReview.id} with existing Google reply (marked as posted)`);
        synced++;
        continue; // Skip AI generation for reviews that already have replies
      }
      
      console.log(`[Google Business] Saved review: ${savedReview.id}`);

      try {
        // Check plan limits before generating AI reply
        const user = await storage.getUser(restaurant.userId);
        if (!user) {
          console.log(`[Google Business] User not found for restaurant ${restaurant.id}, skipping AI reply`);
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
          console.log(`[Google Business] User ${user.id} has reached reply limit (${replyCheck.current}/${replyCheck.limit}), skipping AI reply`);
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
            console.log(`[Google Business] Using tone preset "${tonePreset.name}" for restaurant ${restaurant.id}`);
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

        console.log(`[Google Business] Generated AI reply for review: ${savedReview.id}`);
        
        // Increment usage after successful generation
        const currentUsed = needsReset ? 0 : (user.monthlyRepliesUsed || 0);
        await storage.updateUserReplyUsage(user.id, currentUsed + 1);

        // Check if review should be auto-published based on rules
        if (shouldAutoPublish(restaurant, rating, !!comment, aiReply.language)) {
          console.log(`[Google Business] Auto-publishing reply for review: ${savedReview.id}`);
          await postReplyToGoogle(restaurant, savedReview.id, aiReply.reply);
        } else if (restaurant.autoPostEnabled) {
          console.log(`[Google Business] Review ${savedReview.id} didn't match auto-publish rules, saving as draft`);
        }
      } catch (aiError) {
        console.error(`[Google Business] AI reply generation failed:`, aiError);
      }

      synced++;
    } catch (error) {
      console.error(`[Google Business] Error processing review:`, error);
      errors++;
    }
  }

  console.log(`[Google Business] Sync complete: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

export async function postReplyToGoogle(restaurant: Restaurant, reviewId: string, reply: string): Promise<boolean> {
  const accessToken = await getValidAccessToken(restaurant);
  if (!accessToken) {
    console.error("[Google Business] No valid access token for posting reply");
    return false;
  }

  const review = await storage.getReview(reviewId);
  if (!review || !review.googleReviewId) {
    console.error("[Google Business] Review not found or missing Google ID");
    return false;
  }

  try {
    const accountName = restaurant.googleAccountId?.startsWith("accounts/")
      ? restaurant.googleAccountId
      : `accounts/${restaurant.googleAccountId}`;
    const locationName = restaurant.googleLocationId?.startsWith("locations/")
      ? restaurant.googleLocationId
      : `locations/${restaurant.googleLocationId}`;
    
    const url = `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews/${review.googleReviewId}/reply`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: reply }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Google Business] Failed to post reply:", error);
      return false;
    }

    await storage.updateReview(reviewId, {
      postedReply: reply,
      replyStatus: "posted",
      repliedAt: new Date(),
    });

    console.log(`[Google Business] Reply posted for review: ${reviewId}`);
    return true;
  } catch (error) {
    console.error("[Google Business] Error posting reply:", error);
    return false;
  }
}

export async function syncAllConnectedRestaurants(): Promise<void> {
  console.log("[Google Business] Starting sync for all connected restaurants...");
  
  const connectedRestaurants = await storage.getConnectedRestaurants();
  console.log(`[Google Business] Found ${connectedRestaurants.length} connected restaurants`);

  for (const restaurant of connectedRestaurants) {
    try {
      await syncReviewsForRestaurant(restaurant);
    } catch (error) {
      console.error(`[Google Business] Error syncing restaurant ${restaurant.id}:`, error);
    }
  }

  console.log("[Google Business] Sync complete for all restaurants");
}
