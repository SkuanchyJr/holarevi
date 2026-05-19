import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("trial"), // trial, active, canceled, past_due
  subscriptionPlan: varchar("subscription_plan"), // local, pro, business, enterprise
  billingCycle: varchar("billing_cycle"), // monthly, yearly
  extraLocations: integer("extra_locations").default(0), // Business plan addon locations
  monthlyRepliesUsed: integer("monthly_replies_used").default(0), // Track monthly AI reply usage
  monthlyRepliesPeriodStart: timestamp("monthly_replies_period_start"), // When the current billing period started
  trialEndsAt: timestamp("trial_ends_at"),
  hasUsedProTrial: boolean("has_used_pro_trial").default(false), // Prevent multiple Pro trials
  onboardingStep: varchar("onboarding_step").default('add_location'),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  emailLanguage: varchar("email_language").default('es'), // es, en
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants table
export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  address: varchar("address"),
  googlePlaceId: varchar("google_place_id"),
  googleAccountId: varchar("google_account_id"),
  googleLocationId: varchar("google_location_id"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiresAt: timestamp("google_token_expires_at"),
  isConnected: boolean("is_connected").default(false),
  autoPostEnabled: boolean("auto_post_enabled").default(false),
  autoSyncReviews: boolean("auto_sync_reviews").default(true),
  toneOfVoice: varchar("tone_of_voice").default("friendly"), // friendly, formal, casual, mediterranean
  tonePresetId: varchar("tone_preset_id"), // Link to user's custom tone preset
  // Auto-publish rules
  autoPublishMinStars: integer("auto_publish_min_stars").default(4), // Minimum star rating to auto-publish (1-5)
  autoPublishWithComment: boolean("auto_publish_with_comment").default(true), // Auto-publish reviews with comments
  autoPublishWithoutComment: boolean("auto_publish_without_comment").default(true), // Auto-publish reviews without comments
  autoPublishNegative: boolean("auto_publish_negative").default(false), // Auto-publish negative reviews (1-2 stars)
  autoPublishLanguage: varchar("auto_publish_language").default("auto"), // auto, es, en, ca, fr, it, ar, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  googleReviewId: varchar("google_review_id").unique(),
  reviewerName: varchar("reviewer_name"),
  reviewerPhotoUrl: varchar("reviewer_photo_url"),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  language: varchar("language").default("en"), // en, es, ca
  sentiment: varchar("sentiment"), // positive, negative, neutral
  generatedReply: text("generated_reply"),
  postedReply: text("posted_reply"),
  replyStatus: varchar("reply_status").default("pending"), // pending, approved, posted, dismissed
  reviewedAt: timestamp("reviewed_at"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reviews_restaurant").on(table.restaurantId),
  index("idx_reviews_status").on(table.replyStatus),
]);

// Team members table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // The user who accepted the invitation
  email: varchar("email").notNull(),
  name: varchar("name"),
  role: varchar("role").default("member"), // admin, member, viewer
  status: varchar("status").default("pending"), // pending, active, inactive
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_team_members_owner").on(table.ownerId),
  index("idx_team_members_user").on(table.userId),
]);

// App configuration table (for prelaunch mode, etc.)
export const appConfig = pgTable("app_config", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Page views table for traffic analytics
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  path: varchar("path").notNull(),
  sessionId: varchar("session_id"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_page_views_created").on(table.createdAt),
  index("idx_page_views_session").on(table.sessionId),
  index("idx_page_views_path").on(table.path),
]);

// Tone presets table
export const tonePresets = pgTable("tone_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  style: varchar("style").default("friendly"), // friendly, formal, casual, professional, warm
  instructions: text("instructions"), // Custom AI instructions for this tone
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tone_presets_user").on(table.userId),
]);

// Affiliates table - separate from regular users
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  zone: varchar("zone"),
  status: varchar("status").default("active"), // active, paused
  commissionPct: integer("commission_pct").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Affiliate sessions table - persists affiliate logins across server restarts
export const affiliateSessions = pgTable("affiliate_sessions", {
  token: varchar("token").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("idx_affiliate_sessions_affiliate").on(table.affiliateId),
  index("idx_affiliate_sessions_expires").on(table.expiresAt),
]);

// Affiliate leads table
export const affiliateLeads = pgTable("affiliate_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  businessName: varchar("business_name").notNull(),
  contactName: varchar("contact_name"),
  city: varchar("city"),
  category: varchar("category"),
  totalReviews: integer("total_reviews"),
  unansweredReviews: integer("unanswered_reviews"),
  avgRating: varchar("avg_rating"),
  reviewsPerDay: varchar("reviews_per_day"),
  replyPct: varchar("reply_pct"),
  website: varchar("website"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  googleMapsUrl: text("google_maps_url"),
  status: varchar("status").default("pending"), // pending, called, not_interested, call_later, sale_closed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_affiliate_leads_affiliate").on(table.affiliateId),
  index("idx_affiliate_leads_status").on(table.status),
]);

// Affiliate sales table
export const affiliateSales = pgTable("affiliate_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").references(() => affiliateLeads.id, { onDelete: "set null" }),
  businessEmail: varchar("business_email"),
  planSoldEur: integer("plan_sold_eur"),
  comment: text("comment"),
  status: varchar("status").default("pending"), // pending, approved, rejected
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_affiliate_sales_affiliate").on(table.affiliateId),
  index("idx_affiliate_sales_status").on(table.status),
]);

// Promo codes table
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // "percentage" or "fixed"
  discountValue: integer("discount_value").notNull(), // percentage (0-100) or fixed amount in cents
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  maxUses: integer("max_uses"), // null means unlimited
  currentUses: integer("current_uses").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_promo_codes_code").on(table.code),
]);

// Review summaries table - stores cached AI-generated review analysis
export const reviewSummaries = pgTable("review_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }), // null means all locations
  language: varchar("language", { length: 5 }).notNull().default("es"), // es, ca, en
  summary: text("summary").notNull(),
  overallSentiment: varchar("overall_sentiment").notNull(), // positive, neutral, negative, mixed
  sentimentScore: integer("sentiment_score").notNull(),
  keyThemes: jsonb("key_themes").notNull().$type<Array<{
    theme: string;
    sentiment: "positive" | "neutral" | "negative";
    count: number;
    examples: string[];
  }>>(),
  trends: jsonb("trends").notNull().$type<{
    improving: string[];
    declining: string[];
    consistent: string[];
  }>(),
  recommendations: jsonb("recommendations").notNull().$type<string[]>(),
  reviewCount: integer("review_count").notNull(),
  analyzedCount: integer("analyzed_count").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_review_summaries_user").on(table.userId),
  index("idx_review_summaries_restaurant").on(table.restaurantId),
]);

// Blogs table for SEO content
export const blogs = pgTable("blogs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  language: varchar("language", { length: 5 }).notNull().default("es"), // es, en, ca
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_blogs_slug").on(table.slug),
  index("idx_blogs_published").on(table.published),
  index("idx_blogs_language").on(table.language),
]);

// Review QR codes table - for tracking Google Review QR scans
export const reviewQrs = pgTable("review_qrs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: varchar("name"),
  googleReviewUrl: varchar("google_review_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_review_qrs_restaurant").on(table.restaurantId),
  index("idx_review_qrs_active").on(table.isActive),
]);

// Review QR scan events table - tracks each QR scan
export const reviewQrEvents = pgTable("review_qr_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  qrId: varchar("qr_id").notNull().references(() => reviewQrs.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ip: varchar("ip"),
  country: varchar("country"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_review_qr_events_qr").on(table.qrId),
  index("idx_review_qr_events_created").on(table.createdAt),
]);

// Restaurant access table - tracks which users have access to which restaurants
export const restaurantAccess = pgTable("restaurant_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("member"), // owner, admin, member, viewer
  grantedBy: varchar("granted_by").references(() => users.id, { onDelete: "set null" }), // Who granted this access
  grantedAt: timestamp("granted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_restaurant_access_user").on(table.userId),
  index("idx_restaurant_access_restaurant").on(table.restaurantId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  restaurants: many(restaurants),
  teamMembers: many(teamMembers),
  tonePresets: many(tonePresets),
  restaurantAccess: many(restaurantAccess),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  user: one(users, {
    fields: [restaurants.userId],
    references: [users.id],
  }),
  reviews: many(reviews),
  accessList: many(restaurantAccess),
  reviewQrs: many(reviewQrs),
}));

export const reviewQrsRelations = relations(reviewQrs, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [reviewQrs.restaurantId],
    references: [restaurants.id],
  }),
  events: many(reviewQrEvents),
}));

export const reviewQrEventsRelations = relations(reviewQrEvents, ({ one }) => ({
  qr: one(reviewQrs, {
    fields: [reviewQrEvents.qrId],
    references: [reviewQrs.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [reviews.restaurantId],
    references: [restaurants.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  owner: one(users, {
    fields: [teamMembers.ownerId],
    references: [users.id],
  }),
}));

export const tonePresetsRelations = relations(tonePresets, ({ one }) => ({
  user: one(users, {
    fields: [tonePresets.userId],
    references: [users.id],
  }),
}));

export const restaurantAccessRelations = relations(restaurantAccess, ({ one }) => ({
  user: one(users, {
    fields: [restaurantAccess.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [restaurantAccess.restaurantId],
    references: [restaurants.id],
  }),
  grantedByUser: one(users, {
    fields: [restaurantAccess.grantedBy],
    references: [users.id],
  }),
}));

export const affiliatesRelations = relations(affiliates, ({ many }) => ({
  leads: many(affiliateLeads),
  sales: many(affiliateSales),
}));

export const affiliateLeadsRelations = relations(affiliateLeads, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateLeads.affiliateId],
    references: [affiliates.id],
  }),
}));

export const affiliateSalesRelations = relations(affiliateSales, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateSales.affiliateId],
    references: [affiliates.id],
  }),
  lead: one(affiliateLeads, {
    fields: [affiliateSales.leadId],
    references: [affiliateLeads.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  invitedAt: true,
});

export const insertTonePresetSchema = createInsertSchema(tonePresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export const insertRestaurantAccessSchema = createInsertSchema(restaurantAccess).omit({
  id: true,
  createdAt: true,
  grantedAt: true,
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAffiliateLeadSchema = createInsertSchema(affiliateLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAffiliateSaleSchema = createInsertSchema(affiliateSales).omit({
  id: true,
  createdAt: true,
  validatedAt: true,
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  createdAt: true,
  currentUses: true,
});

export const insertReviewSummarySchema = createInsertSchema(reviewSummaries).omit({
  id: true,
  generatedAt: true,
});

export const insertBlogSchema = createInsertSchema(blogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewQrSchema = createInsertSchema(reviewQrs).omit({
  id: true,
  createdAt: true,
});

export const insertReviewQrEventSchema = createInsertSchema(reviewQrEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTonePreset = z.infer<typeof insertTonePresetSchema>;
export type TonePreset = typeof tonePresets.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;
export type InsertRestaurantAccess = z.infer<typeof insertRestaurantAccessSchema>;
export type RestaurantAccess = typeof restaurantAccess.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliateLead = z.infer<typeof insertAffiliateLeadSchema>;
export type AffiliateLead = typeof affiliateLeads.$inferSelect;
export type InsertAffiliateSale = z.infer<typeof insertAffiliateSaleSchema>;
export type AffiliateSale = typeof affiliateSales.$inferSelect;

// Alerts table for 1-star reviews
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
  reviewId: varchar("review_id").references(() => reviews.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // e.g., "NEGATIVE_REVIEW"
  createdAt: timestamp("created_at").defaultNow(),
  resolved: boolean("resolved").default(false),
}, (table) => [
  index("IDX_alerts_user_id").on(table.userId),
  index("IDX_alerts_resolved").on(table.resolved),
  index("IDX_alerts_created_at").on(table.createdAt)
]);

// Generic email sequence logs — tracks all multi-step email sequences
export const emailSequenceLogs = pgTable("email_sequence_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sequence: varchar("sequence").notNull(), // 'activation' | 'trial_expiration' | 'nfc_upsell' | 'winback'
  emailNumber: integer("email_number").notNull(), // 1, 2, 3…
  sentAt: timestamp("sent_at").defaultNow(),
  status: varchar("status").notNull(), // 'success' | 'error'
  errorMessage: text("error_message"),
}, (table) => [
  index("idx_email_seq_logs_user_seq").on(table.userId, table.sequence),
]);

// Checkout recovery email logs — tracks the 3-email abandoned-checkout sequence
export const checkoutRecoveryEmailLogs = pgTable("checkout_recovery_email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailNumber: integer("email_number").notNull(), // 1, 2, or 3
  sentAt: timestamp("sent_at").defaultNow(),
  status: varchar("status").notNull(), // 'success' | 'error'
  errorMessage: text("error_message"),
}, (table) => [
  index("idx_checkout_recovery_user").on(table.userId),
  index("idx_checkout_recovery_email_num").on(table.userId, table.emailNumber),
]);

// Weekly email logs table — tracks sent weekly analytics emails per user
export const weeklyEmailLogs = pgTable("weekly_email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: "set null" }),
  weekStart: timestamp("week_start").notNull(), // Monday of the week — used for idempotency
  sentAt: timestamp("sent_at").defaultNow(),
  status: varchar("status").notNull(), // 'success' | 'error'
  errorMessage: text("error_message"),
}, (table) => [
  index("idx_weekly_email_logs_user").on(table.userId),
  index("idx_weekly_email_logs_week").on(table.userId, table.weekStart),
]);

export const insertEmailSequenceLogSchema = createInsertSchema(emailSequenceLogs).omit({
  id: true,
  sentAt: true,
});

export const insertCheckoutRecoveryEmailLogSchema = createInsertSchema(checkoutRecoveryEmailLogs).omit({
  id: true,
  sentAt: true,
});

export const insertWeeklyEmailLogSchema = createInsertSchema(weeklyEmailLogs).omit({
  id: true,
  sentAt: true,
});

// NFC Stand orders table
export const nfcOrders = pgTable("nfc_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(),
  status: varchar("status").default("pending_payment"), // pending_payment, paid, processing, shipped, delivered, cancelled, refunded
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  company: varchar("company"),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  postalCode: varchar("postal_code").notNull(),
  province: varchar("province"),
  country: varchar("country").default("ES"),
  quantity: integer("quantity").default(1),
  unitPriceCents: integer("unit_price_cents").default(2500),
  totalCents: integer("total_cents").default(2500),
  notes: text("notes"),
  confirmationEmailSent: boolean("confirmation_email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_nfc_orders_email").on(table.email),
  index("idx_nfc_orders_stripe_pi").on(table.stripePaymentIntentId),
]);

export const insertNfcOrderSchema = createInsertSchema(nfcOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  confirmationEmailSent: true,
});
export type InsertNfcOrder = z.infer<typeof insertNfcOrderSchema>;
export type NfcOrder = typeof nfcOrders.$inferSelect;

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [alerts.restaurantId],
    references: [restaurants.id],
  }),
  review: one(reviews, {
    fields: [alerts.reviewId],
    references: [reviews.id],
  }),
}));

export const insertAlertSchema = createInsertSchema(alerts);
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertEmailSequenceLog = z.infer<typeof insertEmailSequenceLogSchema>;
export type EmailSequenceLog = typeof emailSequenceLogs.$inferSelect;
export type InsertCheckoutRecoveryEmailLog = z.infer<typeof insertCheckoutRecoveryEmailLogSchema>;
export type CheckoutRecoveryEmailLog = typeof checkoutRecoveryEmailLogs.$inferSelect;
export type InsertWeeklyEmailLog = z.infer<typeof insertWeeklyEmailLogSchema>;
export type WeeklyEmailLog = typeof weeklyEmailLogs.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertReviewSummary = z.infer<typeof insertReviewSummarySchema>;
export type ReviewSummary = typeof reviewSummaries.$inferSelect;
export type InsertBlog = z.infer<typeof insertBlogSchema>;
export type Blog = typeof blogs.$inferSelect;
export type InsertReviewQr = z.infer<typeof insertReviewQrSchema>;
export type ReviewQr = typeof reviewQrs.$inferSelect;
export type InsertReviewQrEvent = z.infer<typeof insertReviewQrEventSchema>;
export type ReviewQrEvent = typeof reviewQrEvents.$inferSelect;

// API response types
export type DashboardStats = {
  totalReviews: number;
  pendingReplies: number;
  autoPosted: number;
  responseRate: number;
};

export type ReviewWithRestaurant = Review & {
  restaurant: Restaurant;
};

export type AdvancedAnalytics = {
  totalReviews: number;
  totalReplies: number;
  averageRating: number;
  responseRate: number; // percentage 0-100
  averageReplyTimeHours: number | null; // avg hours between review and reply
  unansweredReviews: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
  monthlyTrends: {
    month: string;
    reviews: number;
    replies: number;
    averageRating: number;
  }[];
  weeklyTrends: {
    week: string; // ISO week e.g. "2026-W13"
    reviews: number;
    replies: number;
    averageRating: number;
  }[];
  reviewsByDayOfWeek: {
    day: number; // 0=Sunday, 6=Saturday
    count: number;
    averageRating: number;
  }[];
  reviewsByLanguage: {
    language: string;
    count: number;
    averageRating: number;
  }[];
  replyStatusBreakdown: {
    pending: number;
    approved: number;
    posted: number;
    dismissed: number;
  };
  ratingOverTime: {
    date: string; // YYYY-MM
    rating: number;
  }[];
  topPerformingLocations: {
    restaurantId: string;
    name: string;
    reviewCount: number;
    averageRating: number;
    responseRate: number;
  }[];
  recentNegativeReviews: {
    id: string;
    reviewerName: string | null;
    rating: number;
    comment: string | null;
    restaurantName: string;
    createdAt: string | null;
    replyStatus: string | null;
  }[];
  comparison: {
    reviewsDelta: number;
    reviewsDeltaPct: number | null;
    ratingDelta: number;
    responseRateDelta: number;
    replyTimeDelta: number | null;
  };
  performanceScore: number;
  sentimentOverTime: {
    month: string;
    positive: number;
    neutral: number;
    negative: number;
  }[];
};

export type LocationOverview = {
  id: string;
  name: string;
  address: string | null;
  isConnected: boolean;
  reviewCount: number;
  replyCount: number;
  pendingReplies: number;
  averageRating: number;
  lastReviewDate: Date | null;
};

export type ReviewQrWithStats = ReviewQr & {
  scanCount: number;
  restaurantName: string;
  lastScanDate: Date | null;
  scansByDay: ReviewQrScansByDay[];
};

export type ReviewQrScansByDay = {
  date: string;
  count: number;
};

export type GlobalQrAnalytics = {
  totalScans: number;
  scansToday: number;
  scansLast7Days: number;
  scansLast30Days: number;
};
