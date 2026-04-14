/**
 * emailMetrics.ts — Database queries to compute weekly analytics metrics
 *
 * Computes per-restaurant metrics and aggregates them at the user level
 * for a single weekly analytics email per user.
 *
 * Required env vars: (none — uses shared db connection)
 */

import { db } from "../db";
import { reviews, restaurants, users } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeeklyMetrics {
  // User info
  userName: string;
  userEmail: string;
  businessNames: string[];
  planName: string | null;

  // Date range
  weekStart: string; // ISO date string (Monday)
  weekEnd: string;   // ISO date string (Sunday)
  weeksActive: number;

  // Aggregated review metrics
  reviewsReceived: number;
  autoResponded: number;
  avgResponseTime: string; // formatted: "X minutos" or "X horas"
  currentRating: string;   // e.g. "4.3"
  previousWeekRating: string;
  ratingChange: string;    // e.g. "+0.2" or "-0.1" or "sin cambios"
  negativeHandled: number;
  totalManaged: number;

  // Best review
  bestReview: string;

  // Review requests (null = feature not available)
  requestsSent: number | null;
  conversionRate: number | null;

  // Activity flag
  hasActivity: boolean;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Returns the last completed Mon–Sun week range (not the current week).
 * If today is Friday Mar 28, returns Mon Mar 17 – Sun Mar 23.
 */
export function getLastCompletedWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  // Find the most recent Monday (start of current week)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // Last week: 7 days before current Monday
  const weekStart = new Date(currentMonday);
  weekStart.setDate(currentMonday.getDate() - 7);

  const weekEnd = new Date(currentMonday);
  weekEnd.setDate(currentMonday.getDate() - 1); // Sunday
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

function formatResponseTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutos`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return `${hours.toFixed(1)} horas`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} días`;
}

// ─── Main query function ─────────────────────────────────────────────────────

/**
 * Compute aggregated weekly metrics for a user across all their restaurants.
 */
export async function computeWeeklyMetrics(
  userId: string,
  weekStartDate: Date,
  weekEndDate: Date
): Promise<WeeklyMetrics | null> {
  try {
    // 1. Get user info
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;

    // 2. Get all user's restaurants
    const userRestaurants = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.userId, userId));

    if (userRestaurants.length === 0) return null;

    const restaurantIds = userRestaurants.map((r) => r.id);
    const businessNames = userRestaurants.map((r) => r.name);

    // 3. Get ALL reviews for these restaurants (for all-time metrics)
    const allReviews = await db
      .select()
      .from(reviews)
      .where(inArray(reviews.restaurantId, restaurantIds));

    // 4. Filter reviews for this week's range
    const weekReviews = allReviews.filter((r) => {
      const createdAt = r.createdAt ? new Date(r.createdAt) : null;
      return createdAt && createdAt >= weekStartDate && createdAt <= weekEndDate;
    });

    // 5. Compute metrics
    const reviewsReceived = weekReviews.length;

    // Auto-responded: posted replies within the week
    const autoResponded = weekReviews.filter(
      (r) => r.replyStatus === "posted" && r.repliedAt
    ).length;

    // Average response time (reviews that were replied to this week)
    const respondedReviews = weekReviews.filter(
      (r) => r.repliedAt && r.createdAt
    );
    let avgResponseTimeMinutes = 0;
    if (respondedReviews.length > 0) {
      const totalMinutes = respondedReviews.reduce((sum, r) => {
        const created = new Date(r.createdAt!).getTime();
        const replied = new Date(r.repliedAt!).getTime();
        return sum + (replied - created) / 60000;
      }, 0);
      avgResponseTimeMinutes = totalMinutes / respondedReviews.length;
    }
    const avgResponseTime =
      respondedReviews.length > 0
        ? formatResponseTime(avgResponseTimeMinutes)
        : "Sin datos";

    // Current overall rating (all-time)
    const currentRatingNum =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    // Previous week rating (week before the range)
    const prevWeekStart = new Date(weekStartDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStartDate);
    prevWeekEnd.setTime(prevWeekEnd.getTime() - 1);

    const prevWeekReviews = allReviews.filter((r) => {
      const createdAt = r.createdAt ? new Date(r.createdAt) : null;
      return createdAt && createdAt >= prevWeekStart && createdAt <= prevWeekEnd;
    });

    // Calculate all-time rating excluding this week's reviews for "previous" baseline
    const reviewsBeforeThisWeek = allReviews.filter((r) => {
      const createdAt = r.createdAt ? new Date(r.createdAt) : null;
      return createdAt && createdAt < weekStartDate;
    });
    const prevRatingNum =
      reviewsBeforeThisWeek.length > 0
        ? reviewsBeforeThisWeek.reduce((sum, r) => sum + r.rating, 0) /
          reviewsBeforeThisWeek.length
        : currentRatingNum;

    const ratingDelta = currentRatingNum - prevRatingNum;
    let ratingChange: string;
    if (Math.abs(ratingDelta) < 0.01) {
      ratingChange = "sin cambios";
    } else if (ratingDelta > 0) {
      ratingChange = `+${ratingDelta.toFixed(1)}`;
    } else {
      ratingChange = ratingDelta.toFixed(1);
    }

    // Negative reviews handled this week
    const negativeHandled = weekReviews.filter((r) => r.rating <= 2).length;

    // Best review of the week
    let bestReview = "Sin reseñas esta semana";
    if (weekReviews.length > 0) {
      const sorted = [...weekReviews].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      bestReview = sorted[0].comment || "Reseña sin comentario";
    }

    // Total managed (all-time posted replies)
    const totalManaged = allReviews.filter(
      (r) => r.replyStatus === "posted"
    ).length;

    // Weeks active
    const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const msActive = weekEndDate.getTime() - userCreatedAt.getTime();
    const weeksActive = Math.max(1, Math.ceil(msActive / (7 * 24 * 60 * 60 * 1000)));

    // Has activity flag
    const hasActivity = reviewsReceived > 0 || autoResponded > 0;

    const weekStartStr = weekStartDate.toISOString().split("T")[0];
    const weekEndStr = weekEndDate.toISOString().split("T")[0];

    return {
      userName: user.firstName || user.email || "Cliente",
      userEmail: user.email || "",
      businessNames,
      planName: user.subscriptionPlan || "Gratuito",
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      weeksActive,
      reviewsReceived,
      autoResponded,
      avgResponseTime,
      currentRating: currentRatingNum.toFixed(1),
      previousWeekRating: prevRatingNum.toFixed(1),
      ratingChange,
      negativeHandled,
      totalManaged,
      bestReview,
      requestsSent: null,    // review_requests table not available
      conversionRate: null,  // review_requests table not available
      hasActivity,
    };
  } catch (error) {
    console.error(`[WeeklyEmail] Error computing metrics for user ${userId}:`, error);
    return null;
  }
}
