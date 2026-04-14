import {
  users,
  sessions,
  restaurants,
  reviews,
  teamMembers,
  tonePresets,
  appConfig,
  pageViews,
  restaurantAccess,
  affiliates,
  affiliateLeads,
  affiliateSales,
  promoCodes,
  reviewSummaries,
  blogs,
  reviewQrs,
  reviewQrEvents,
  alerts,
  type User,
  type UpsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Review,
  type InsertReview,
  type TeamMember,
  type InsertTeamMember,
  type TonePreset,
  type InsertTonePreset,
  type InsertPageView,
  type DashboardStats,
  type ReviewWithRestaurant,
  type AdvancedAnalytics,
  type LocationOverview,
  type RestaurantAccess,
  type InsertRestaurantAccess,
  type Affiliate,
  type InsertAffiliate,
  type AffiliateLead,
  type InsertAffiliateLead,
  type AffiliateSale,
  type InsertAffiliateSale,
  type PromoCode,
  type InsertPromoCode,
  type ReviewSummary,
  type InsertReviewSummary,
  type Blog,
  type InsertBlog,
  type ReviewQr,
  type InsertReviewQr,
  type ReviewQrEvent,
  type InsertReviewQrEvent,
  type ReviewQrWithStats,
  type ReviewQrScansByDay,
  type GlobalQrAnalytics,
  type Alert,
  type InsertAlert,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, isNotNull, inArray, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, data: Partial<User>): Promise<User | undefined>;
  updateUserReplyUsage(userId: string, repliesUsed: number, periodStart?: Date): Promise<User | undefined>;
  deleteUser(userId: string): Promise<void>;

  // Restaurant operations
  getRestaurantsByUserId(userId: string): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getConnectedRestaurants(): Promise<Restaurant[]>;
  getRestaurantsWithAutoSync(): Promise<Restaurant[]>;
  createRestaurant(data: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: string): Promise<void>;
  getRestaurantCount(userId: string): Promise<number>;

  // Review operations
  getReviewsByUserId(userId: string): Promise<ReviewWithRestaurant[]>;
  getReviewsByRestaurantId(restaurantId: string): Promise<Review[]>;
  getReview(id: string): Promise<Review | undefined>;
  getReviewByGoogleId(googleReviewId: string): Promise<Review | undefined>;
  createReview(data: InsertReview): Promise<Review>;
  updateReview(id: string, data: Partial<Review>): Promise<Review | undefined>;

  // Dashboard stats
  getDashboardStats(userId: string): Promise<DashboardStats>;

  // Team member operations
  getTeamMembers(ownerId: string): Promise<TeamMember[]>;
  getTeamMemberCount(ownerId: string): Promise<number>;
  getTeamMemberById(id: string): Promise<TeamMember | undefined>;
  getPendingInvitationsByEmail(email: string): Promise<(TeamMember & { ownerName: string })[]>;
  createTeamMember(data: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<void>;

  // Tone preset operations
  getTonePresets(userId: string): Promise<TonePreset[]>;
  getTonePresetCount(userId: string): Promise<number>;
  getTonePreset(id: string): Promise<TonePreset | undefined>;
  createTonePreset(data: InsertTonePreset): Promise<TonePreset>;
  updateTonePreset(id: string, data: Partial<TonePreset>): Promise<TonePreset | undefined>;
  deleteTonePreset(id: string): Promise<void>;

  // Alert operations
  getAlertsByUserId(userId: string, resolved?: boolean): Promise<Alert[]>;
  getAlertByReviewId(reviewId: string): Promise<Alert | undefined>;
  createAlert(data: InsertAlert): Promise<Alert>;
  updateAlert(id: string, data: Partial<Alert>): Promise<Alert | undefined>;
  deleteAlert(id: string): Promise<void>;

  // Analytics
  getAdvancedAnalytics(userId: string): Promise<AdvancedAnalytics>;
  getLocationOverview(userId: string): Promise<LocationOverview[]>;

  // Stripe operations
  getProduct(productId: string): Promise<any>;
  getSubscription(subscriptionId: string): Promise<any>;
  listPrices(): Promise<any[]>;

  // App config operations
  getConfig(key: string): Promise<string | undefined>;
  setConfig(key: string, value: string): Promise<void>;

  // Page view tracking
  trackPageView(data: InsertPageView): Promise<void>;

  // Restaurant access operations
  getRestaurantAccessByUserId(userId: string): Promise<(RestaurantAccess & { restaurant: Restaurant })[]>;
  getRestaurantAccessByRestaurantId(restaurantId: string): Promise<(RestaurantAccess & { user: User })[]>;
  grantRestaurantAccess(data: InsertRestaurantAccess): Promise<RestaurantAccess>;
  revokeRestaurantAccess(userId: string, restaurantId: string): Promise<void>;
  getUserRestaurantRole(userId: string, restaurantId: string): Promise<string | null>;

  // Affiliate operations
  getAllAffiliates(): Promise<Affiliate[]>;
  getAffiliateByUsername(username: string): Promise<Affiliate | undefined>;
  getAffiliateById(id: string): Promise<Affiliate | undefined>;
  createAffiliate(data: InsertAffiliate): Promise<Affiliate>;
  updateAffiliate(id: string, data: Partial<Affiliate>): Promise<Affiliate | undefined>;
  deleteAffiliate(id: string): Promise<void>;
  getAffiliateLeads(affiliateId: string): Promise<AffiliateLead[]>;
  getAffiliateLead(id: string): Promise<AffiliateLead | undefined>;
  createAffiliateLead(data: InsertAffiliateLead): Promise<AffiliateLead>;
  createAffiliateLeadsBulk(leads: InsertAffiliateLead[]): Promise<AffiliateLead[]>;
  updateAffiliateLeadStatus(leadId: string, status: string): Promise<AffiliateLead | undefined>;
  updateAffiliateLeadNotes(leadId: string, notes: string): Promise<AffiliateLead | undefined>;
  deleteAffiliateLead(id: string): Promise<void>;
  createAffiliateSale(data: InsertAffiliateSale): Promise<AffiliateSale>;
  getAffiliateSales(affiliateId: string): Promise<AffiliateSale[]>;
  getAllAffiliateSales(): Promise<(AffiliateSale & { affiliate: Affiliate | null })[]>;
  updateAffiliateSaleStatus(id: string, status: string): Promise<AffiliateSale | undefined>;
  getAllAffiliateLeadsWithAffiliate(): Promise<(AffiliateLead & { affiliateUsername: string | null })[]>;

  // Promo code operations
  getAllPromoCodes(): Promise<PromoCode[]>;
  getPromoCodeById(id: string): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: string): Promise<void>;
  incrementPromoCodeUsage(id: string): Promise<PromoCode | undefined>;

  // Review summary operations
  getReviewSummary(userId: string, restaurantId: string | null, language: string): Promise<ReviewSummary | undefined>;
  saveReviewSummary(data: InsertReviewSummary): Promise<ReviewSummary>;
  deleteReviewSummary(id: string): Promise<void>;

  // Blog operations
  getAllBlogs(): Promise<Blog[]>;
  getPublishedBlogs(language?: string): Promise<Blog[]>;
  getBlogById(id: string): Promise<Blog | undefined>;
  getBlogBySlug(slug: string): Promise<Blog | undefined>;
  createBlog(data: InsertBlog): Promise<Blog>;
  updateBlog(id: string, data: Partial<Blog>): Promise<Blog | undefined>;
  deleteBlog(id: string): Promise<void>;

  // Review QR operations
  getReviewQrsByUserId(userId: string): Promise<ReviewQrWithStats[]>;
  getAllReviewQrs(): Promise<ReviewQrWithStats[]>;
  getReviewQr(id: string): Promise<ReviewQr | undefined>;
  createReviewQr(data: InsertReviewQr): Promise<ReviewQr>;
  updateReviewQr(id: string, data: Partial<ReviewQr>): Promise<ReviewQr | undefined>;
  deleteReviewQr(id: string): Promise<void>;
  getReviewQrScansByDay(qrId: string): Promise<ReviewQrScansByDay[]>;
  createReviewQrEvent(data: InsertReviewQrEvent): Promise<ReviewQrEvent>;
  getGlobalQrAnalytics(): Promise<GlobalQrAnalytics>;
  getUserQrAnalytics(userId: string): Promise<GlobalQrAnalytics>;

  // Restaurant operations (admin)
  getAllRestaurants(): Promise<Restaurant[]>;

  // Trial eligibility check - returns true if user has EVER had a subscription (any status)
  hasSubscriptionHistory(userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, data: Partial<User>): Promise<User | undefined> {
    const sanitized: Record<string, unknown> = { ...data };
    if (typeof sanitized.subscriptionStatus === 'string') {
      sanitized.subscriptionStatus = sanitized.subscriptionStatus.trim();
    }
    if (typeof sanitized.onboardingStep === 'string') {
      sanitized.onboardingStep = sanitized.onboardingStep.trim();
    }
    const [user] = await db
      .update(users)
      .set({ ...sanitized, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete all user data in the correct order (to respect foreign keys)
    // 1. Delete reviews for user's restaurants
    const userRestaurants = await db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.userId, userId));
    const restaurantIds = userRestaurants.map(r => r.id);

    if (restaurantIds.length > 0) {
      // Delete review summaries for user's restaurants
      await db.delete(reviewSummaries).where(inArray(reviewSummaries.restaurantId, restaurantIds));
      // Delete reviews for user's restaurants
      await db.delete(reviews).where(inArray(reviews.restaurantId, restaurantIds));
      // Delete restaurant access grants
      await db.delete(restaurantAccess).where(inArray(restaurantAccess.restaurantId, restaurantIds));
    }

    // 2. Delete restaurants
    await db.delete(restaurants).where(eq(restaurants.userId, userId));

    // 3. Delete tone presets
    await db.delete(tonePresets).where(eq(tonePresets.userId, userId));

    // 4. Delete team members (where user is owner)
    await db.delete(teamMembers).where(eq(teamMembers.ownerId, userId));

    // 5. Delete restaurant access where user was granted access
    await db.delete(restaurantAccess).where(eq(restaurantAccess.userId, userId));

    // 6. Delete sessions
    await db.delete(sessions).where(sql`sess::jsonb->'passport'->>'user' = ${userId}`);

    // 7. Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  // Restaurant operations
  async getRestaurantsByUserId(userId: string): Promise<Restaurant[]> {
    // Get restaurants owned by the user
    const ownedRestaurants = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.userId, userId))
      .orderBy(desc(restaurants.createdAt));

    // Get restaurants the user has been granted access to
    const accessGrants = await db
      .select({ restaurant: restaurants })
      .from(restaurantAccess)
      .leftJoin(restaurants, eq(restaurantAccess.restaurantId, restaurants.id))
      .where(eq(restaurantAccess.userId, userId));

    const accessedRestaurants = accessGrants
      .map(row => row.restaurant)
      .filter((r): r is Restaurant => r !== null);

    // Combine and deduplicate
    const allRestaurants = [...ownedRestaurants];
    for (const r of accessedRestaurants) {
      if (!allRestaurants.find(existing => existing.id === r.id)) {
        allRestaurants.push(r);
      }
    }

    return allRestaurants.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    return restaurant;
  }

  async getConnectedRestaurants(): Promise<Restaurant[]> {
    return await db
      .select()
      .from(restaurants)
      .where(
        and(
          eq(restaurants.isConnected, true),
          isNotNull(restaurants.googleAccountId),
          isNotNull(restaurants.googleLocationId)
        )
      );
  }

  async createRestaurant(data: InsertRestaurant): Promise<Restaurant> {
    const [restaurant] = await db.insert(restaurants).values(data).returning();
    return restaurant;
  }

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant | undefined> {
    const [restaurant] = await db
      .update(restaurants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }

  async deleteRestaurant(id: string): Promise<void> {
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  // Review operations
  async getReviewsByUserId(userId: string): Promise<ReviewWithRestaurant[]> {
    const userRestaurants = await this.getRestaurantsByUserId(userId);
    if (userRestaurants.length === 0) return [];

    const restaurantIds = userRestaurants.map((r) => r.id);

    const reviewsData = await db
      .select()
      .from(reviews)
      .where(inArray(reviews.restaurantId, restaurantIds))
      .orderBy(desc(reviews.createdAt));

    return reviewsData.map((review) => ({
      ...review,
      restaurant: userRestaurants.find((r) => r.id === review.restaurantId)!,
    }));
  }

  async getReviewsByRestaurantId(restaurantId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.restaurantId, restaurantId))
      .orderBy(desc(reviews.createdAt));
  }

  async getReview(id: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getReviewByGoogleId(googleReviewId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.googleReviewId, googleReviewId));
    return review;
  }

  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }

  async updateReview(id: string, data: Partial<Review>): Promise<Review | undefined> {
    const [review] = await db
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const userRestaurants = await this.getRestaurantsByUserId(userId);
    if (userRestaurants.length === 0) {
      return {
        totalReviews: 0,
        pendingReplies: 0,
        autoPosted: 0,
        responseRate: 0,
      };
    }

    const restaurantIds = userRestaurants.map((r) => r.id);

    const allReviews = await db
      .select()
      .from(reviews)
      .where(sql`${reviews.restaurantId} IN ${restaurantIds}`);

    const totalReviews = allReviews.length;
    const pendingReplies = allReviews.filter((r) => r.replyStatus === "pending").length;
    const postedReplies = allReviews.filter((r) => r.replyStatus === "posted").length;

    // Count auto-posted (replies posted by auto-post restaurants)
    const autoPostRestaurantIds = userRestaurants
      .filter((r) => r.autoPostEnabled)
      .map((r) => r.id);
    const autoPosted = allReviews.filter(
      (r) => r.replyStatus === "posted" && autoPostRestaurantIds.includes(r.restaurantId)
    ).length;

    const responseRate = totalReviews > 0 ? Math.round((postedReplies / totalReviews) * 100) : 0;

    return {
      totalReviews,
      pendingReplies,
      autoPosted,
      responseRate,
    };
  }

  // Stripe operations - query from stripe schema
  async getProduct(productId: string): Promise<any> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.products WHERE id = ${productId}`
      );
      return result.rows[0] || null;
    } catch {
      return null;
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
      );
      return result.rows[0] || null;
    } catch {
      return null;
    }
  }

  async listPrices(): Promise<any[]> {
    try {
      const result = await db.execute(
        sql`
          SELECT 
            p.id,
            p.product as "productId",
            pr.name as "productName",
            p.unit_amount as "unitAmount",
            p.currency,
            p.recurring->>'interval' as interval
          FROM stripe.prices p
          LEFT JOIN stripe.products pr ON p.product = pr.id
          WHERE p.active = true
          ORDER BY p.unit_amount
        `
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  // User reply usage tracking
  async updateUserReplyUsage(userId: string, repliesUsed: number, periodStart?: Date): Promise<User | undefined> {
    const updateData: Partial<User> = {
      monthlyRepliesUsed: repliesUsed,
      updatedAt: new Date(),
    };
    if (periodStart) {
      updateData.monthlyRepliesPeriodStart = periodStart;
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Restaurant count
  async getRestaurantCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(restaurants)
      .where(eq(restaurants.userId, userId));
    return result[0]?.count || 0;
  }

  // Team member operations
  async getTeamMembers(ownerId: string): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.ownerId, ownerId))
      .orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMemberCount(ownerId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.ownerId, ownerId));
    return result[0]?.count || 0;
  }

  async getTeamMemberById(id: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async getPendingInvitationsByEmail(email: string): Promise<(TeamMember & { ownerName: string })[]> {
    const result = await db
      .select({
        id: teamMembers.id,
        ownerId: teamMembers.ownerId,
        userId: teamMembers.userId,
        email: teamMembers.email,
        name: teamMembers.name,
        role: teamMembers.role,
        status: teamMembers.status,
        invitedAt: teamMembers.invitedAt,
        acceptedAt: teamMembers.acceptedAt,
        createdAt: teamMembers.createdAt,
        updatedAt: teamMembers.updatedAt,
        ownerName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('owner_name'),
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.ownerId, users.id))
      .where(and(
        eq(teamMembers.email, email.toLowerCase()),
        eq(teamMembers.status, "pending")
      ));
    return result;
  }

  async createTeamMember(data: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values(data).returning();
    return member;
  }

  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const [member] = await db
      .update(teamMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return member;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Tone preset operations
  async getTonePresets(userId: string): Promise<TonePreset[]> {
    return await db
      .select()
      .from(tonePresets)
      .where(eq(tonePresets.userId, userId))
      .orderBy(desc(tonePresets.createdAt));
  }

  async getTonePresetCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(tonePresets)
      .where(eq(tonePresets.userId, userId));
    return result[0]?.count || 0;
  }

  async getTonePreset(id: string): Promise<TonePreset | undefined> {
    const [preset] = await db.select().from(tonePresets).where(eq(tonePresets.id, id));
    return preset;
  }

  async createTonePreset(data: InsertTonePreset): Promise<TonePreset> {
    const [preset] = await db.insert(tonePresets).values(data).returning();
    return preset;
  }

  async updateTonePreset(id: string, data: Partial<TonePreset>): Promise<TonePreset | undefined> {
    const [preset] = await db
      .update(tonePresets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tonePresets.id, id))
      .returning();
    return preset;
  }

  async deleteTonePreset(id: string): Promise<void> {
    await db.delete(tonePresets).where(eq(tonePresets.id, id));
  }

  // Alert operations
  async getAlertsByUserId(userId: string, resolved?: boolean): Promise<Alert[]> {
    if (resolved !== undefined) {
      return await db.select().from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.resolved, resolved))).orderBy(desc(alerts.createdAt));
    }
    return await db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
  }

  async getAlertByReviewId(reviewId: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.reviewId, reviewId));
    return alert;
  }

  async createAlert(data: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(data).returning();
    return alert;
  }

  async updateAlert(id: string, data: Partial<Alert>): Promise<Alert | undefined> {
    const [alert] = await db.update(alerts).set(data).where(eq(alerts.id, id)).returning();
    return alert;
  }

  async deleteAlert(id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  }

  // Advanced analytics
  async getAdvancedAnalytics(userId: string): Promise<AdvancedAnalytics> {
    const userRestaurants = await this.getRestaurantsByUserId(userId);

    const emptyResult: AdvancedAnalytics = {
      totalReviews: 0,
      totalReplies: 0,
      averageRating: 0,
      responseRate: 0,
      averageReplyTimeHours: null,
      unansweredReviews: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      ratingDistribution: [],
      monthlyTrends: [],
      weeklyTrends: [],
      reviewsByDayOfWeek: [],
      reviewsByLanguage: [],
      replyStatusBreakdown: { pending: 0, approved: 0, posted: 0, dismissed: 0 },
      ratingOverTime: [],
      topPerformingLocations: [],
      recentNegativeReviews: [],
    };

    if (userRestaurants.length === 0) {
      return emptyResult;
    }

    const restaurantIds = userRestaurants.map((r) => r.id);
    const restaurantNameMap = new Map(userRestaurants.map(r => [r.id, r.name]));

    const allReviews = await db
      .select()
      .from(reviews)
      .where(inArray(reviews.restaurantId, restaurantIds));

    const totalReviews = allReviews.length;
    if (totalReviews === 0) return emptyResult;

    const totalReplies = allReviews.filter((r) => r.replyStatus === "posted").length;
    const averageRating = Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10;
    const responseRate = Math.round((totalReplies / totalReviews) * 100);
    const unansweredReviews = allReviews.filter((r) => r.replyStatus === "pending" || !r.replyStatus).length;

    // Average reply time (hours) — only for reviews that have been replied
    const repliedReviews = allReviews.filter(r => r.repliedAt && r.reviewedAt);
    let averageReplyTimeHours: number | null = null;
    if (repliedReviews.length > 0) {
      const totalMs = repliedReviews.reduce((sum, r) => {
        const reviewDate = new Date(r.reviewedAt!).getTime();
        const replyDate = new Date(r.repliedAt!).getTime();
        return sum + Math.max(0, replyDate - reviewDate);
      }, 0);
      averageReplyTimeHours = Math.round((totalMs / repliedReviews.length / (1000 * 60 * 60)) * 10) / 10;
    }

    // Sentiment breakdown
    const sentimentBreakdown = {
      positive: allReviews.filter((r) => r.sentiment === "positive").length,
      neutral: allReviews.filter((r) => r.sentiment === "neutral" || !r.sentiment).length,
      negative: allReviews.filter((r) => r.sentiment === "negative").length,
    };

    // Rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: allReviews.filter((r) => r.rating === rating).length,
    }));

    // Reply status breakdown
    const replyStatusBreakdown = {
      pending: allReviews.filter(r => r.replyStatus === "pending" || !r.replyStatus).length,
      approved: allReviews.filter(r => r.replyStatus === "approved").length,
      posted: allReviews.filter(r => r.replyStatus === "posted").length,
      dismissed: allReviews.filter(r => r.replyStatus === "dismissed").length,
    };

    // Monthly trends (last 12 months)
    const monthlyTrendsMap = new Map<string, { reviews: number; replies: number; ratingSum: number }>();
    allReviews.forEach((review) => {
      const date = review.createdAt ? new Date(review.createdAt) : new Date();
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyTrendsMap.get(month) || { reviews: 0, replies: 0, ratingSum: 0 };
      existing.reviews++;
      existing.ratingSum += review.rating;
      if (review.replyStatus === "posted") existing.replies++;
      monthlyTrendsMap.set(month, existing);
    });

    const monthlyTrends = Array.from(monthlyTrendsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month,
        reviews: data.reviews,
        replies: data.replies,
        averageRating: Math.round((data.ratingSum / data.reviews) * 10) / 10,
      }));

    // Weekly trends (last 12 weeks)
    function getISOWeek(d: Date): string {
      const date = new Date(d.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
      const week1 = new Date(date.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }
    const weeklyTrendsMap = new Map<string, { reviews: number; replies: number; ratingSum: number }>();
    allReviews.forEach((review) => {
      const date = review.createdAt ? new Date(review.createdAt) : new Date();
      const week = getISOWeek(date);
      const existing = weeklyTrendsMap.get(week) || { reviews: 0, replies: 0, ratingSum: 0 };
      existing.reviews++;
      existing.ratingSum += review.rating;
      if (review.replyStatus === "posted") existing.replies++;
      weeklyTrendsMap.set(week, existing);
    });

    const weeklyTrends = Array.from(weeklyTrendsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, data]) => ({
        week,
        reviews: data.reviews,
        replies: data.replies,
        averageRating: Math.round((data.ratingSum / data.reviews) * 10) / 10,
      }));

    // Reviews by day of week
    const dayOfWeekMap = new Map<number, { count: number; ratingSum: number }>();
    for (let i = 0; i < 7; i++) dayOfWeekMap.set(i, { count: 0, ratingSum: 0 });
    allReviews.forEach((review) => {
      const date = review.createdAt ? new Date(review.createdAt) : new Date();
      const day = date.getDay();
      const existing = dayOfWeekMap.get(day)!;
      existing.count++;
      existing.ratingSum += review.rating;
    });
    const reviewsByDayOfWeek = Array.from(dayOfWeekMap.entries()).map(([day, data]) => ({
      day,
      count: data.count,
      averageRating: data.count > 0 ? Math.round((data.ratingSum / data.count) * 10) / 10 : 0,
    }));

    // Reviews by language
    const langMap = new Map<string, { count: number; ratingSum: number }>();
    allReviews.forEach((review) => {
      const lang = review.language || "unknown";
      const existing = langMap.get(lang) || { count: 0, ratingSum: 0 };
      existing.count++;
      existing.ratingSum += review.rating;
      langMap.set(lang, existing);
    });
    const reviewsByLanguage = Array.from(langMap.entries())
      .map(([language, data]) => ({
        language,
        count: data.count,
        averageRating: Math.round((data.ratingSum / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    // Rating over time (monthly average rating — last 12 months)
    const ratingOverTime = monthlyTrends.map(t => ({
      date: t.month,
      rating: t.averageRating,
    }));

    // Top performing locations with response rate
    const topPerformingLocations = userRestaurants.map((restaurant) => {
      const restaurantReviews = allReviews.filter((r) => r.restaurantId === restaurant.id);
      const revCount = restaurantReviews.length;
      const avgRating = revCount > 0
        ? Math.round((restaurantReviews.reduce((sum, r) => sum + r.rating, 0) / revCount) * 10) / 10
        : 0;
      const repCount = restaurantReviews.filter(r => r.replyStatus === "posted").length;
      const locResponseRate = revCount > 0 ? Math.round((repCount / revCount) * 100) : 0;
      return {
        restaurantId: restaurant.id,
        name: restaurant.name,
        reviewCount: revCount,
        averageRating: avgRating,
        responseRate: locResponseRate,
      };
    }).sort((a, b) => b.averageRating - a.averageRating);

    // Recent negative reviews (1-2 stars, last 10)
    const recentNegativeReviews = allReviews
      .filter(r => r.rating <= 2)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        reviewerName: r.reviewerName,
        rating: r.rating,
        comment: r.comment,
        restaurantName: restaurantNameMap.get(r.restaurantId) || "Unknown",
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        replyStatus: r.replyStatus,
      }));

    return {
      totalReviews,
      totalReplies,
      averageRating,
      responseRate,
      averageReplyTimeHours,
      unansweredReviews,
      sentimentBreakdown,
      ratingDistribution,
      monthlyTrends,
      weeklyTrends,
      reviewsByDayOfWeek,
      reviewsByLanguage,
      replyStatusBreakdown,
      ratingOverTime,
      topPerformingLocations,
      recentNegativeReviews,
    };
  }

  // Location overview for multi-location dashboard
  async getLocationOverview(userId: string): Promise<LocationOverview[]> {
    const userRestaurants = await this.getRestaurantsByUserId(userId);

    if (userRestaurants.length === 0) {
      return [];
    }

    const restaurantIds = userRestaurants.map((r) => r.id);

    const allReviews = await db
      .select()
      .from(reviews)
      .where(inArray(reviews.restaurantId, restaurantIds));

    return userRestaurants.map((restaurant) => {
      const restaurantReviews = allReviews.filter((r) => r.restaurantId === restaurant.id);
      const reviewCount = restaurantReviews.length;
      const replyCount = restaurantReviews.filter((r) => r.replyStatus === "posted").length;
      const pendingReplies = restaurantReviews.filter((r) => r.replyStatus === "pending").length;
      const averageRating = reviewCount > 0
        ? Math.round((restaurantReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
        : 0;
      const lastReview = restaurantReviews.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })[0];

      return {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        isConnected: restaurant.isConnected || false,
        reviewCount,
        replyCount,
        pendingReplies,
        averageRating,
        lastReviewDate: lastReview?.createdAt || null,
      };
    });
  }

  // App config operations
  async getConfig(key: string): Promise<string | undefined> {
    const [config] = await db
      .select()
      .from(appConfig)
      .where(eq(appConfig.key, key));
    return config?.value;
  }

  async setConfig(key: string, value: string): Promise<void> {
    await db
      .insert(appConfig)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appConfig.key,
        set: { value, updatedAt: new Date() },
      });
  }

  // Page view tracking
  async trackPageView(data: InsertPageView): Promise<void> {
    await db.insert(pageViews).values(data);
  }

  // Restaurant access operations
  async getRestaurantAccessByUserId(userId: string): Promise<(RestaurantAccess & { restaurant: Restaurant })[]> {
    const access = await db
      .select()
      .from(restaurantAccess)
      .leftJoin(restaurants, eq(restaurantAccess.restaurantId, restaurants.id))
      .where(eq(restaurantAccess.userId, userId));

    return access.map(row => ({
      ...row.restaurant_access,
      restaurant: row.restaurants!,
    }));
  }

  async getRestaurantAccessByRestaurantId(restaurantId: string): Promise<(RestaurantAccess & { user: User })[]> {
    const access = await db
      .select()
      .from(restaurantAccess)
      .leftJoin(users, eq(restaurantAccess.userId, users.id))
      .where(eq(restaurantAccess.restaurantId, restaurantId));

    return access.map(row => ({
      ...row.restaurant_access,
      user: row.users!,
    }));
  }

  async grantRestaurantAccess(data: InsertRestaurantAccess): Promise<RestaurantAccess> {
    // Check if access already exists
    const [existing] = await db
      .select()
      .from(restaurantAccess)
      .where(and(
        eq(restaurantAccess.userId, data.userId),
        eq(restaurantAccess.restaurantId, data.restaurantId)
      ));

    if (existing) {
      // Update existing access role
      const [updated] = await db
        .update(restaurantAccess)
        .set({ role: data.role })
        .where(eq(restaurantAccess.id, existing.id))
        .returning();
      return updated;
    }

    // Create new access
    const [access] = await db.insert(restaurantAccess).values(data).returning();
    return access;
  }

  async revokeRestaurantAccess(userId: string, restaurantId: string): Promise<void> {
    await db
      .delete(restaurantAccess)
      .where(and(
        eq(restaurantAccess.userId, userId),
        eq(restaurantAccess.restaurantId, restaurantId)
      ));
  }

  async getUserRestaurantRole(userId: string, restaurantId: string): Promise<string | null> {
    const [access] = await db
      .select()
      .from(restaurantAccess)
      .where(and(
        eq(restaurantAccess.userId, userId),
        eq(restaurantAccess.restaurantId, restaurantId)
      ));
    return access?.role || null;
  }

  // Affiliate operations
  async getAllAffiliates(): Promise<Affiliate[]> {
    return await db
      .select()
      .from(affiliates)
      .orderBy(desc(affiliates.createdAt));
  }

  async getAffiliateByUsername(username: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.username, username));
    return affiliate;
  }

  async getAffiliateById(id: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, id));
    return affiliate;
  }

  async createAffiliate(data: InsertAffiliate): Promise<Affiliate> {
    const [affiliate] = await db.insert(affiliates).values(data).returning();
    return affiliate;
  }

  async updateAffiliate(id: string, data: Partial<Affiliate>): Promise<Affiliate | undefined> {
    const [affiliate] = await db
      .update(affiliates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliates.id, id))
      .returning();
    return affiliate;
  }

  async deleteAffiliate(id: string): Promise<void> {
    await db.delete(affiliates).where(eq(affiliates.id, id));
  }

  async getAffiliateLeads(affiliateId: string): Promise<AffiliateLead[]> {
    return await db
      .select()
      .from(affiliateLeads)
      .where(eq(affiliateLeads.affiliateId, affiliateId))
      .orderBy(desc(affiliateLeads.createdAt));
  }

  async getAllAffiliateLeadsWithAffiliate(): Promise<(AffiliateLead & { affiliateUsername: string | null })[]> {
    const rows = await db
      .select({
        id: affiliateLeads.id,
        affiliateId: affiliateLeads.affiliateId,
        businessName: affiliateLeads.businessName,
        contactName: affiliateLeads.contactName,
        city: affiliateLeads.city,
        category: affiliateLeads.category,
        totalReviews: affiliateLeads.totalReviews,
        unansweredReviews: affiliateLeads.unansweredReviews,
        avgRating: affiliateLeads.avgRating,
        reviewsPerDay: affiliateLeads.reviewsPerDay,
        replyPct: affiliateLeads.replyPct,
        website: affiliateLeads.website,
        address: affiliateLeads.address,
        phone: affiliateLeads.phone,
        email: affiliateLeads.email,
        googleMapsUrl: affiliateLeads.googleMapsUrl,
        status: affiliateLeads.status,
        notes: affiliateLeads.notes,
        createdAt: affiliateLeads.createdAt,
        updatedAt: affiliateLeads.updatedAt,
        affiliateUsername: affiliates.username,
      })
      .from(affiliateLeads)
      .leftJoin(affiliates, eq(affiliateLeads.affiliateId, affiliates.id))
      .orderBy(desc(affiliateLeads.updatedAt));
    return rows;
  }

  async getAffiliateLead(id: string): Promise<AffiliateLead | undefined> {
    const [lead] = await db
      .select()
      .from(affiliateLeads)
      .where(eq(affiliateLeads.id, id));
    return lead;
  }

  async createAffiliateLead(data: InsertAffiliateLead): Promise<AffiliateLead> {
    const [lead] = await db.insert(affiliateLeads).values(data).returning();
    return lead;
  }

  async createAffiliateLeadsBulk(leads: InsertAffiliateLead[]): Promise<AffiliateLead[]> {
    if (leads.length === 0) return [];
    const inserted = await db.insert(affiliateLeads).values(leads).returning();
    return inserted;
  }

  async updateAffiliateLeadStatus(leadId: string, status: string): Promise<AffiliateLead | undefined> {
    const [lead] = await db
      .update(affiliateLeads)
      .set({ status, updatedAt: new Date() })
      .where(eq(affiliateLeads.id, leadId))
      .returning();
    return lead;
  }

  async updateAffiliateLeadNotes(leadId: string, notes: string): Promise<AffiliateLead | undefined> {
    const [lead] = await db
      .update(affiliateLeads)
      .set({ notes, updatedAt: new Date() })
      .where(eq(affiliateLeads.id, leadId))
      .returning();
    return lead;
  }

  async deleteAffiliateLead(id: string): Promise<void> {
    await db.delete(affiliateLeads).where(eq(affiliateLeads.id, id));
  }

  async createAffiliateSale(data: InsertAffiliateSale): Promise<AffiliateSale> {
    const [sale] = await db.insert(affiliateSales).values(data).returning();
    return sale;
  }

  async getAffiliateSales(affiliateId: string): Promise<AffiliateSale[]> {
    return await db
      .select()
      .from(affiliateSales)
      .where(eq(affiliateSales.affiliateId, affiliateId))
      .orderBy(desc(affiliateSales.createdAt));
  }

  async getAllAffiliateSales(): Promise<(AffiliateSale & { affiliate: Affiliate | null })[]> {
    const sales = await db
      .select()
      .from(affiliateSales)
      .orderBy(desc(affiliateSales.createdAt));

    // Join with affiliates
    const result = await Promise.all(
      sales.map(async (sale) => {
        const affiliate = await this.getAffiliateById(sale.affiliateId);
        return { ...sale, affiliate: affiliate || null };
      })
    );
    return result;
  }

  async updateAffiliateSaleStatus(id: string, status: string): Promise<AffiliateSale | undefined> {
    const updateData: any = { status };
    if (status === "validated") {
      updateData.validatedAt = new Date();
    }
    const [sale] = await db
      .update(affiliateSales)
      .set(updateData)
      .where(eq(affiliateSales.id, id))
      .returning();
    return sale;
  }

  // Promo code operations
  async getAllPromoCodes(): Promise<PromoCode[]> {
    return await db
      .select()
      .from(promoCodes)
      .orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCodeById(id: string): Promise<PromoCode | undefined> {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return promo;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    return promo;
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const [promo] = await db.insert(promoCodes).values({
      ...data,
      code: data.code.toUpperCase(),
    }).returning();
    return promo;
  }

  async updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const [promo] = await db
      .update(promoCodes)
      .set(data)
      .where(eq(promoCodes.id, id))
      .returning();
    return promo;
  }

  async deletePromoCode(id: string): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async incrementPromoCodeUsage(id: string): Promise<PromoCode | undefined> {
    const [promo] = await db
      .update(promoCodes)
      .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
      .where(eq(promoCodes.id, id))
      .returning();
    return promo;
  }

  async getRestaurantsWithAutoSync(): Promise<Restaurant[]> {
    return await db
      .select()
      .from(restaurants)
      .where(
        and(
          eq(restaurants.isConnected, true),
          eq(restaurants.autoSyncReviews, true),
          isNotNull(restaurants.googleAccountId),
          isNotNull(restaurants.googleLocationId)
        )
      );
  }

  // Review summary operations
  async getReviewSummary(userId: string, restaurantId: string | null, language: string): Promise<ReviewSummary | undefined> {
    const conditions = [
      eq(reviewSummaries.userId, userId),
      eq(reviewSummaries.language, language),
    ];

    if (restaurantId) {
      conditions.push(eq(reviewSummaries.restaurantId, restaurantId));
    } else {
      conditions.push(isNull(reviewSummaries.restaurantId));
    }

    const [summary] = await db
      .select()
      .from(reviewSummaries)
      .where(and(...conditions))
      .orderBy(desc(reviewSummaries.generatedAt))
      .limit(1);
    return summary;
  }

  async saveReviewSummary(data: InsertReviewSummary): Promise<ReviewSummary> {
    // First delete existing summary for the same user/restaurant/language combination
    const conditions = [
      eq(reviewSummaries.userId, data.userId),
      eq(reviewSummaries.language, data.language as string),
    ];

    if (data.restaurantId) {
      conditions.push(eq(reviewSummaries.restaurantId, data.restaurantId));
    } else {
      conditions.push(isNull(reviewSummaries.restaurantId));
    }

    await db.delete(reviewSummaries).where(and(...conditions));

    // Insert the new summary
    const [summary] = await db.insert(reviewSummaries).values(data as any).returning();
    return summary;
  }

  async deleteReviewSummary(id: string): Promise<void> {
    await db.delete(reviewSummaries).where(eq(reviewSummaries.id, id));
  }

  // Blog operations
  async getAllBlogs(): Promise<Blog[]> {
    return await db
      .select()
      .from(blogs)
      .orderBy(desc(blogs.createdAt));
  }

  async getPublishedBlogs(language?: string): Promise<Blog[]> {
    const query = db
      .select()
      .from(blogs)
      .where(
        language 
          ? and(eq(blogs.published, true), eq(blogs.language, language))
          : eq(blogs.published, true)
      )
      .orderBy(desc(blogs.createdAt));
    
    return await query;
  }

  async getBlogById(id: string): Promise<Blog | undefined> {
    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, id));
    return blog;
  }

  async getBlogBySlug(slug: string): Promise<Blog | undefined> {
    const [blog] = await db
      .select()
      .from(blogs)
      .where(eq(blogs.slug, slug));
    return blog;
  }

  async createBlog(data: InsertBlog): Promise<Blog> {
    const [blog] = await db
      .insert(blogs)
      .values(data)
      .returning();
    return blog;
  }

  async updateBlog(id: string, data: Partial<Blog>): Promise<Blog | undefined> {
    const [blog] = await db
      .update(blogs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogs.id, id))
      .returning();
    return blog;
  }

  async deleteBlog(id: string): Promise<void> {
    await db.delete(blogs).where(eq(blogs.id, id));
  }

  // Review QR operations
  async getReviewQrsByUserId(userId: string): Promise<ReviewQrWithStats[]> {
    const userRestaurants = await db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.userId, userId));
    const restaurantIds = userRestaurants.map(r => r.id);

    if (restaurantIds.length === 0) {
      return [];
    }

    const qrs = await db
      .select({
        id: reviewQrs.id,
        restaurantId: reviewQrs.restaurantId,
        name: reviewQrs.name,
        googleReviewUrl: reviewQrs.googleReviewUrl,
        isActive: reviewQrs.isActive,
        createdAt: reviewQrs.createdAt,
        scanCount: sql<number>`COALESCE((SELECT COUNT(*) FROM review_qr_events WHERE qr_id = ${reviewQrs.id}), 0)`.as('scan_count'),
        restaurantName: restaurants.name,
        lastScanDate: sql<Date | null>`(SELECT MAX(created_at) FROM review_qr_events WHERE qr_id = ${reviewQrs.id})`.as('last_scan_date'),
      })
      .from(reviewQrs)
      .innerJoin(restaurants, eq(reviewQrs.restaurantId, restaurants.id))
      .where(inArray(reviewQrs.restaurantId, restaurantIds))
      .orderBy(desc(reviewQrs.createdAt));

    // Get scansByDay for last 14 days for each QR
    const qrIds = qrs.map(qr => qr.id);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const scansByDayData = qrIds.length > 0 ? await db
      .select({
        qrId: reviewQrEvents.qrId,
        date: sql<string>`DATE(${reviewQrEvents.createdAt})`.as('date'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(reviewQrEvents)
      .where(and(
        inArray(reviewQrEvents.qrId, qrIds),
        sql`${reviewQrEvents.createdAt} >= ${fourteenDaysAgo}`
      ))
      .groupBy(reviewQrEvents.qrId, sql`DATE(${reviewQrEvents.createdAt})`)
      .orderBy(desc(sql`DATE(${reviewQrEvents.createdAt})`)) : [];

    // Group scansByDay by qrId
    const scansByDayByQr = new Map<string, ReviewQrScansByDay[]>();
    for (const row of scansByDayData) {
      if (!scansByDayByQr.has(row.qrId)) {
        scansByDayByQr.set(row.qrId, []);
      }
      scansByDayByQr.get(row.qrId)!.push({
        date: String(row.date),
        count: Number(row.count),
      });
    }

    return qrs.map(qr => ({
      id: qr.id,
      restaurantId: qr.restaurantId,
      name: qr.name,
      googleReviewUrl: qr.googleReviewUrl,
      isActive: qr.isActive,
      createdAt: qr.createdAt,
      scanCount: Number(qr.scanCount),
      restaurantName: qr.restaurantName,
      lastScanDate: qr.lastScanDate,
      scansByDay: scansByDayByQr.get(qr.id) || [],
    }));
  }

  async getAllReviewQrs(): Promise<ReviewQrWithStats[]> {
    const qrs = await db
      .select({
        id: reviewQrs.id,
        restaurantId: reviewQrs.restaurantId,
        name: reviewQrs.name,
        googleReviewUrl: reviewQrs.googleReviewUrl,
        isActive: reviewQrs.isActive,
        createdAt: reviewQrs.createdAt,
        scanCount: sql<number>`COALESCE((SELECT COUNT(*) FROM review_qr_events WHERE qr_id = ${reviewQrs.id}), 0)`.as('scan_count'),
        restaurantName: restaurants.name,
        lastScanDate: sql<Date | null>`(SELECT MAX(created_at) FROM review_qr_events WHERE qr_id = ${reviewQrs.id})`.as('last_scan_date'),
      })
      .from(reviewQrs)
      .innerJoin(restaurants, eq(reviewQrs.restaurantId, restaurants.id))
      .orderBy(desc(reviewQrs.createdAt));

    // Get scansByDay for last 14 days for each QR
    const qrIds = qrs.map(qr => qr.id);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const scansByDayData = qrIds.length > 0 ? await db
      .select({
        qrId: reviewQrEvents.qrId,
        date: sql<string>`DATE(${reviewQrEvents.createdAt})`.as('date'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(reviewQrEvents)
      .where(and(
        inArray(reviewQrEvents.qrId, qrIds),
        sql`${reviewQrEvents.createdAt} >= ${fourteenDaysAgo}`
      ))
      .groupBy(reviewQrEvents.qrId, sql`DATE(${reviewQrEvents.createdAt})`)
      .orderBy(desc(sql`DATE(${reviewQrEvents.createdAt})`)) : [];

    // Group scansByDay by qrId
    const scansByDayByQr = new Map<string, ReviewQrScansByDay[]>();
    for (const row of scansByDayData) {
      if (!scansByDayByQr.has(row.qrId)) {
        scansByDayByQr.set(row.qrId, []);
      }
      scansByDayByQr.get(row.qrId)!.push({
        date: String(row.date),
        count: Number(row.count),
      });
    }

    return qrs.map(qr => ({
      id: qr.id,
      restaurantId: qr.restaurantId,
      name: qr.name,
      googleReviewUrl: qr.googleReviewUrl,
      isActive: qr.isActive,
      createdAt: qr.createdAt,
      scanCount: Number(qr.scanCount),
      restaurantName: qr.restaurantName,
      lastScanDate: qr.lastScanDate,
      scansByDay: scansByDayByQr.get(qr.id) || [],
    }));
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants).orderBy(restaurants.name);
  }

  async getReviewQr(id: string): Promise<ReviewQr | undefined> {
    const [qr] = await db
      .select()
      .from(reviewQrs)
      .where(eq(reviewQrs.id, id));
    return qr;
  }

  async createReviewQr(data: InsertReviewQr): Promise<ReviewQr> {
    const [qr] = await db
      .insert(reviewQrs)
      .values(data)
      .returning();
    return qr;
  }

  async updateReviewQr(id: string, data: Partial<ReviewQr>): Promise<ReviewQr | undefined> {
    const [qr] = await db
      .update(reviewQrs)
      .set(data)
      .where(eq(reviewQrs.id, id))
      .returning();
    return qr;
  }

  async deleteReviewQr(id: string): Promise<void> {
    await db.update(reviewQrs).set({ isActive: false }).where(eq(reviewQrs.id, id));
  }

  async getReviewQrScansByDay(qrId: string): Promise<ReviewQrScansByDay[]> {
    const result = await db
      .select({
        date: sql<string>`DATE(${reviewQrEvents.createdAt})`.as('date'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(reviewQrEvents)
      .where(eq(reviewQrEvents.qrId, qrId))
      .groupBy(sql`DATE(${reviewQrEvents.createdAt})`)
      .orderBy(desc(sql`DATE(${reviewQrEvents.createdAt})`));

    return result.map(r => ({
      date: String(r.date),
      count: Number(r.count),
    }));
  }

  async createReviewQrEvent(data: InsertReviewQrEvent): Promise<ReviewQrEvent> {
    const [event] = await db
      .insert(reviewQrEvents)
      .values(data)
      .returning();
    return event;
  }

  async getGlobalQrAnalytics(): Promise<GlobalQrAnalytics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [result] = await db
      .select({
        totalScans: sql<number>`COUNT(*)`.as('total_scans'),
        scansToday: sql<number>`COUNT(*) FILTER (WHERE ${reviewQrEvents.createdAt} >= ${todayStart})`.as('scans_today'),
        scansLast7Days: sql<number>`COUNT(*) FILTER (WHERE ${reviewQrEvents.createdAt} >= ${sevenDaysAgo})`.as('scans_7_days'),
        scansLast30Days: sql<number>`COUNT(*) FILTER (WHERE ${reviewQrEvents.createdAt} >= ${thirtyDaysAgo})`.as('scans_30_days'),
      })
      .from(reviewQrEvents);

    return {
      totalScans: Number(result?.totalScans || 0),
      scansToday: Number(result?.scansToday || 0),
      scansLast7Days: Number(result?.scansLast7Days || 0),
      scansLast30Days: Number(result?.scansLast30Days || 0),
    };
  }

  async getUserQrAnalytics(userId: string): Promise<GlobalQrAnalytics> {
    // Get user's restaurants
    const userRestaurants = await db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.userId, userId));
    const restaurantIds = userRestaurants.map(r => r.id);

    if (restaurantIds.length === 0) {
      return { totalScans: 0, scansToday: 0, scansLast7Days: 0, scansLast30Days: 0 };
    }

    // Get QR IDs for user's restaurants
    const userQrs = await db.select({ id: reviewQrs.id }).from(reviewQrs).where(inArray(reviewQrs.restaurantId, restaurantIds));
    const qrIds = userQrs.map(q => q.id);

    if (qrIds.length === 0) {
      return { totalScans: 0, scansToday: 0, scansLast7Days: 0, scansLast30Days: 0 };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [result] = await db
      .select({
        totalScans: sql<number>`COUNT(*)`.as('total_scans'),
        scansToday: sql<number>`COUNT(*) FILTER (WHERE ${reviewQrEvents.createdAt} >= ${todayStart})`.as('scans_today'),
        scansLast7Days: sql<number>`COUNT(*) FILTER (WHERE ${reviewQrEvents.createdAt} >= ${sevenDaysAgo})`.as('scans_7_days'),
        scansLast30Days: sql<number>`COUNT(*) FILTER (WHERE ${reviewQrEvents.createdAt} >= ${thirtyDaysAgo})`.as('scans_30_days'),
      })
      .from(reviewQrEvents)
      .where(inArray(reviewQrEvents.qrId, qrIds));

    return {
      totalScans: Number(result?.totalScans || 0),
      scansToday: Number(result?.scansToday || 0),
      scansLast7Days: Number(result?.scansLast7Days || 0),
      scansLast30Days: Number(result?.scansLast30Days || 0),
    };
  }

  async hasSubscriptionHistory(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    // User has subscription history if:
    // 1. They have a stripe subscription ID (even if subscription is canceled)
    // 2. Their status indicates they had a subscription (active, canceled, past_due, trialing)
    // 3. They have a stripe customer ID (we'll check Stripe for history in the checkout endpoint)
    // 
    // IMPORTANT: subscriptionStatus is NOT cleared on cancellation to preserve history
    const hasHadSubscription = !!(
      user.stripeSubscriptionId ||
      (user.subscriptionStatus &&
        user.subscriptionStatus !== 'pending' &&
        user.subscriptionStatus !== 'trial' &&
        user.subscriptionStatus !== null)
    );

    return hasHadSubscription;
  }
}

export const storage = new DatabaseStorage();
