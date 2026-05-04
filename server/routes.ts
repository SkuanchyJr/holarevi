import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";

function getPublicBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "https://holarevi.com";
  return `${req.protocol}://${req.get("host")}`;
}
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, asc, and, sql, gte, lte, or, isNull } from "drizzle-orm";
import { reviews, restaurants, affiliateSessions as affiliateSessionsTable } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { ensureDemoEnvironment, DEMO_USER_EMAIL, isDemoEmail } from "./affiliateDemo";
import { setupGoogleAuth } from "./googleAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { onboardingRouter } from "./onboarding";
import { alertsRouter } from "./alerts";
import { generateReviewReply, analyzeReviewSummary } from "./openai";
import { insertRestaurantSchema, insertReviewSchema, insertTeamMemberSchema, insertTonePresetSchema } from "@shared/schema";
import {
  fetchGoogleAccounts,
  fetchGoogleLocations,
  syncReviewsForRestaurant,
  syncAllConnectedRestaurants,
  postReplyToGoogle,
} from "./googleBusiness";
import { sendReplyNotification } from "./jobs/replyNotificationEmail";
import { PLANS, TRIAL_CONFIG, getStripePriceId, getPlanFromPriceId, type PlanId, type BillingCycle } from "@shared/plans";
import {
  canAddLocation,
  canAddTeamMember,
  canAddTonePreset,
  canSendReply,
  canAccessMultiLocationDashboard,
  canAddExtraLocation,
  getMonthlyReplyUsage,
  getUserPlanInfo,
  PLAN_ERROR_CODES,
} from "./planHelpers";
import { createPrelaunchMiddleware, setPrelaunchEnabled, isPrelaunchEnabled } from "./prelaunchMiddleware";
import Database from "@replit/database";

let replitDb: any;
if (process.env.REPLIT_DB_URL) {
  replitDb = new Database();
} else {
  console.log("[DB] REPLIT_DB_URL not set, using in-memory mock for contacts.");
  const mockDb = new Map<string, any>();
  replitDb = {
    set: async (k: string, v: any) => mockDb.set(k, v),
    get: async (k: string) => mockDb.get(k),
    delete: async (k: string) => mockDb.delete(k),
    list: async (prefix: string) => Array.from(mockDb.keys()).filter(k => k.startsWith(prefix))
  };
}

// Types for subscription management
interface ActiveSubscription {
  id: string;
  status: string;
  currentPriceId: string;
  currentPlanId: string | null;
  billingCycle: string | null;
  cancelAtPeriodEnd: boolean;
}

// Helper to get active subscription for a customer
// Returns null if no active/trialing/past_due/unpaid/incomplete subscription exists
// CRITICAL: Must check all "live" statuses to prevent duplicate subscriptions
async function getActiveSubscription(
  stripe: any,
  customerId: string
): Promise<ActiveSubscription | null> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
      expand: ['data.items.data.price']
    });

    // CRITICAL: Check for ALL "live" subscription statuses
    // These are subscriptions that are still billable and should not have duplicates:
    // - active: Normal active subscription
    // - trialing: In trial period
    // - past_due: Payment failed but subscription still live
    // - unpaid: Payment required but subscription not yet canceled
    // - incomplete: Initial payment pending (e.g., 3D Secure)
    const liveStatuses = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];

    const activeSub = subscriptions.data.find(
      (sub: any) => liveStatuses.includes(sub.status)
    );

    if (!activeSub) {
      console.log(`[Subscription] No live subscription found for customer ${customerId}`);
      return null;
    }

    const priceId = activeSub.items.data[0]?.price?.id;
    const metadata = activeSub.metadata || {};

    console.log(`[Subscription] Found live subscription ${activeSub.id} (status: ${activeSub.status}) for customer ${customerId}`);

    return {
      id: activeSub.id,
      status: activeSub.status,
      currentPriceId: priceId,
      currentPlanId: metadata.planId || null,
      billingCycle: metadata.billingCycle || null,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end
    };
  } catch (error: any) {
    console.error(`[Subscription] Error getting active subscription:`, error?.message);
    return null;
  }
}

// Helper to upgrade/downgrade an existing subscription
// Uses Stripe's proration to handle billing correctly
async function upgradeSubscription(
  stripe: any,
  subscriptionId: string,
  newPriceId: string,
  planId: string,
  billingCycle: string
): Promise<{ success: boolean; subscription?: any; error?: string }> {
  try {
    console.log(`[Subscription] Upgrading subscription ${subscriptionId} to price ${newPriceId}`);

    // Get the subscription to find the item ID
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0]?.id;

    if (!itemId) {
      return { success: false, error: 'No subscription item found' };
    }

    // Update the subscription with the new price
    // proration_behavior: 'create_prorations' creates credit for unused time
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: itemId,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
      metadata: {
        planId,
        billingCycle,
        upgradedAt: new Date().toISOString(),
      },
      // If subscription was set to cancel, remove that
      cancel_at_period_end: false,
    });

    console.log(`[Subscription] Successfully upgraded subscription ${subscriptionId} to plan ${planId}`);

    return { success: true, subscription: updatedSubscription };
  } catch (error: any) {
    console.error(`[Subscription] Error upgrading subscription:`, error?.message);
    return { success: false, error: error?.message || 'Failed to upgrade subscription' };
  }
}

// Helper to verify and get/create a valid Stripe customer
// Handles test→live mode migration by recreating customers that don't exist
async function getOrCreateStripeCustomer(
  stripe: any,
  userId: string,
  existingCustomerId: string | null,
  email: string | null
): Promise<string> {
  // If we have an existing customer ID, verify it exists and is not deleted
  if (existingCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(existingCustomerId);
      // Check if customer is deleted (Stripe returns deleted customers with deleted: true)
      if (existingCustomer.deleted) {
        console.log(`[Stripe] Customer ${existingCustomerId} is deleted, creating new customer`);
      } else {
        console.log(`[Stripe] Verified existing customer ${existingCustomerId}`);
        return existingCustomerId;
      }
    } catch (error: any) {
      if (error?.code === 'resource_missing') {
        console.log(`[Stripe] Customer ${existingCustomerId} not found (likely test→live migration), creating new customer`);
        // Customer doesn't exist (e.g., was from test mode), create a new one
      } else {
        throw error; // Re-throw other errors
      }
    }
  }

  // Create a new customer
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { userId },
  });

  // Update user with new customer ID
  await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
  console.log(`[Stripe] Created new customer ${customer.id} for user ${userId}`);

  return customer.id;
}

// Simple admin session tokens (in-memory for simplicity)
const adminSessions = new Map<string, { createdAt: number }>();

// Admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "H0l@Revi!9Qf#T2XkM8";

// Generate a simple random token
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Admin authentication middleware
function isAdminAuthenticated(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token;

  if (!token || !adminSessions.has(token)) {
    // Check if this is an API request or browser request
    if (req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    // Redirect to login page for browser requests
    return res.redirect('/admin/login');
  }

  // Check if session is still valid (24 hours)
  const session = adminSessions.get(token);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (session && Date.now() - session.createdAt > maxAge) {
    adminSessions.delete(token);
    if (req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, message: "Session expired" });
    }
    return res.redirect('/admin/login');
  }

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/robots.txt", (_req, res) => {
    const domain = "https://holarevi.com";
    res.type("text/plain").send(
      `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /affiliate/\nDisallow: /api/\n\nSitemap: ${domain}/sitemap.xml\n`
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const domain = "https://holarevi.com";
    const staticPages = [
      "", "/pricing", "/contact", "/privacy", "/terms", "/blog",
      "/auth", "/google-permissions",
    ];
    const langs = ["es", "en"];

    const escapeXml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

    let urls = "";
    for (const lang of langs) {
      for (const page of staticPages) {
        urls += `  <url><loc>${escapeXml(`${domain}/${lang}${page}`)}</loc><changefreq>${page === "" ? "daily" : "weekly"}</changefreq><priority>${page === "" ? "1.0" : "0.8"}</priority></url>\n`;
      }
    }

    try {
      const blogPosts = await storage.getPublishedBlogs();
      for (const post of blogPosts) {
        const lang = post.language || "es";
        const slug = encodeURIComponent(post.slug);
        urls += `  <url><loc>${escapeXml(`${domain}/${lang}/blog/${slug}`)}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
      }
    } catch (e: any) {
      console.error("[Sitemap] Error fetching blogs for sitemap:", e?.message);
    }

    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`
    );
  });

  // Prelaunch middleware - must be first to block all routes when active
  app.use(createPrelaunchMiddleware());

  // Auth middleware
  await setupAuth(app);

  // Redirect legacy /api/login GET requests to the frontend auth page
  app.get("/api/login", (_req, res) => {
    res.redirect(302, "/es/auth");
  });

  // Block sensitive actions (Stripe, Google connect, billing, profile mutations)
  // for the affiliate demo user so demos can't accidentally charge or change
  // anything in the underlying account.
  app.use((req, res, next) => {
    if (!req.session?.isDemo) return next();
    const path = req.path;
    const isSensitive =
      path.startsWith("/api/billing") ||
      path.startsWith("/api/stripe") ||
      path.startsWith("/api/google/connect") ||
      path.startsWith("/api/google/disconnect") ||
      path.startsWith("/api/sync-all-reviews") ||
      path.startsWith("/api/team") ||
      (req.method === "POST" && path === "/api/restaurants") ||
      (req.method === "PATCH" && path === "/api/auth/user") ||
      (req.method === "DELETE" && path.startsWith("/api/restaurants"));
    if (isSensitive) {
      return res.status(403).json({
        message: "Action not available in demo mode",
        demoBlocked: true,
      });
    }
    next();
  });

  // Google OAuth routes
  setupGoogleAuth(app);

    // Admin login endpoint
    app.post("/api/admin/login", (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password required" });
        }

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const token = generateToken();
            adminSessions.set(token, { createdAt: Date.now() });

            // Set cookie (24 hours, httpOnly for security)
            // Only use secure flag when actually over HTTPS
            const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
            res.cookie('admin_token', token, {
                httpOnly: true,
                secure: isSecure,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                sameSite: 'lax'
            });

            return res.json({ success: true, message: "Login successful" });
        }

        return res.status(401).json({ success: false, message: "Invalid credentials" });
    });

  // Admin logout endpoint
  app.post("/api/admin/logout", (req, res) => {
    const token = req.cookies?.admin_token;
    if (token) {
      adminSessions.delete(token);
    }
    res.clearCookie('admin_token');
    return res.json({ success: true, message: "Logged out" });
  });

  // Admin session check endpoint
  app.get("/api/admin/session", (req, res) => {
    const token = req.cookies?.admin_token;
    if (token && adminSessions.has(token)) {
      const session = adminSessions.get(token);
      const maxAge = 24 * 60 * 60 * 1000;
      if (session && Date.now() - session.createdAt < maxAge) {
        return res.json({ authenticated: true });
      }
    }
    return res.json({ authenticated: false });
  });

  // Prelaunch status endpoint (public - for frontend guard)
  app.get("/api/prelaunch-status", async (req, res) => {
    try {
      const enabled = await isPrelaunchEnabled();
      return res.json({ success: true, prelaunchEnabled: enabled });
    } catch (error) {
      console.error("Error checking prelaunch status:", error);
      return res.status(500).json({ success: false, message: "Failed to check prelaunch status" });
    }
  });

  // Page view tracking endpoint (public - for analytics)
  app.post("/api/track-page-view", async (req, res) => {
    try {
      const { path } = req.body;
      if (!path || typeof path !== 'string' || path.length > 500) {
        return res.status(400).json({ success: false, message: "Valid path required (max 500 chars)" });
      }

      // Get or create session ID from cookie
      let sessionId = req.cookies?.session_id;
      if (!sessionId) {
        sessionId = generateToken();
        res.cookie('session_id', sessionId, {
          httpOnly: true,
          secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
          maxAge: 30 * 60 * 1000, // 30 minutes session
          sameSite: 'lax'
        });
      }

      await storage.trackPageView({
        path,
        sessionId,
        userAgent: req.headers['user-agent'] || null,
        referrer: req.headers['referer'] || null,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Error tracking page view:", error);
      return res.status(500).json({ success: false, message: "Failed to track page view" });
    }
  });

  // Helper to validate Google Review URLs - only allows legitimate review-specific endpoints
  // Blocks known Google redirector paths (e.g., /url) to prevent open redirect attacks
  const isValidGoogleReviewUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();

      // Block known Google redirector paths that can redirect to any domain
      const blockedPaths = ['/url', '/amp/s', '/interstitialredirect', '/pagead'];
      if (blockedPaths.some(blocked => pathname.startsWith(blocked))) {
        return false;
      }

      // Check for g.page short links (Google Business Profile - safe, review-specific)
      if (hostname === 'g.page' || hostname === 'www.g.page') {
        return true;
      }

      // Check for maps.app.goo.gl (Google Maps specific short links)
      // Note: generic goo.gl is NOT allowed as it can redirect to any domain
      if (hostname === 'maps.app.goo.gl') {
        return true;
      }

      // Check for search.google.* domains with review-specific paths
      const searchGooglePattern = /^search\.google\.(com|es|co\.uk|de|fr|it|pt|nl|be|at|ch|ca|com\.mx|com\.ar|com\.br|com\.au|co\.in|co\.jp|co\.kr|com\.sg|pl|ru|se|no|dk|fi|ie|cz|hu|ro|bg|gr|sk|si|hr|lt|lv|ee|lu|mt|cy)$/;
      if (searchGooglePattern.test(hostname)) {
        // Only allow review-related paths
        if (pathname.startsWith('/local/writereview') || pathname.startsWith('/local/reviews')) {
          return true;
        }
        return false;
      }

      // Check for maps.google.* domains (Google Maps URLs for reviews)
      const mapsGooglePattern = /^maps\.google\.(com|es|co\.uk|de|fr|it|pt|nl|be|at|ch|ca|com\.mx|com\.ar|com\.br|com\.au|co\.in|co\.jp|co\.kr|com\.sg|pl|ru|se|no|dk|fi|ie|cz|hu|ro|bg|gr|sk|si|hr|lt|lv|ee|lu|mt|cy)$/;
      if (mapsGooglePattern.test(hostname)) {
        // Maps URLs are review-safe as they point to places
        return true;
      }

      // Check for www.google.*/maps paths (Google Maps embedded in main site)
      const googleDomainPattern = /^(www\.)?google\.(com|es|co\.uk|de|fr|it|pt|nl|be|at|ch|ca|com\.mx|com\.ar|com\.br|com\.au|co\.in|co\.jp|co\.kr|com\.sg|pl|ru|se|no|dk|fi|ie|cz|hu|ro|bg|gr|sk|si|hr|lt|lv|ee|lu|mt|cy)$/;
      if (googleDomainPattern.test(hostname)) {
        // Only allow /maps paths (for place/review URLs)
        // Block /search, /, /url and any other paths as they can redirect externally
        if (pathname.startsWith('/maps')) {
          return true;
        }
        return false;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Public QR redirect endpoint - tracks scans and redirects to Google Reviews
  app.get("/r/:qrId", async (req, res) => {
    try {
      const { qrId } = req.params;
      const qr = await storage.getReviewQr(qrId);

      if (!qr || !qr.isActive) {
        return res.status(404).send("QR code not found or inactive");
      }

      // Validate stored URL is safe before redirecting (prevents legacy malicious URLs)
      if (!isValidGoogleReviewUrl(qr.googleReviewUrl)) {
        console.error(`Blocked invalid redirect URL for QR ${qrId}: ${qr.googleReviewUrl}`);
        return res.status(400).send("Invalid redirect URL");
      }

      // Store scan event (non-blocking)
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      storage.createReviewQrEvent({
        qrId: qr.id,
        ip,
        userAgent,
        country: null,
      }).catch(err => console.error("Error logging QR scan:", err));

      // Redirect to Google Reviews URL
      return res.redirect(302, qr.googleReviewUrl);
    } catch (error) {
      console.error("Error handling QR redirect:", error);
      return res.status(500).send("Server error");
    }
  });

  // Prelaunch status endpoint (admin only - for admin panel)
  app.get("/api/admin/prelaunch-status", isAdminAuthenticated, async (req, res) => {
    try {
      const enabled = await isPrelaunchEnabled();
      return res.json({ success: true, prelaunchEnabled: enabled });
    } catch (error) {
      console.error("Error checking prelaunch status:", error);
      return res.status(500).json({ success: false, message: "Failed to check prelaunch status" });
    }
  });

  // Disable prelaunch endpoint (admin only)
  app.post("/api/admin/disable-prelaunch", isAdminAuthenticated, async (req, res) => {
    try {
      await setPrelaunchEnabled(false);
      console.log("[Admin] Prelaunch mode disabled");
      return res.json({ success: true, message: "Prelaunch mode disabled" });
    } catch (error) {
      console.error("Error disabling prelaunch:", error);
      return res.status(500).json({ success: false, message: "Failed to disable prelaunch mode" });
    }
  });

  // Enable prelaunch endpoint (admin only)
  app.post("/api/admin/enable-prelaunch", isAdminAuthenticated, async (req, res) => {
    try {
      await setPrelaunchEnabled(true);
      console.log("[Admin] Prelaunch mode enabled");
      return res.json({ success: true, message: "Prelaunch mode enabled" });
    } catch (error) {
      console.error("Error enabling prelaunch:", error);
      return res.status(500).json({ success: false, message: "Failed to enable prelaunch mode" });
    }
  });

  app.post("/api/admin/regenerate-missing-replies", isAdminAuthenticated, async (req, res) => {
    try {
      const { restaurantId } = req.body;
      if (!restaurantId) {
        return res.status(400).json({ success: false, message: "restaurantId is required" });
      }

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const user = await storage.getUser(restaurant.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found for restaurant" });
      }

      const allReviews = await storage.getReviewsByRestaurantId(restaurantId);
      const pendingReviews = allReviews.filter(
        (r) => !r.generatedReply && r.replyStatus === "pending"
      );

      if (pendingReviews.length === 0) {
        return res.json({ success: true, message: "No reviews need AI replies", generated: 0 });
      }

      let customInstructions: string | undefined;
      let toneStyle = restaurant.toneOfVoice || "friendly";
      if (restaurant.tonePresetId) {
        const tonePreset = await storage.getTonePreset(restaurant.tonePresetId);
        if (tonePreset && tonePreset.userId === restaurant.userId) {
          customInstructions = tonePreset.instructions || undefined;
          toneStyle = tonePreset.style || toneStyle;
        }
      }

      let generated = 0;
      let errors = 0;

      for (const review of pendingReviews) {
        try {
          const aiReply = await generateReviewReply({
            reviewerName: review.reviewerName || "Customer",
            rating: review.rating,
            comment: review.comment || "",
            restaurantName: restaurant.name,
            toneOfVoice: toneStyle,
            customInstructions,
          });

          await storage.updateReview(review.id, {
            generatedReply: aiReply.reply,
            language: aiReply.language,
            sentiment: aiReply.sentiment,
          });

          generated++;
          console.log(`[Admin] Generated AI reply for review ${review.id} (${generated}/${pendingReviews.length})`);
        } catch (err) {
          console.error(`[Admin] Failed to generate reply for review ${review.id}:`, err);
          errors++;
        }
      }

      return res.json({
        success: true,
        message: `Generated ${generated} AI replies (${errors} errors)`,
        generated,
        errors,
        total: pendingReviews.length,
      });
    } catch (error) {
      console.error("Error regenerating missing replies:", error);
      return res.status(500).json({ success: false, message: "Failed to regenerate replies" });
    }
  });

  // Admin promo codes routes
  app.get("/api/admin/promo-codes", isAdminAuthenticated, async (req, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      return res.json({ success: true, promoCodes });
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/admin/promo-codes", isAdminAuthenticated, async (req, res) => {
    try {
      const { code, discountType, discountValue, expiresAt, isActive, maxUses } = req.body;

      if (!code || typeof code !== "string" || code.length < 2 || code.length > 50) {
        return res.status(400).json({ success: false, message: "Valid code is required (2-50 characters)" });
      }

      if (!discountType || !["percentage", "fixed"].includes(discountType)) {
        return res.status(400).json({ success: false, message: "Discount type must be 'percentage' or 'fixed'" });
      }

      if (!discountValue || typeof discountValue !== "number" || discountValue <= 0) {
        return res.status(400).json({ success: false, message: "Valid discount value is required" });
      }

      if (discountType === "percentage" && discountValue > 100) {
        return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 100%" });
      }

      // Check if code already exists
      const existing = await storage.getPromoCodeByCode(code);
      if (existing) {
        return res.status(400).json({ success: false, message: "A promo code with this code already exists" });
      }

      const promo = await storage.createPromoCode({
        code: code.toUpperCase().trim(),
        discountType,
        discountValue,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive ?? true,
        maxUses: maxUses || null,
      });

      return res.json({ success: true, promoCode: promo });
    } catch (error) {
      console.error("Error creating promo code:", error);
      return res.status(500).json({ success: false, message: "Failed to create promo code" });
    }
  });

  app.patch("/api/admin/promo-codes/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { discountType, discountValue, expiresAt, isActive, maxUses } = req.body;

      const existing = await storage.getPromoCodeById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Promo code not found" });
      }

      const updateData: Record<string, any> = {};

      if (discountType !== undefined) {
        if (!["percentage", "fixed"].includes(discountType)) {
          return res.status(400).json({ success: false, message: "Discount type must be 'percentage' or 'fixed'" });
        }
        updateData.discountType = discountType;
      }

      if (discountValue !== undefined) {
        if (typeof discountValue !== "number" || discountValue <= 0) {
          return res.status(400).json({ success: false, message: "Valid discount value is required" });
        }
        const checkType = updateData.discountType || existing.discountType;
        if (checkType === "percentage" && discountValue > 100) {
          return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 100%" });
        }
        updateData.discountValue = discountValue;
      }

      if (expiresAt !== undefined) {
        updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      if (maxUses !== undefined) {
        updateData.maxUses = maxUses || null;
      }

      const promo = await storage.updatePromoCode(id, updateData);
      return res.json({ success: true, promoCode: promo });
    } catch (error) {
      console.error("Error updating promo code:", error);
      return res.status(500).json({ success: false, message: "Failed to update promo code" });
    }
  });

  app.delete("/api/admin/promo-codes/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await storage.getPromoCodeById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Promo code not found" });
      }

      await storage.deletePromoCode(id);
      return res.json({ success: true, message: "Promo code deleted" });
    } catch (error) {
      console.error("Error deleting promo code:", error);
      return res.status(500).json({ success: false, message: "Failed to delete promo code" });
    }
  });

  // Public promo code validation endpoint (for checkout pages)
  // Validates against Stripe Promotion Codes API (source of truth)
  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const { code } = req.body;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ success: false, message: "Promo code is required" });
      }

      const stripe = await getUncachableStripeClient();

      // Query Stripe Promotion Codes API for the code (preserve casing - Stripe is case-sensitive)
      const promotionCodes = await stripe.promotionCodes.list({
        code: code.trim(),
        active: true,
        limit: 1,
      });

      if (promotionCodes.data.length === 0) {
        return res.status(404).json({ success: false, message: "Invalid promo code" });
      }

      const promoCode = promotionCodes.data[0];
      const coupon = promoCode.coupon;

      // Build discount info from Stripe coupon
      let discountType: "percentage" | "fixed" = "percentage";
      let discountValue = 0;

      if (coupon.percent_off) {
        discountType = "percentage";
        discountValue = coupon.percent_off;
      } else if (coupon.amount_off) {
        discountType = "fixed";
        // Convert from cents to currency units
        discountValue = coupon.amount_off / 100;
      }

      return res.json({
        success: true,
        promoCode: {
          id: promoCode.id, // Stripe promotion_code ID
          code: promoCode.code,
          discountType,
          discountValue,
        },
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      return res.status(500).json({ success: false, message: "Failed to validate promo code" });
    }
  });

  // Blog routes - Public endpoints
  app.get("/api/blogs", async (req, res) => {
    try {
      const { lang } = req.query;
      const blogPosts = await storage.getPublishedBlogs(lang as string);
      return res.json({ success: true, blogs: blogPosts });
    } catch (error) {
      console.error("Error fetching blogs:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch blogs" });
    }
  });

  app.get("/api/blogs/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const blog = await storage.getBlogBySlug(slug);

      if (!blog || !blog.published) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }

      return res.json({ success: true, blog });
    } catch (error) {
      console.error("Error fetching blog:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch blog" });
    }
  });

  // Blog routes - Admin endpoints
  app.get("/api/admin/blogs", isAdminAuthenticated, async (req, res) => {
    try {
      const blogPosts = await storage.getAllBlogs();
      return res.json({ success: true, blogs: blogPosts });
    } catch (error) {
      console.error("Error fetching blogs:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch blogs" });
    }
  });

  app.get("/api/admin/blogs/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const blog = await storage.getBlogById(id);

      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }

      return res.json({ success: true, blog });
    } catch (error) {
      console.error("Error fetching blog:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch blog" });
    }
  });

  app.post("/api/admin/blogs", isAdminAuthenticated, async (req, res) => {
    try {
      const { title, subtitle, slug, content, metaTitle, metaDescription, published } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }

      if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Slug is required" });
      }

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Content is required" });
      }

      // Check if slug already exists
      const existing = await storage.getBlogBySlug(slug.trim().toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, message: "A blog with this slug already exists" });
      }

      const blog = await storage.createBlog({
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        content: content.trim(),
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null,
        published: published ?? false,
      });

      return res.json({ success: true, blog });
    } catch (error) {
      console.error("Error creating blog:", error);
      return res.status(500).json({ success: false, message: "Failed to create blog" });
    }
  });

  app.patch("/api/admin/blogs/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, subtitle, slug, content, metaTitle, metaDescription, published } = req.body;

      const existing = await storage.getBlogById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }

      const updateData: Record<string, any> = {};

      if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
          return res.status(400).json({ success: false, message: "Title cannot be empty" });
        }
        updateData.title = title.trim();
      }

      if (subtitle !== undefined) {
        updateData.subtitle = subtitle?.trim() || null;
      }

      if (slug !== undefined) {
        if (typeof slug !== "string" || slug.trim().length === 0) {
          return res.status(400).json({ success: false, message: "Slug cannot be empty" });
        }
        const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');
        // Check if new slug already exists (but not for same blog)
        const slugExists = await storage.getBlogBySlug(normalizedSlug);
        if (slugExists && slugExists.id !== id) {
          return res.status(400).json({ success: false, message: "A blog with this slug already exists" });
        }
        updateData.slug = normalizedSlug;
      }

      if (content !== undefined) {
        if (typeof content !== "string" || content.trim().length === 0) {
          return res.status(400).json({ success: false, message: "Content cannot be empty" });
        }
        updateData.content = content.trim();
      }

      if (metaTitle !== undefined) {
        updateData.metaTitle = metaTitle?.trim() || null;
      }

      if (metaDescription !== undefined) {
        updateData.metaDescription = metaDescription?.trim() || null;
      }

      if (published !== undefined) {
        updateData.published = Boolean(published);
      }

      const blog = await storage.updateBlog(id, updateData);
      return res.json({ success: true, blog });
    } catch (error) {
      console.error("Error updating blog:", error);
      return res.status(500).json({ success: false, message: "Failed to update blog" });
    }
  });

  app.delete("/api/admin/blogs/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await storage.getBlogById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }

      await storage.deleteBlog(id);
      return res.json({ success: true, message: "Blog deleted" });
    } catch (error) {
      console.error("Error deleting blog:", error);
      return res.status(500).json({ success: false, message: "Failed to delete blog" });
    }
  });

  // Review QR routes (authenticated user)
  app.get("/api/review-qrs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const qrs = await storage.getReviewQrsByUserId(userId);
      return res.json({ success: true, qrs });
    } catch (error) {
      console.error("Error fetching review QRs:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch QR codes" });
    }
  });

  app.get("/api/review-qrs/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getUserQrAnalytics(userId);
      return res.json({ success: true, analytics });
    } catch (error) {
      console.error("Error fetching user QR analytics:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/review-qrs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const qr = await storage.getReviewQr(id);
      if (!qr) {
        return res.status(404).json({ success: false, message: "QR code not found" });
      }

      // Verify ownership
      const userRestaurants = await storage.getRestaurantsByUserId(userId);
      if (!userRestaurants.some(r => r.id === qr.restaurantId)) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      // Get scan history grouped by day
      const scansByDay = await storage.getReviewQrScansByDay(id);

      return res.json({ success: true, qr, scansByDay });
    } catch (error) {
      console.error("Error fetching review QR:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch QR code" });
    }
  });

  app.post("/api/review-qrs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { restaurantId, name, googleReviewUrl } = req.body;

      if (!restaurantId || !googleReviewUrl) {
        return res.status(400).json({ success: false, message: "Restaurant ID and Google Review URL are required" });
      }

      // Validate URL is a legitimate Google domain
      if (!isValidGoogleReviewUrl(googleReviewUrl)) {
        return res.status(400).json({ success: false, message: "Invalid URL. Only Google review URLs are allowed" });
      }

      // Verify ownership
      const userRestaurants = await storage.getRestaurantsByUserId(userId);
      if (!userRestaurants.some(r => r.id === restaurantId)) {
        return res.status(403).json({ success: false, message: "Not authorized to create QR for this restaurant" });
      }

      const qr = await storage.createReviewQr({
        restaurantId,
        name: name?.trim() || null,
        googleReviewUrl: googleReviewUrl.trim(),
        isActive: true,
      });

      return res.json({ success: true, qr });
    } catch (error) {
      console.error("Error creating review QR:", error);
      return res.status(500).json({ success: false, message: "Failed to create QR code" });
    }
  });

  app.patch("/api/review-qrs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { name, googleReviewUrl, isActive } = req.body;

      const qr = await storage.getReviewQr(id);
      if (!qr) {
        return res.status(404).json({ success: false, message: "QR code not found" });
      }

      // Verify ownership
      const userRestaurants = await storage.getRestaurantsByUserId(userId);
      if (!userRestaurants.some(r => r.id === qr.restaurantId)) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name?.trim() || null;
      if (googleReviewUrl !== undefined) {
        if (!isValidGoogleReviewUrl(googleReviewUrl)) {
          return res.status(400).json({ success: false, message: "Invalid URL. Only Google review URLs are allowed" });
        }
        updateData.googleReviewUrl = googleReviewUrl.trim();
      }
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const updated = await storage.updateReviewQr(id, updateData);
      return res.json({ success: true, qr: updated });
    } catch (error) {
      console.error("Error updating review QR:", error);
      return res.status(500).json({ success: false, message: "Failed to update QR code" });
    }
  });

  app.delete("/api/review-qrs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const qr = await storage.getReviewQr(id);
      if (!qr) {
        return res.status(404).json({ success: false, message: "QR code not found" });
      }

      // Verify ownership
      const userRestaurants = await storage.getRestaurantsByUserId(userId);
      if (!userRestaurants.some(r => r.id === qr.restaurantId)) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      await storage.deleteReviewQr(id);
      return res.json({ success: true, message: "QR code deleted" });
    } catch (error) {
      console.error("Error deleting review QR:", error);
      return res.status(500).json({ success: false, message: "Failed to delete QR code" });
    }
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;

      // Validate input
      const updateData: Record<string, any> = {};
      if (firstName !== undefined) {
        if (typeof firstName !== "string" || firstName.length > 100) {
          return res.status(400).json({ message: "First name must be a string under 100 characters" });
        }
        updateData.firstName = firstName.trim();
      }
      if (lastName !== undefined) {
        if (typeof lastName !== "string" || lastName.length > 100) {
          return res.status(400).json({ message: "Last name must be a string under 100 characters" });
        }
        updateData.lastName = lastName.trim();
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const user = await storage.updateUserStripeInfo(userId, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Delete user account
  app.delete("/api/auth/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cancel Stripe subscription if exists
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          console.log(`Cancelled subscription ${user.stripeSubscriptionId} for user ${userId}`);
        } catch (stripeError: any) {
          // Log but don't fail if subscription already cancelled
          console.log(`Could not cancel subscription: ${stripeError.message}`);
        }
      }

      // Delete user and all associated data
      await storage.deleteUser(userId);

      // Clear the session
      req.logout((err: any) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
        }
      });

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Restaurant routes
  app.get("/api/restaurants", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurants = await storage.getRestaurantsByUserId(userId);
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.post("/api/restaurants", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check location limits
      const currentCount = await storage.getRestaurantCount(userId);
      const locationCheck = canAddLocation(user, currentCount);

      if (!locationCheck.allowed) {
        return res.status(403).json({
          error: PLAN_ERROR_CODES.LOCATION_LIMIT_REACHED,
          message: locationCheck.reason,
          limit: locationCheck.limit,
          current: locationCheck.current,
        });
      }

      const data = insertRestaurantSchema.parse({ ...req.body, userId });
      const restaurant = await storage.createRestaurant(data);

      // Auto-grant owner access to the restaurant creator
      await storage.grantRestaurantAccess({
        userId: userId,
        restaurantId: restaurant.id,
        role: "owner",
        grantedBy: userId,
      });

      res.json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  app.patch("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updated = await storage.updateRestaurant(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      res.status(500).json({ message: "Failed to update restaurant" });
    }
  });

  app.delete("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      await storage.deleteRestaurant(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      res.status(500).json({ message: "Failed to delete restaurant" });
    }
  });

  // Get restaurant members with their roles
  app.get("/api/restaurants/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify restaurant exists
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Check if user has access to this restaurant
      const userRole = await storage.getUserRestaurantRole(userId, id);
      const isOwner = restaurant.userId === userId;

      if (!userRole && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all members with access to this restaurant
      const accessList = await storage.getRestaurantAccessByRestaurantId(id);

      const members = accessList.map(access => ({
        id: access.id,
        userId: access.userId,
        role: access.role,
        grantedAt: access.grantedAt,
        user: {
          id: access.user.id,
          email: access.user.email,
          firstName: access.user.firstName,
          lastName: access.user.lastName,
          profileImageUrl: access.user.profileImageUrl,
        },
        isOwner: access.role === "owner",
      }));

      res.json(members);
    } catch (error) {
      console.error("Error fetching restaurant members:", error);
      res.status(500).json({ message: "Failed to fetch restaurant members" });
    }
  });

  // Google Business API routes
  app.get("/api/restaurants/:id/google/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (!restaurant.isConnected) {
        return res.status(400).json({ message: "Restaurant not connected to Google" });
      }

      if (!restaurant.googleAccessToken) {
        return res.status(400).json({ message: "No access token available. Please reconnect your Google account." });
      }

      // Use direct Google API
      const accounts = await fetchGoogleAccounts(restaurant);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching Google accounts:", error);
      res.status(500).json({ message: "Failed to fetch Google accounts" });
    }
  });

  app.get("/api/restaurants/:id/google/locations/:accountId", isAuthenticated, async (req: any, res) => {
    try {
      const { id, accountId } = req.params;
      const userId = req.user.claims.sub;

      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (!restaurant.isConnected) {
        return res.status(400).json({ message: "Restaurant not connected to Google" });
      }

      if (!restaurant.googleAccessToken) {
        return res.status(400).json({ message: "No access token available. Please reconnect your Google account." });
      }

      // Use direct Google API
      const locations = await fetchGoogleLocations(restaurant, accountId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching Google locations:", error);
      res.status(500).json({ message: "Failed to fetch Google locations" });
    }
  });

  app.post("/api/restaurants/:id/google/select-location", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { accountId, locationId } = req.body;
      const userId = req.user.claims.sub;

      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (!accountId || !locationId) {
        return res.status(400).json({ message: "Account ID and Location ID are required" });
      }

      const updated = await storage.updateRestaurant(id, {
        googleAccountId: accountId,
        googleLocationId: locationId,
      });

      console.log(`[Google Business] Location selected for restaurant ${id}: ${accountId}/${locationId}`);
      res.json(updated);
    } catch (error) {
      console.error("Error selecting Google location:", error);
      res.status(500).json({ message: "Failed to select Google location" });
    }
  });

  app.post("/api/restaurants/:id/sync-reviews", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (!restaurant.isConnected) {
        return res.status(400).json({ message: "Restaurant not connected to Google" });
      }

      if (!restaurant.googleAccountId || !restaurant.googleLocationId) {
        return res.status(400).json({
          message: "Please select a Google Business location first",
          needsLocationSelection: true
        });
      }

      // Use direct Google API
      console.log(`[Sync] Using direct Google API for restaurant ${id}`);
      const result = await syncReviewsForRestaurant(restaurant);

      res.json({
        success: true,
        synced: result.synced,
        errors: result.errors,
        message: `Synced ${result.synced} reviews`,
        source: "google",
      });
    } catch (error) {
      console.error("Error syncing reviews:", error);
      res.status(500).json({ message: "Failed to sync reviews" });
    }
  });

  // Toggle auto-sync reviews for a restaurant
  app.patch("/api/restaurants/:id/auto-sync", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      const userId = req.user.claims.sub;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }

      const restaurant = await storage.getRestaurant(id);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updated = await storage.updateRestaurant(id, {
        autoSyncReviews: enabled,
      });

      console.log(`[Auto-Sync] Restaurant ${id} auto-sync set to ${enabled}`);
      res.json(updated);
    } catch (error) {
      console.error("Error updating auto-sync setting:", error);
      res.status(500).json({ message: "Failed to update auto-sync setting" });
    }
  });

  // Manual resync reviews from the reviews page
  app.post("/api/reviews/resync", isAuthenticated, async (req: any, res) => {
    try {
      const { restaurantId } = req.body;
      const userId = req.user.claims.sub;

      if (!restaurantId) {
        return res.status(400).json({ message: "restaurantId is required" });
      }

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (!restaurant.isConnected) {
        return res.status(400).json({ message: "Restaurant not connected to Google" });
      }

      if (!restaurant.googleAccountId || !restaurant.googleLocationId) {
        return res.status(400).json({
          message: "Please select a Google Business location first",
          needsLocationSelection: true
        });
      }

      console.log(`[Resync] Manual resync for restaurant ${restaurantId}`);
      const result = await syncReviewsForRestaurant(restaurant);

      res.json({
        success: true,
        synced: result.synced,
        errors: result.errors,
        message: `Synced ${result.synced} reviews`,
      });
    } catch (error) {
      console.error("Error resyncing reviews:", error);
      res.status(500).json({ message: "Failed to resync reviews" });
    }
  });

  // Resync all connected restaurants for the current user
  app.post("/api/reviews/resync-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRestaurants = await storage.getRestaurantsByUserId(userId);
      const connected = userRestaurants.filter(
        (r) => r.isConnected && r.googleAccountId && r.googleLocationId,
      );

      if (connected.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No connected locations found",
        });
      }

      let totalSynced = 0;
      let totalErrors = 0;
      let okLocations = 0;

      for (const restaurant of connected) {
        try {
          const result = await syncReviewsForRestaurant(restaurant);
          totalSynced += result.synced || 0;
          totalErrors += result.errors || 0;
          okLocations += 1;
        } catch (err) {
          console.error(
            `[ResyncAll] Error syncing restaurant ${restaurant.id}:`,
            err,
          );
          totalErrors += 1;
        }
      }

      return res.json({
        success: true,
        synced: totalSynced,
        errors: totalErrors,
        locations: okLocations,
        totalLocations: connected.length,
      });
    } catch (error) {
      console.error("Error resyncing all reviews:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to resync reviews" });
    }
  });

  app.post("/api/sync-all-reviews", isAuthenticated, async (req: any, res) => {
    try {
      // Use direct Google API
      console.log("[Sync] Using direct Google API for all restaurants");
      await syncAllConnectedRestaurants();
      res.json({
        success: true,
        message: "Review sync started for all connected restaurants",
        source: "google",
      });
    } catch (error) {
      console.error("Error syncing all reviews:", error);
      res.status(500).json({ message: "Failed to sync reviews" });
    }
  });

  // Partner API status - now disabled, using direct Google API
  app.get("/api/partner/status", async (req, res) => {
    res.json({
      configured: false,
      message: "Using direct Google API instead of Partner API",
    });
  });

  // Review routes
  app.get("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reviews = await storage.getReviewsByUserId(userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Review Summary - Get cached AI-powered analysis (does NOT generate new)
  app.get("/api/reviews/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { restaurantId, language } = req.query;
      const lang = typeof language === 'string' ? language : 'es';
      const restId = typeof restaurantId === 'string' ? restaurantId : null;

      // Try to get cached summary
      const cachedSummary = await storage.getReviewSummary(userId, restId, lang);

      if (cachedSummary) {
        res.json({
          summary: cachedSummary.summary,
          overallSentiment: cachedSummary.overallSentiment,
          sentimentScore: cachedSummary.sentimentScore,
          keyThemes: cachedSummary.keyThemes,
          trends: cachedSummary.trends,
          recommendations: cachedSummary.recommendations,
          reviewCount: cachedSummary.reviewCount,
          analyzedCount: cachedSummary.analyzedCount,
          generatedAt: cachedSummary.generatedAt,
          language: cachedSummary.language,
        });
      } else {
        // No cached summary - return empty state
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching review summary:", error);
      res.status(500).json({ message: "Failed to fetch review summary" });
    }
  });

  // Generate new Review Summary - AI-powered analysis (user must explicitly request)
  app.post("/api/reviews/summary/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { restaurantId, language, startDate, endDate } = req.body;
      const lang = typeof language === 'string' ? language : 'es';
      const restId = typeof restaurantId === 'string' ? restaurantId : null;

      // Get reviews for the user (or specific restaurant)
      let reviews = await storage.getReviewsByUserId(userId);

      // Filter by restaurant if specified
      if (restId) {
        reviews = reviews.filter(r => r.restaurantId === restId);
      }

      // Filter by date range if specified (using reviewedAt field - the date when the review was written)
      if (startDate || endDate) {
        let start: Date | null = null;
        let end: Date | null = null;

        if (startDate) {
          start = new Date(startDate);
          // Set start date to beginning of day (00:00:00)
          start.setHours(0, 0, 0, 0);
        }

        if (endDate) {
          end = new Date(endDate);
          // Set end date to end of day (23:59:59.999)
          end.setHours(23, 59, 59, 999);
        }

        reviews = reviews.filter(r => {
          // Use reviewedAt (the actual review date from Google)
          const reviewDate = r.reviewedAt ? new Date(r.reviewedAt) : null;
          if (!reviewDate) return false;

          if (start && reviewDate < start) return false;
          if (end && reviewDate > end) return false;
          return true;
        });
      }

      if (reviews.length === 0) {
        return res.status(400).json({ message: "No reviews to analyze" });
      }

      // Get restaurant name for context
      const restaurantName = reviews[0]?.restaurant?.name || "Your Restaurant";

      // Limit to 50 reviews for analysis (to manage API costs)
      // When date range is specified, take first 50 within that range
      // When no date range, take latest 50 reviews
      const recentReviews = reviews.slice(0, 50).map(r => ({
        rating: r.rating,
        comment: r.comment || "",
        reviewedAt: r.reviewedAt || r.createdAt || new Date(),
        sentiment: r.sentiment || undefined,
      }));

      // Generate summary via AI
      const aiSummary = await analyzeReviewSummary(recentReviews, restaurantName, lang);

      // Save to database
      const savedSummary = await storage.saveReviewSummary({
        userId,
        restaurantId: restId,
        language: lang,
        summary: aiSummary.summary,
        overallSentiment: aiSummary.overallSentiment,
        sentimentScore: aiSummary.sentimentScore,
        keyThemes: aiSummary.keyThemes,
        trends: aiSummary.trends,
        recommendations: aiSummary.recommendations,
        reviewCount: reviews.length,
        analyzedCount: recentReviews.length,
      });

      res.json({
        summary: savedSummary.summary,
        overallSentiment: savedSummary.overallSentiment,
        sentimentScore: savedSummary.sentimentScore,
        keyThemes: savedSummary.keyThemes,
        trends: savedSummary.trends,
        recommendations: savedSummary.recommendations,
        reviewCount: savedSummary.reviewCount,
        analyzedCount: savedSummary.analyzedCount,
        generatedAt: savedSummary.generatedAt,
        language: savedSummary.language,
      });
    } catch (error) {
      console.error("Error generating review summary:", error);
      res.status(500).json({ message: "Failed to generate review summary" });
    }
  });

  app.post("/api/reviews/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reply } = req.body;
      const userId = req.user.claims.sub;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check reply limits and handle monthly reset
      const { used, needsReset } = getMonthlyReplyUsage(user);

      if (needsReset) {
        await storage.updateUserReplyUsage(userId, 0, new Date());
      }

      const replyCheck = canSendReply(user);

      if (!replyCheck.allowed && !needsReset) {
        return res.status(403).json({
          error: PLAN_ERROR_CODES.REPLY_LIMIT_REACHED,
          message: replyCheck.reason,
          limit: replyCheck.limit,
          current: replyCheck.current,
        });
      }

      const review = await storage.getReview(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const restaurant = await storage.getRestaurant(review.restaurantId);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Post the reply via Google API
      let postSuccess = false;
      let postError: string | undefined;

      if (restaurant.googleAccessToken && review.googleReviewId) {
        console.log(`[Reply] Posting reply via Google API for review ${id}`);
        postSuccess = await postReplyToGoogle(restaurant, id, reply);
        if (!postSuccess) {
          postError = "Failed to post reply via Google API";
        }
      } else {
        // No external API available - just mark as posted locally
        console.log(`[Reply] No external API available, marking review ${id} as posted locally`);
        postSuccess = true;
      }

      if (!postSuccess) {
        console.error(`[Reply] ${postError}`);
        return res.status(500).json({ message: postError || "Failed to post reply" });
      }

      // Update review with posted reply
      const updated = await storage.updateReview(id, {
        postedReply: reply,
        replyStatus: "posted",
        repliedAt: new Date(),
      });

      // Increment monthly reply usage
      const currentUsed = needsReset ? 0 : (user.monthlyRepliesUsed || 0);
      await storage.updateUserReplyUsage(userId, currentUsed + 1);

      if (!restaurant.googleAccessToken || !review.googleReviewId) {
        sendReplyNotification({
          restaurantId: restaurant.id,
          reviewerName: review.reviewerName || "Cliente",
          rating: review.rating,
          reviewComment: review.comment || "",
          postedReply: reply,
        }).catch((err) => console.error("[Reply] Notification error:", err));
      }

      res.json({
        ...updated,
        postSource: restaurant.googleAccessToken ? "google" : "local",
      });
    } catch (error) {
      console.error("Error approving review:", error);
      res.status(500).json({ message: "Failed to approve review" });
    }
  });

  app.post("/api/reviews/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const review = await storage.getReview(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const updated = await storage.updateReview(id, {
        replyStatus: "dismissed",
      });

      res.json(updated);
    } catch (error) {
      console.error("Error dismissing review:", error);
      res.status(500).json({ message: "Failed to dismiss review" });
    }
  });

  app.post("/api/reviews/:id/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check reply limits and handle monthly reset
      const { used, needsReset } = getMonthlyReplyUsage(user);

      if (needsReset) {
        // Reset the counter for the new month
        await storage.updateUserReplyUsage(userId, 0, new Date());
      }

      const replyCheck = canSendReply(user);

      if (!replyCheck.allowed && !needsReset) {
        return res.status(403).json({
          error: PLAN_ERROR_CODES.REPLY_LIMIT_REACHED,
          message: replyCheck.reason,
          limit: replyCheck.limit,
          current: replyCheck.current,
        });
      }

      const review = await storage.getReview(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const restaurant = await storage.getRestaurant(review.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Look up tone preset for custom instructions
      let customInstructions: string | undefined;
      let toneStyle = restaurant.toneOfVoice || "friendly";

      if (restaurant.tonePresetId) {
        const tonePreset = await storage.getTonePreset(restaurant.tonePresetId);
        if (tonePreset) {
          customInstructions = tonePreset.instructions || undefined;
          toneStyle = tonePreset.style || toneStyle;
        }
      }

      // Generate new AI reply
      const result = await generateReviewReply({
        reviewerName: review.reviewerName || "Customer",
        rating: review.rating,
        comment: review.comment || "",
        restaurantName: restaurant.name,
        toneOfVoice: toneStyle,
        customInstructions,
      });

      const updated = await storage.updateReview(id, {
        generatedReply: result.reply,
        language: result.language,
        sentiment: result.sentiment,
      });

      // Increment monthly reply usage
      const currentUsed = needsReset ? 0 : (user.monthlyRepliesUsed || 0);
      await storage.updateUserReplyUsage(userId, currentUsed + 1);

      res.json(updated);
    } catch (error) {
      console.error("Error regenerating reply:", error);
      res.status(500).json({ message: "Failed to regenerate reply" });
    }
  });

  // Generate AI replies for all pending reviews without replies
  app.post("/api/reviews/generate-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all user's restaurants
      const restaurants = await storage.getRestaurantsByUserId(userId);
      if (restaurants.length === 0) {
        return res.json({ generated: 0, skipped: 0, message: "No restaurants found" });
      }

      // Get all reviews that need AI replies (pending status, no generated reply)
      const allReviews = await storage.getReviewsByUserId(userId);
      const reviewsNeedingReplies = allReviews.filter(
        (r) => r.replyStatus === "pending" && !r.generatedReply
      );

      if (reviewsNeedingReplies.length === 0) {
        return res.json({ generated: 0, skipped: 0, message: "All reviews already have replies" });
      }

      // Check and possibly reset monthly usage
      const { used, needsReset } = getMonthlyReplyUsage(user);
      if (needsReset) {
        await storage.updateUserReplyUsage(userId, 0, new Date());
      }

      let generated = 0;
      let skipped = 0;
      let currentUsage = needsReset ? 0 : (user.monthlyRepliesUsed || 0);

      // Process reviews sequentially to respect rate limits
      for (const review of reviewsNeedingReplies) {
        // Check if we still have replies available
        const replyCheck = canSendReply({ ...user, monthlyRepliesUsed: currentUsage });
        if (!replyCheck.allowed) {
          skipped += reviewsNeedingReplies.length - generated - skipped;
          break;
        }

        try {
          const restaurant = restaurants.find((r) => r.id === review.restaurantId);
          if (!restaurant) {
            skipped++;
            continue;
          }

          // Look up tone preset for custom instructions
          let customInstructions: string | undefined;
          let toneStyle = restaurant.toneOfVoice || "friendly";

          if (restaurant.tonePresetId) {
            const tonePreset = await storage.getTonePreset(restaurant.tonePresetId);
            if (tonePreset) {
              customInstructions = tonePreset.instructions || undefined;
              toneStyle = tonePreset.style || toneStyle;
            }
          }

          const result = await generateReviewReply({
            reviewerName: review.reviewerName || "Customer",
            rating: review.rating,
            comment: review.comment || "",
            restaurantName: restaurant.name,
            toneOfVoice: toneStyle,
            customInstructions,
          });

          await storage.updateReview(review.id, {
            generatedReply: result.reply,
            language: result.language,
            sentiment: result.sentiment,
          });

          currentUsage++;
          generated++;
        } catch (error) {
          console.error(`Error generating reply for review ${review.id}:`, error);
          skipped++;
        }
      }

      // Update final usage count
      await storage.updateUserReplyUsage(userId, currentUsage);

      res.json({
        generated,
        skipped,
        remaining: reviewsNeedingReplies.length - generated - skipped,
        message: `Generated ${generated} replies${skipped > 0 ? `, ${skipped} skipped (limit reached or errors)` : ""}`,
      });
    } catch (error) {
      console.error("Error generating all replies:", error);
      res.status(500).json({ message: "Failed to generate replies" });
    }
  });

  // Subscription routes
  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.json({
          status: user?.subscriptionStatus || "trial",
          plan: user?.subscriptionPlan || null,
          billingCycle: user?.billingCycle || null,
          currentPeriodEnd: null,
          extraLocations: user?.extraLocations || 0,
        });
      }

      const subscription = await storage.getSubscription(user.stripeSubscriptionId);
      const planInfo = getUserPlanInfo(user);

      res.json({
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        billingCycle: user.billingCycle || "monthly",
        currentPeriodEnd: subscription?.current_period_end || null,
        extraLocations: user.extraLocations || 0,
        limits: planInfo.limits,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Stripe prices
  app.get("/api/prices", isAuthenticated, async (req, res) => {
    try {
      const prices = await storage.listPrices();
      res.json(prices);
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  // Plans endpoint - returns all plan information
  app.get("/api/plans", async (req, res) => {
    try {
      res.json({
        plans: Object.values(PLANS),
        yearlyDiscount: 20,
      });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // Stripe checkout - supports both legacy priceId and new planId/billingCycle
  // CRITICAL: Prevents duplicate subscriptions by checking for existing active subscriptions
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId, planId, billingCycle = "monthly", promoCode } = req.body;

      console.log(`[Checkout] Request from user ${userId}: plan=${planId}, cycle=${billingCycle}, priceId=${priceId}`);

      // Handle Enterprise plan - redirect to contact
      if (planId === "enterprise") {
        return res.json({ enterprise: true, redirectTo: "/contact" });
      }

      // Validate planId if provided
      const validPlanIds: PlanId[] = ["local", "pro", "business"];
      if (planId && !validPlanIds.includes(planId)) {
        console.error(`[Checkout] Invalid planId: ${planId}`);
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const validCycles: BillingCycle[] = ["monthly", "yearly"];
      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({ message: "Invalid billing cycle" });
      }

      // Determine the Stripe price ID and plan info
      let finalPriceId = priceId;
      let finalPlanId = planId;
      let finalBillingCycle = billingCycle;

      if (planId && !priceId) {
        // New flow: use planId and billingCycle to get price ID
        finalPriceId = getStripePriceId(planId as PlanId, billingCycle as BillingCycle);
      } else if (priceId && !planId) {
        // Legacy flow: derive planId and billingCycle from priceId
        const derivedPlan = getPlanFromPriceId(priceId);
        if (derivedPlan) {
          finalPlanId = derivedPlan.planId;
          finalBillingCycle = derivedPlan.billingCycle;
          console.log(`[Checkout] Derived plan from priceId: ${finalPlanId} (${finalBillingCycle})`);
        } else {
          // CRITICAL: Reject unrecognized price IDs to prevent invalid plan data
          console.error(`[Checkout] Unrecognized priceId: ${priceId} - cannot derive plan info`);
          return res.status(400).json({
            message: "Unrecognized price ID",
            code: "INVALID_PRICE_ID"
          });
        }
      } else if (planId && priceId) {
        // Both provided - validate they match
        const derivedPlan = getPlanFromPriceId(priceId);
        if (!derivedPlan) {
          console.error(`[Checkout] Unrecognized priceId: ${priceId}`);
          return res.status(400).json({
            message: "Unrecognized price ID",
            code: "INVALID_PRICE_ID"
          });
        }
        // Ensure planId matches the priceId
        if (derivedPlan.planId !== planId) {
          console.error(`[Checkout] planId/priceId mismatch: ${planId} vs ${derivedPlan.planId}`);
          return res.status(400).json({
            message: "Plan ID and Price ID mismatch",
            code: "PLAN_PRICE_MISMATCH"
          });
        }
        // Use derived billingCycle from priceId (authoritative)
        finalBillingCycle = derivedPlan.billingCycle;
      }

      if (!finalPriceId) {
        return res.status(400).json({ message: "Price ID or Plan ID is required" });
      }

      // Ensure we have a valid planId at this point
      if (!finalPlanId) {
        console.error(`[Checkout] No valid planId determined`);
        return res.status(400).json({ message: "Plan ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();

      // Get or create customer (handles test→live mode migration)
      const customerId = await getOrCreateStripeCustomer(
        stripe,
        userId,
        user.stripeCustomerId,
        user.email
      );

      // CRITICAL: Check if customer already has an active subscription
      const activeSubscription = await getActiveSubscription(stripe, customerId);

      if (activeSubscription) {
        // Customer already has active subscription - perform upgrade/downgrade instead
        console.log(`[Checkout] User ${userId} has active subscription ${activeSubscription.id}, upgrading instead of creating new`);

        // Check if trying to switch to the same price (no change needed)
        if (activeSubscription.currentPriceId === finalPriceId) {
          console.log(`[Checkout] User ${userId} already on this plan, no change needed`);
          return res.status(400).json({
            message: "Ya tienes este plan activo",
            code: "SAME_PLAN"
          });
        }

        // Perform the upgrade/downgrade (finalPlanId is guaranteed to be valid at this point)
        const upgradeResult = await upgradeSubscription(
          stripe,
          activeSubscription.id,
          finalPriceId,
          finalPlanId,
          finalBillingCycle
        );

        if (!upgradeResult.success) {
          console.error(`[Checkout] Upgrade failed for user ${userId}:`, upgradeResult.error);
          return res.status(500).json({
            message: "Error al cambiar de plan",
            details: upgradeResult.error
          });
        }

        // Update user's subscription info in database
        await storage.updateUserStripeInfo(userId, {
          stripeSubscriptionId: activeSubscription.id,
          subscriptionStatus: 'active',
          subscriptionPlan: finalPlanId,
          billingCycle: finalBillingCycle,
        });

        console.log(`[Checkout] User ${userId} upgraded to ${finalPlanId} successfully`);

        // Return success with upgraded flag instead of URL
        const planName = PLANS[finalPlanId as PlanId]?.name || finalPlanId;
        return res.json({
          upgraded: true,
          plan: finalPlanId,
          message: `Plan actualizado a ${planName}`
        });
      }

      // No active subscription - create new checkout session
      console.log(`[Checkout] No active subscription for user ${userId}, creating new checkout session`);

      // Check if user is eligible for trial (Local plan only, never had a subscription before)
      // Step 1: Check local database for subscription history
      let hasHistory = await storage.hasSubscriptionHistory(userId);

      // Step 2: Double-check with Stripe directly (Stripe is source of truth)
      // This catches cases where local DB was reset but user had prior subscriptions
      if (!hasHistory) {
        try {
          const allSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 10,
          });
          // If any subscription exists (past or present), user has history
          hasHistory = allSubscriptions.data.length > 0;
          console.log(`[Checkout] Stripe history check for ${customerId}: found ${allSubscriptions.data.length} subscriptions, hasHistory=${hasHistory}`);
        } catch (err: any) {
          console.log(`[Checkout] Could not check Stripe history: ${err?.message}`);
          // Continue with local check result
        }
      }

      const plan = PLANS[finalPlanId as PlanId];
      const isTrialEligible = !hasHistory && plan?.trialAllowed && finalPlanId === 'local';

      console.log(`[Checkout] Trial eligibility for user ${userId}: hasHistory=${hasHistory}, trialAllowed=${plan?.trialAllowed}, plan=${finalPlanId}, eligible=${isTrialEligible}`);

      // Validate promo code via Stripe if provided (preserve casing - Stripe is case-sensitive)
      let stripePromoCodeId: string | null = null;
      if (promoCode && typeof promoCode === "string") {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode.trim(),
          active: true,
          limit: 1,
        });
        if (promotionCodes.data.length === 0) {
          return res.status(400).json({ message: "Invalid promo code" });
        }
        stripePromoCodeId = promotionCodes.data[0].id;
      }

      console.log(`[Checkout] Creating session for user ${userId}, plan: ${finalPlanId}, cycle: ${finalBillingCycle}, priceId: ${finalPriceId}, promoCode: ${promoCode || 'none'}, trial: ${isTrialEligible ? `${TRIAL_CONFIG.trialDays} days` : 'none'}`);

      // Build checkout session options
      const sessionOptions: any = {
        customer: customerId,
        payment_method_types: ["card"],
        payment_method_collection: "always", // Always require card, especially for trials
        line_items: [{ price: finalPriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${getPublicBaseUrl(req)}/${user.onboardingCompleted ? 'billing?success=true' : 'onboarding'}`,
        cancel_url: `${getPublicBaseUrl(req)}/${user.onboardingCompleted ? 'billing?canceled=true' : 'select-plan'}`,
        metadata: {
          userId,
          planId: finalPlanId || null,
          billingCycle: finalBillingCycle || "monthly",
          appliedPromoCode: promoCode || "",
          trialEligible: isTrialEligible ? "true" : "false",
        },
        subscription_data: {
          metadata: {
            userId,
            planId: finalPlanId || null,
            billingCycle: finalBillingCycle || "monthly",
            appliedPromoCode: promoCode || "",
          },
        },
      };

      // Add 7-day trial for eligible Local plan users (Stripe manages the trial)
      if (isTrialEligible) {
        sessionOptions.subscription_data.trial_period_days = TRIAL_CONFIG.trialDays;
        console.log(`[Checkout] Adding ${TRIAL_CONFIG.trialDays}-day trial for user ${userId}`);
      }

      // If promo code provided and validated, apply via discounts array
      // Otherwise, allow users to enter promo codes at checkout
      if (stripePromoCodeId) {
        sessionOptions.discounts = [{ promotion_code: stripePromoCodeId }];
      } else {
        sessionOptions.allow_promotion_codes = true;
      }

      // Create checkout session with metadata
      const session = await stripe.checkout.sessions.create(sessionOptions);

      console.log(`[Checkout] Session created successfully: ${session.id}`);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:");
      console.error("Error type:", error?.type);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Full error:", JSON.stringify(error, null, 2));

      res.status(500).json({ message: "Failed to create checkout session", details: error?.message || "Unknown error" });
    }
  });

  // Stripe customer portal
  app.post("/api/billing/portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${getPublicBaseUrl(req)}/billing`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  // Stripe publishable key (for frontend)
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error fetching publishable key:", error);
      res.status(500).json({ message: "Failed to fetch publishable key" });
    }
  });

  // Sync subscription status from Stripe (for recovery from missed webhooks)
  app.post("/api/billing/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }

      const stripe = await getUncachableStripeClient();

      // List all subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        limit: 10,
        expand: ['data.items.data.price.product']
      });

      // Find an active or trialing subscription
      const activeSubscription = subscriptions.data.find(
        sub => sub.status === 'active' || sub.status === 'trialing'
      );

      if (!activeSubscription) {
        // No active subscription - update user to pending/canceled
        if (user.subscriptionStatus !== 'pending') {
          await storage.updateUserStripeInfo(userId, {
            subscriptionStatus: 'pending',
            stripeSubscriptionId: null,
          });
        }
        return res.json({
          success: true,
          message: "No active subscription found",
          status: 'pending'
        });
      }

      // Get plan info from subscription metadata or price lookup
      const planId = activeSubscription.metadata?.planId || null;
      const billingCycle = activeSubscription.metadata?.billingCycle || 'monthly';

      // Determine status from Stripe (preserve trialing state)
      let status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'pending' = 'active';
      if (activeSubscription.status === 'trialing') {
        status = 'trialing';
      }

      // Calculate trial end if applicable
      let trialEndsAt: Date | null = null;
      if (activeSubscription.trial_end) {
        trialEndsAt = new Date(activeSubscription.trial_end * 1000);
      }

      // Update user with subscription info
      await storage.updateUserStripeInfo(userId, {
        stripeSubscriptionId: activeSubscription.id,
        subscriptionStatus: status,
        subscriptionPlan: planId,
        billingCycle: billingCycle as 'monthly' | 'yearly',
        trialEndsAt: trialEndsAt,
      });

      console.log(`[Billing Sync] User ${userId} synced: plan=${planId}, status=${status}`);

      res.json({
        success: true,
        message: "Subscription synced successfully",
        status,
        plan: planId,
        billingCycle
      });
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ message: "Failed to sync subscription" });
    }
  });

  // Cancel subscription endpoint
  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing" && user.subscriptionStatus !== "trial") {
        return res.status(400).json({ message: "Subscription is not active" });
      }

      const stripe = await getUncachableStripeClient();

      // If user is in trial period, cancel immediately (no charge)
      if (user.subscriptionStatus === "trialing" || user.subscriptionStatus === "trial") {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);

        await storage.updateUserStripeInfo(userId, {
          subscriptionStatus: "canceled",
        });

        console.log(`[Subscription] User ${userId} canceled trial subscription ${user.stripeSubscriptionId} immediately (no charge)`);
        res.json({ success: true, message: "Trial canceled - no charges applied" });
        return;
      }

      // Active paid subscription: cancel at end of billing period (don't immediately revoke access)
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await storage.updateUserStripeInfo(userId, {
        subscriptionStatus: "canceled",
      });

      console.log(`[Subscription] User ${userId} canceled subscription ${user.stripeSubscriptionId}`);
      res.json({ success: true, message: "Subscription canceled successfully" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Resume subscription endpoint (reactivate canceled subscription)
  app.post("/api/subscription/resume", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription found" });
      }

      const stripe = await getUncachableStripeClient();

      // Check if subscription is set to cancel at period end
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      if (!subscription.cancel_at_period_end) {
        return res.status(400).json({ message: "Subscription is not scheduled for cancellation" });
      }

      // Resume subscription by removing cancel_at_period_end
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update user subscription status back to active
      await storage.updateUserStripeInfo(userId, {
        subscriptionStatus: "active",
      });

      console.log(`[Subscription] User ${userId} resumed subscription ${user.stripeSubscriptionId}`);
      res.json({ success: true, message: "Subscription reactivated successfully" });
    } catch (error) {
      console.error("Error resuming subscription:", error);
      res.status(500).json({ message: "Failed to resume subscription" });
    }
  });

  // Comprehensive billing overview endpoint
  app.get("/api/billing/overview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      const planInfo = getUserPlanInfo(user);

      // Get usage stats
      const locationCount = await storage.getRestaurantCount(userId);
      const teamMemberCount = await storage.getTeamMemberCount(userId);
      const tonePresetCount = await storage.getTonePresetCount(userId);

      // Get review stats from dashboard
      const dashboardStats = await storage.getDashboardStats(userId);

      let subscriptionDetails: any = null;
      let invoices: any[] = [];
      let paymentMethod: any = null;
      let cancelAtPeriodEnd = false;
      let currentPeriodEnd: Date | null = null;
      let currentPeriodStart: Date | null = null;

      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
            expand: ['default_payment_method', 'latest_invoice']
          }) as any;

          cancelAtPeriodEnd = subscription.cancel_at_period_end;
          currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
          currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null;

          subscriptionDetails = {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodStart,
            currentPeriodEnd,
            startDate: subscription.start_date ? new Date(subscription.start_date * 1000) : null,
          };

          // Get payment method
          if (subscription.default_payment_method && typeof subscription.default_payment_method === 'object') {
            const pm = subscription.default_payment_method as any;
            if (pm.card) {
              paymentMethod = {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
              };
            }
          }
        } catch (subError) {
          console.error("Error fetching subscription details:", subError);
        }
      }

      // Get invoices from Stripe
      if (user.stripeCustomerId) {
        try {
          const invoiceList = await stripe.invoices.list({
            customer: user.stripeCustomerId,
            limit: 10,
          });

          invoices = invoiceList.data.map((inv: any) => ({
            id: inv.id,
            number: inv.number,
            date: inv.created ? new Date(inv.created * 1000) : null,
            amount: inv.amount_paid / 100,
            currency: inv.currency?.toUpperCase() || 'EUR',
            status: inv.status,
            pdfUrl: inv.invoice_pdf,
            hostedUrl: inv.hosted_invoice_url,
          }));
        } catch (invError) {
          console.error("Error fetching invoices:", invError);
        }
      }

      // Calculate usage percentages
      const maxLocations = typeof planInfo.limits.maxLocations === 'number' ? planInfo.limits.maxLocations : 999;
      const maxTeamMembers = typeof planInfo.limits.maxTeamMembers === 'number' ? planInfo.limits.maxTeamMembers : 999;
      const maxTonePresets = typeof planInfo.limits.maxTonePresets === 'number' ? planInfo.limits.maxTonePresets : 999;
      const maxReplies = typeof planInfo.limits.maxRepliesPerMonth === 'number' ? planInfo.limits.maxRepliesPerMonth : 999;

      const usage = {
        locations: {
          used: locationCount,
          limit: planInfo.limits.maxLocations,
          percentage: typeof planInfo.limits.maxLocations === 'string' ? 0 : Math.round((locationCount / maxLocations) * 100),
        },
        teamMembers: {
          used: teamMemberCount,
          limit: planInfo.limits.maxTeamMembers,
          percentage: planInfo.limits.maxTeamMembers === 'unlimited' ? 0 : Math.round((teamMemberCount / maxTeamMembers) * 100),
        },
        tonePresets: {
          used: tonePresetCount,
          limit: planInfo.limits.maxTonePresets,
          percentage: planInfo.limits.maxTonePresets === 'unlimited' ? 0 : Math.round((tonePresetCount / maxTonePresets) * 100),
        },
        monthlyReplies: {
          used: user.monthlyRepliesUsed || 0,
          limit: planInfo.limits.maxRepliesPerMonth,
          percentage: planInfo.limits.maxRepliesPerMonth === 'unlimited' ? 0 : Math.round(((user.monthlyRepliesUsed || 0) / maxReplies) * 100),
          periodStart: user.monthlyRepliesPeriodStart,
        },
      };

      // Get plan pricing
      const plan = PLANS[planInfo.planId as PlanId] || PLANS.local;
      const billingCycle = (user.billingCycle as BillingCycle) || 'monthly';
      const currentPrice = billingCycle === 'yearly'
        ? Math.round((plan.price.yearly / 12) * 100) / 100
        : plan.price.monthly;

      res.json({
        subscription: {
          plan: planInfo.planId,
          planName: planInfo.planName,
          status: user.subscriptionStatus || 'pending',
          billingCycle,
          currentPrice,
          cancelAtPeriodEnd,
          currentPeriodStart,
          currentPeriodEnd,
          startDate: subscriptionDetails?.startDate || user.createdAt,
          stripeSubscriptionId: user.stripeSubscriptionId,
          trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
        },
        usage,
        reviewStats: dashboardStats,
        invoices,
        paymentMethod,
        features: planInfo.features,
        extraLocations: user.extraLocations || 0,
      });
    } catch (error) {
      console.error("Error fetching billing overview:", error);
      res.status(500).json({ message: "Failed to fetch billing overview" });
    }
  });

  // Contact form submission (public - no auth required)
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, company, email, phone, message } = req.body;

      // Validate required fields
      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and message are required"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }

      // Create unique ID and save to Replit database
      const id = `contact_${Date.now()}`;
      const contactData = {
        id,
        name,
        company: company || "",
        email,
        phone: phone || "",
        message,
        createdAt: new Date().toISOString(),
      };

      await replitDb.set(id, contactData);
      console.log(`[Contact] Saved contact form submission: ${id}`);

      res.json({ success: true, id });
    } catch (error) {
      console.error("Error saving contact form:", error);
      res.status(500).json({ success: false, message: "Failed to save contact form" });
    }
  });

  // Admin route to get global QR analytics (protected)
  app.get("/api/admin/review-qrs/analytics", isAdminAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getGlobalQrAnalytics();
      return res.json({ success: true, analytics });
    } catch (error) {
      console.error("Error fetching global QR analytics:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
  });

  // Admin route to list all QR codes with stats (protected)
  app.get("/api/admin/review-qrs", isAdminAuthenticated, async (req, res) => {
    try {
      const qrs = await storage.getAllReviewQrs();
      return res.json({ success: true, qrs });
    } catch (error) {
      console.error("Error fetching admin review QRs:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch QR codes" });
    }
  });

  // Admin route to get QR details with scan history (protected)
  app.get("/api/admin/review-qrs/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const qr = await storage.getReviewQr(id);
      if (!qr) {
        return res.status(404).json({ success: false, message: "QR code not found" });
      }
      const scansByDay = await storage.getReviewQrScansByDay(id);
      return res.json({ success: true, qr, scansByDay });
    } catch (error) {
      console.error("Error fetching admin review QR:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch QR code" });
    }
  });

  // Admin route to create QR code (protected)
  app.post("/api/admin/review-qrs", isAdminAuthenticated, async (req: any, res) => {
    try {
      const { restaurantId, name, googleReviewUrl } = req.body;

      if (!restaurantId || !googleReviewUrl) {
        return res.status(400).json({ success: false, message: "Restaurant ID and Google Review URL are required" });
      }

      // Validate that restaurant exists
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(400).json({ success: false, message: "Restaurant not found" });
      }

      // Validate URL is a legitimate Google domain
      if (!isValidGoogleReviewUrl(googleReviewUrl)) {
        return res.status(400).json({ success: false, message: "Invalid URL. Only Google review URLs are allowed" });
      }

      const qr = await storage.createReviewQr({
        restaurantId,
        name: name?.trim() || null,
        googleReviewUrl: googleReviewUrl.trim(),
        isActive: true,
      });

      return res.json({ success: true, qr });
    } catch (error) {
      console.error("Error creating admin review QR:", error);
      return res.status(500).json({ success: false, message: "Failed to create QR code" });
    }
  });

  // Admin route to update QR code (protected)
  app.patch("/api/admin/review-qrs/:id", isAdminAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, googleReviewUrl, isActive } = req.body;

      const qr = await storage.getReviewQr(id);
      if (!qr) {
        return res.status(404).json({ success: false, message: "QR code not found" });
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name?.trim() || null;
      if (googleReviewUrl !== undefined) {
        if (!isValidGoogleReviewUrl(googleReviewUrl)) {
          return res.status(400).json({ success: false, message: "Invalid URL. Only Google review URLs are allowed" });
        }
        updateData.googleReviewUrl = googleReviewUrl.trim();
      }
      if (typeof isActive === 'boolean') updateData.isActive = isActive;

      const updated = await storage.updateReviewQr(id, updateData);
      return res.json({ success: true, qr: updated });
    } catch (error) {
      console.error("Error updating admin review QR:", error);
      return res.status(500).json({ success: false, message: "Failed to update QR code" });
    }
  });

  // Admin route to get all restaurants for dropdown (protected)
  app.get("/api/admin/restaurants", isAdminAuthenticated, async (req, res) => {
    try {
      const allRestaurants = await storage.getAllRestaurants();
      return res.json(allRestaurants);
    } catch (error) {
      console.error("Error fetching admin restaurants:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch restaurants" });
    }
  });

  // Admin route to list all reviews with pagination and filters (protected)
  app.get("/api/admin/reviews", isAdminAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = 25;
      const offset = (page - 1) * limit;

      const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;
      const restaurantId = req.query.restaurant_id as string | undefined;
      const fromDate = req.query.from_date as string | undefined;
      const toDate = req.query.to_date as string | undefined;
      const replied = req.query.replied as string | undefined;
      const sort = req.query.sort as string | undefined;

      // Build query conditions
      const conditions: any[] = [];

      if (rating && rating >= 1 && rating <= 5) {
        conditions.push(eq(reviews.rating, rating));
      }

      if (restaurantId) {
        conditions.push(eq(reviews.restaurantId, restaurantId));
      }

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        conditions.push(gte(reviews.reviewedAt, start));
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(reviews.reviewedAt, end));
      }

      if (replied === 'true') {
        conditions.push(eq(reviews.replyStatus, 'posted'));
      } else if (replied === 'false') {
        conditions.push(or(eq(reviews.replyStatus, 'pending'), isNull(reviews.replyStatus)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count with proper where clause
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(whereClause);

      const totalCount = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(totalCount / limit) || 1;

      // Determine sort order (default: newest reviews first by reviewedAt)
      const sortOrder = sort === 'oldest'
        ? [asc(reviews.reviewedAt), asc(reviews.createdAt)]
        : [desc(reviews.reviewedAt), desc(reviews.createdAt)];

      // Get reviews with restaurant info including auto-post setting
      const reviewsList = await db
        .select({
          id: reviews.id,
          restaurantId: reviews.restaurantId,
          googleReviewId: reviews.googleReviewId,
          reviewerName: reviews.reviewerName,
          reviewerPhotoUrl: reviews.reviewerPhotoUrl,
          rating: reviews.rating,
          comment: reviews.comment,
          language: reviews.language,
          sentiment: reviews.sentiment,
          generatedReply: reviews.generatedReply,
          postedReply: reviews.postedReply,
          replyStatus: reviews.replyStatus,
          reviewedAt: reviews.reviewedAt,
          repliedAt: reviews.repliedAt,
          createdAt: reviews.createdAt,
          updatedAt: reviews.updatedAt,
          restaurantName: restaurants.name,
          autoPostEnabled: restaurants.autoPostEnabled,
        })
        .from(reviews)
        .leftJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
        .where(whereClause)
        .orderBy(...sortOrder)
        .limit(limit)
        .offset(offset);

      // Get all restaurants for filter dropdown
      const allRestaurants = await db
        .select({ id: restaurants.id, name: restaurants.name })
        .from(restaurants)
        .orderBy(restaurants.name);

      res.json({
        success: true,
        reviews: reviewsList,
        restaurants: allRestaurants,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching admin reviews:", error);
      res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
  });

  // Admin route to list all contact submissions (protected)
  app.get("/api/admin/contacts", isAdminAuthenticated, async (req, res) => {
    try {
      // Get all keys starting with "contact_"
      const keysResult = await replitDb.list("contact_");

      // Handle different return formats from Replit database
      let keys: string[] = [];
      if (Array.isArray(keysResult)) {
        keys = keysResult;
      } else if (keysResult && typeof keysResult === 'object' && 'value' in keysResult) {
        keys = (keysResult as any).value || [];
      }

      // Fetch all contact entries and unwrap the Replit DB result format
      const contactsRaw = await Promise.all(
        keys.map(async (key: string) => {
          const result = await replitDb.get(key);
          // Unwrap Replit DB result format { ok: true, value: data }
          if (result && typeof result === 'object' && 'value' in result) {
            return (result as any).value;
          }
          return result;
        })
      );

      // Filter out any null/undefined values
      const contacts = contactsRaw.filter((c) => c != null);

      // Sort by createdAt descending (newest first)
      contacts.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json({ success: true, count: contacts.length, contacts });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ success: false, message: "Failed to fetch contacts" });
    }
  });

  // Admin route to delete a contact submission (protected)
  app.delete("/api/admin/contacts/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      // Delete the contact from Replit database
      await replitDb.delete(id);
      console.log(`[Admin] Contact deleted: ${id}`);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ success: false, message: "Failed to delete contact" });
    }
  });

  // ============================
  // ADMIN ANALYTICS ENDPOINTS
  // ============================

  const adminAnalytics = await import("./services/adminAnalytics");

  app.get("/api/admin/analytics/overview", isAdminAuthenticated, async (req, res) => {
    try {
      const [metrics, chartData] = await Promise.all([
        adminAnalytics.getOverviewMetrics(),
        adminAnalytics.getSignupsAndRepliesChart(),
      ]);
      res.json({ success: true, metrics, chartData });
    } catch (error) {
      console.error("Error fetching overview analytics:", error);
      res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/analytics/traffic", isAdminAuthenticated, async (req, res) => {
    try {
      const [metrics, chartData] = await Promise.all([
        adminAnalytics.getTrafficMetrics(),
        adminAnalytics.getVisitsChart(),
      ]);
      res.json({ success: true, metrics, chartData });
    } catch (error) {
      console.error("Error fetching traffic analytics:", error);
      res.status(500).json({ success: false, message: "Failed to fetch traffic analytics" });
    }
  });

  app.get("/api/admin/analytics/billing", isAdminAuthenticated, async (req, res) => {
    try {
      const [metrics, mrrChart] = await Promise.all([
        adminAnalytics.getBillingMetrics(),
        adminAnalytics.getMrrChart(),
      ]);
      res.json({ success: true, metrics, mrrChart });
    } catch (error) {
      console.error("Error fetching billing analytics:", error);
      res.status(500).json({ success: false, message: "Failed to fetch billing analytics" });
    }
  });

  app.get("/api/admin/analytics/locations", isAdminAuthenticated, async (req, res) => {
    try {
      const locations = await adminAnalytics.getLocationMetrics();
      res.json({ success: true, locations });
    } catch (error) {
      console.error("Error fetching location analytics:", error);
      res.status(500).json({ success: false, message: "Failed to fetch location analytics" });
    }
  });

  app.get("/api/admin/analytics/usage", isAdminAuthenticated, async (req, res) => {
    try {
      const [metrics, chartData] = await Promise.all([
        adminAnalytics.getUsageMetrics(),
        adminAnalytics.getDailyUsageChart(),
      ]);
      res.json({ success: true, metrics, chartData });
    } catch (error) {
      console.error("Error fetching usage analytics:", error);
      res.status(500).json({ success: false, message: "Failed to fetch usage analytics" });
    }
  });

  // ============================
  // ADMIN CRM PANEL
  // ============================

  // Get all leads across all affiliates (for CRM board)
  app.get("/api/admin/crm/leads", isAdminAuthenticated, async (req, res) => {
    try {
      const leads = await storage.getAllAffiliateLeadsWithAffiliate();
      res.json({ success: true, leads });
    } catch (error) {
      console.error("Error fetching CRM leads:", error);
      res.status(500).json({ success: false, message: "Failed to fetch CRM leads" });
    }
  });

  // Update lead status (for Kanban drag-and-drop)
  app.patch("/api/admin/crm/leads/:id/status", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) return res.status(400).json({ success: false, message: "Status required" });
      const lead = await storage.updateAffiliateLeadStatus(id, status);
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
      res.json({ success: true, lead });
    } catch (error) {
      console.error("Error updating CRM lead status:", error);
      res.status(500).json({ success: false, message: "Failed to update lead status" });
    }
  });

  // Update lead notes
  app.patch("/api/admin/crm/leads/:id/notes", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const lead = await storage.updateAffiliateLeadNotes(id, notes || "");
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
      res.json({ success: true, lead });
    } catch (error) {
      console.error("Error updating CRM lead notes:", error);
      res.status(500).json({ success: false, message: "Failed to update lead notes" });
    }
  });

  // Get CRM pipeline stats
  app.get("/api/admin/crm/stats", isAdminAuthenticated, async (req, res) => {
    try {
      const leads = await storage.getAllAffiliateLeadsWithAffiliate();
      const statuses = ["pending", "called", "call_later", "not_interested", "sale_closed"];
      const pipeline: Record<string, number> = {};
      statuses.forEach(s => { pipeline[s] = 0; });
      leads.forEach(l => { pipeline[l.status || "pending"] = (pipeline[l.status || "pending"] || 0) + 1; });
      const total = leads.length;
      const closed = pipeline["sale_closed"] || 0;
      const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
      res.json({ success: true, stats: { total, pipeline, conversionRate, closed } });
    } catch (error) {
      console.error("Error fetching CRM stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch CRM stats" });
    }
  });

  // ============================
  // ADMIN AFFILIATE MANAGEMENT
  // ============================


  // Get all affiliates
  app.get("/api/admin/affiliates", isAdminAuthenticated, async (req, res) => {
    try {
      const allAffiliates = await storage.getAllAffiliates();
      // Get lead and sale counts for each affiliate
      const affiliatesWithStats = await Promise.all(
        allAffiliates.map(async (affiliate) => {
          const leads = await storage.getAffiliateLeads(affiliate.id);
          const sales = await storage.getAffiliateSales(affiliate.id);
          const totalSalesEur = sales.reduce((sum, s) => sum + (s.planSoldEur || 0), 0);
          const validatedSales = sales.filter(s => s.status === "validated" || s.status === "paid");
          const totalCommission = validatedSales.reduce((sum, s) => sum + (s.planSoldEur || 0) * (affiliate.commissionPct / 100), 0);
          return {
            ...affiliate,
            passwordHash: undefined, // Don't expose password hash
            leadCount: leads.length,
            saleCount: sales.length,
            totalSalesEur,
            totalCommission: Math.round(totalCommission * 100) / 100,
          };
        })
      );
      res.json({ success: true, affiliates: affiliatesWithStats });
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({ success: false, message: "Failed to fetch affiliates" });
    }
  });

  // Create affiliate
  app.post("/api/admin/affiliates", isAdminAuthenticated, async (req, res) => {
    try {
      const { username, password, zone, commissionPct } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
      }

      // Check if username already exists
      const existing = await storage.getAffiliateByUsername(username);
      if (existing) {
        return res.status(400).json({ success: false, message: "Username already exists" });
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      const affiliate = await storage.createAffiliate({
        username,
        passwordHash,
        zone: zone || null,
        commissionPct: commissionPct || 15,
        status: "active",
      });

      res.json({
        success: true,
        affiliate: { ...affiliate, passwordHash: undefined }
      });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      res.status(500).json({ success: false, message: "Failed to create affiliate" });
    }
  });

  // Update affiliate
  app.patch("/api/admin/affiliates/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, zone, commissionPct, status } = req.body;

      const updateData: any = {};
      if (username) updateData.username = username;
      if (zone !== undefined) updateData.zone = zone;
      if (commissionPct !== undefined) updateData.commissionPct = commissionPct;
      if (status) updateData.status = status;

      // If password is provided, hash it
      if (password) {
        const bcrypt = await import("bcryptjs");
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const affiliate = await storage.updateAffiliate(id, updateData);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }

      res.json({
        success: true,
        affiliate: { ...affiliate, passwordHash: undefined }
      });
    } catch (error) {
      console.error("Error updating affiliate:", error);
      res.status(500).json({ success: false, message: "Failed to update affiliate" });
    }
  });

  // Delete affiliate
  app.delete("/api/admin/affiliates/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAffiliate(id);
      res.json({ success: true, message: "Affiliate deleted" });
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      res.status(500).json({ success: false, message: "Failed to delete affiliate" });
    }
  });

  // Get leads for a specific affiliate (admin view)
  app.get("/api/admin/affiliates/:id/leads", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const leads = await storage.getAffiliateLeads(id);
      res.json({ success: true, leads });
    } catch (error) {
      console.error("Error fetching affiliate leads:", error);
      res.status(500).json({ success: false, message: "Failed to fetch leads" });
    }
  });

  // Create lead for affiliate (admin)
  app.post("/api/admin/affiliates/:id/leads", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { businessName, contactName, phone, email, notes } = req.body;

      if (!businessName) {
        return res.status(400).json({ success: false, message: "Business name required" });
      }

      const lead = await storage.createAffiliateLead({
        affiliateId: id,
        businessName,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        status: "pending",
      });

      res.json({ success: true, lead });
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ success: false, message: "Failed to create lead" });
    }
  });

  // Bulk import leads from CSV (admin)
  app.post("/api/admin/affiliates/:id/leads/import", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { leads } = req.body;

      if (!Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ success: false, message: "Leads array required" });
      }

      // Validate affiliate exists
      const affiliate = await storage.getAffiliateById(id);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }

      // Prepare leads for insertion
      const leadsToInsert = leads.map((lead: any) => ({
        affiliateId: id,
        businessName: lead.businessName || lead.business_name || "Unknown",
        contactName: lead.contactName || lead.contact_name || null,
        phone: lead.phone || null,
        email: lead.email || null,
        notes: lead.notes || null,
        status: "pending" as const,
      }));

      const insertedLeads = await storage.createAffiliateLeadsBulk(leadsToInsert);
      res.json({ success: true, imported: insertedLeads.length, leads: insertedLeads });
    } catch (error) {
      console.error("Error importing leads:", error);
      res.status(500).json({ success: false, message: "Failed to import leads" });
    }
  });

  // Delete lead (admin)
  app.delete("/api/admin/leads/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAffiliateLead(id);
      res.json({ success: true, message: "Lead deleted" });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ success: false, message: "Failed to delete lead" });
    }
  });

  // Get all sales (admin)
  app.get("/api/admin/affiliate-sales", isAdminAuthenticated, async (req, res) => {
    try {
      const sales = await storage.getAllAffiliateSales();
      res.json({ success: true, sales });
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ success: false, message: "Failed to fetch sales" });
    }
  });

  // Update sale status (admin - validate/pay)
  app.patch("/api/admin/affiliate-sales/:id", isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["pending", "validated", "paid"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        });
      }

      const sale = await storage.updateAffiliateSaleStatus(id, status);
      if (!sale) {
        return res.status(404).json({ success: false, message: "Sale not found" });
      }

      res.json({ success: true, sale });
    } catch (error) {
      console.error("Error updating sale status:", error);
      res.status(500).json({ success: false, message: "Failed to update sale status" });
    }
  });

  // ============================
  // TEAM MEMBER ENDPOINTS
  // ============================

  app.get("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const members = await storage.getTeamMembers(userId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[team] Creating team member invite for user ${userId}`, req.body);

      const user = await storage.getUser(userId);

      if (!user) {
        console.log(`[team] User not found: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      // Check team member limits
      const currentCount = await storage.getTeamMemberCount(userId);
      const teamCheck = canAddTeamMember(user, currentCount);

      if (!teamCheck.allowed) {
        console.log(`[team] Team limit reached for user ${userId}:`, teamCheck);
        return res.status(403).json({
          error: PLAN_ERROR_CODES.TEAM_LIMIT_REACHED,
          message: teamCheck.reason,
          limit: teamCheck.limit,
          current: teamCheck.current,
        });
      }

      const data = insertTeamMemberSchema.parse({ ...req.body, ownerId: userId });
      console.log(`[team] Parsed invite data:`, data);
      const member = await storage.createTeamMember(data);
      console.log(`[team] Team member created:`, member);
      res.json(member);
    } catch (error: any) {
      console.error("Error creating team member:", error?.message || error);
      res.status(500).json({ message: error?.message || "Failed to create team member" });
    }
  });

  app.patch("/api/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership by checking if member belongs to user's team
      const members = await storage.getTeamMembers(userId);
      const member = members.find((m) => m.id === id);

      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const updated = await storage.updateTeamMember(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete("/api/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const members = await storage.getTeamMembers(userId);
      const member = members.find((m) => m.id === id);

      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      await storage.deleteTeamMember(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // ============================
  // INVITATION ENDPOINTS
  // ============================

  // Attach modular routes
  app.use("/api/onboarding", onboardingRouter);
  app.use("/api/alerts", alertsRouter);

  // Get pending invitations for the current user
  app.get("/api/invitations/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      if (!userEmail) {
        return res.status(400).json({ message: "User email not available" });
      }
      const invitations = await storage.getPendingInvitationsByEmail(userEmail);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });

  // Accept an invitation
  app.post("/api/invitations/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;

      // Get the invitation
      const invitation = await storage.getTeamMemberById(id);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Verify this invitation is for the current user
      if (invitation.email.toLowerCase() !== userEmail?.toLowerCase()) {
        return res.status(403).json({ message: "This invitation is not for you" });
      }

      // Verify it's still pending
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation is no longer pending" });
      }

      // Accept the invitation and link to the accepting user
      const updated = await storage.updateTeamMember(id, {
        status: "active",
        userId: userId,
        acceptedAt: new Date(),
      });

      // Grant the invitee access to all restaurants the inviter has access to
      const inviterAccess = await storage.getRestaurantAccessByUserId(invitation.ownerId);
      for (const access of inviterAccess) {
        await storage.grantRestaurantAccess({
          userId: userId,
          restaurantId: access.restaurantId,
          role: invitation.role || "member", // Use the role from the invitation
          grantedBy: invitation.ownerId,
        });
      }

      res.json({ success: true, member: updated });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Decline an invitation
  app.post("/api/invitations/:id/decline", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userEmail = req.user.claims.email;

      // Get the invitation
      const invitation = await storage.getTeamMemberById(id);

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Verify this invitation is for the current user
      if (invitation.email.toLowerCase() !== userEmail?.toLowerCase()) {
        return res.status(403).json({ message: "This invitation is not for you" });
      }

      // Verify it's still pending
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation is no longer pending" });
      }

      // Delete the invitation (declined)
      await storage.deleteTeamMember(id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  // ============================
  // TONE PRESET ENDPOINTS
  // ============================

  app.get("/api/tone-presets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const presets = await storage.getTonePresets(userId);
      res.json(presets);
    } catch (error) {
      console.error("Error fetching tone presets:", error);
      res.status(500).json({ message: "Failed to fetch tone presets" });
    }
  });

  app.post("/api/tone-presets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check tone preset limits
      const currentCount = await storage.getTonePresetCount(userId);
      const presetCheck = canAddTonePreset(user, currentCount);

      if (!presetCheck.allowed) {
        return res.status(403).json({
          error: PLAN_ERROR_CODES.TONE_PRESET_LIMIT_REACHED,
          message: presetCheck.reason,
          limit: presetCheck.limit,
          current: presetCheck.current,
        });
      }

      const data = insertTonePresetSchema.parse({ ...req.body, userId });
      const preset = await storage.createTonePreset(data);
      res.json(preset);
    } catch (error) {
      console.error("Error creating tone preset:", error);
      res.status(500).json({ message: "Failed to create tone preset" });
    }
  });

  app.patch("/api/tone-presets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const preset = await storage.getTonePreset(id);
      if (!preset || preset.userId !== userId) {
        return res.status(404).json({ message: "Tone preset not found" });
      }

      const updated = await storage.updateTonePreset(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating tone preset:", error);
      res.status(500).json({ message: "Failed to update tone preset" });
    }
  });

  app.delete("/api/tone-presets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const preset = await storage.getTonePreset(id);
      if (!preset || preset.userId !== userId) {
        return res.status(404).json({ message: "Tone preset not found" });
      }

      await storage.deleteTonePreset(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tone preset:", error);
      res.status(500).json({ message: "Failed to delete tone preset" });
    }
  });

  // ============================
  // ANALYTICS ENDPOINT (all users)
  // ============================

  app.get("/api/analytics/advanced", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const analytics = await storage.getAdvancedAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching advanced analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ============================
  // MULTI-LOCATION DASHBOARD (Business+ only)
  // ============================

  app.get("/api/locations/overview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check feature access
      const accessCheck = canAccessMultiLocationDashboard(user);
      if (!accessCheck.allowed) {
        return res.status(403).json({
          error: PLAN_ERROR_CODES.FEATURE_NOT_IN_PLAN,
          message: accessCheck.reason,
          feature: "multi_location_dashboard",
        });
      }

      const overview = await storage.getLocationOverview(userId);
      res.json(overview);
    } catch (error) {
      console.error("Error fetching location overview:", error);
      res.status(500).json({ message: "Failed to fetch location overview" });
    }
  });

  // ============================
  // ADD EXTRA LOCATION (Business plan only)
  // ============================

  app.post("/api/billing/add-extra-location", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user can add extra locations (Business plan only)
      if (!canAddExtraLocation(user)) {
        return res.status(403).json({
          error: PLAN_ERROR_CODES.FEATURE_NOT_IN_PLAN,
          message: "Extra locations are only available on the Business plan.",
        });
      }

      const stripe = await getUncachableStripeClient();

      // Get or create customer (handles test→live mode migration)
      const customerId = await getOrCreateStripeCustomer(
        stripe,
        userId,
        user.stripeCustomerId,
        user.email
      );

      // Create checkout session for extra location
      // Use a price ID for the extra location addon (€39/month)
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: "Extra Location Add-on",
              description: "Add one extra location to your Business plan",
            },
            unit_amount: 3900, // €39 in cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${getPublicBaseUrl(req)}/billing?extra_location=success`,
        cancel_url: `${getPublicBaseUrl(req)}/billing?extra_location=canceled`,
        metadata: {
          userId,
          type: "extra_location",
        },
        subscription_data: {
          metadata: {
            userId,
            type: "extra_location",
          },
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating extra location checkout:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // ============================
  // ADMIN: PLAN LIMITS TESTING ENDPOINT
  // ============================

  app.post("/api/admin/test-plan-limits", isAdminAuthenticated, async (req, res) => {
    try {
      const { userId, action, value } = req.body;

      if (!userId || !action) {
        return res.status(400).json({
          message: "userId and action are required",
          availableActions: [
            "set_monthly_replies",
            "reset_monthly_replies",
            "set_plan",
            "get_user_limits"
          ]
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      switch (action) {
        case "set_monthly_replies":
          const replyCount = parseInt(value) || 0;
          await storage.updateUserReplyUsage(userId, replyCount, user.monthlyRepliesPeriodStart || new Date());
          return res.json({
            success: true,
            message: `Set monthly replies to ${replyCount}`,
            user: await storage.getUser(userId)
          });

        case "reset_monthly_replies":
          await storage.updateUserReplyUsage(userId, 0, new Date());
          return res.json({
            success: true,
            message: "Reset monthly replies to 0",
            user: await storage.getUser(userId)
          });

        case "set_plan":
          const validPlans = ["local", "pro", "business", "enterprise"];
          if (!validPlans.includes(value)) {
            return res.status(400).json({ message: `Invalid plan. Use: ${validPlans.join(", ")}` });
          }
          await storage.updateUserStripeInfo(userId, {
            subscriptionPlan: value,
            subscriptionStatus: "active",
          });
          return res.json({
            success: true,
            message: `Set plan to ${value}`,
            user: await storage.getUser(userId)
          });

        case "get_user_limits":
          const planInfo = getUserPlanInfo(user);
          const locationCount = await storage.getRestaurantCount(userId);
          const teamMemberCount = await storage.getTeamMemberCount(userId);
          const tonePresetCount = await storage.getTonePresetCount(userId);

          const locationCheck = canAddLocation(user, locationCount);
          const teamCheck = canAddTeamMember(user, teamMemberCount);
          const toneCheck = canAddTonePreset(user, tonePresetCount);
          const replyCheck = canSendReply(user);

          return res.json({
            success: true,
            planInfo,
            currentUsage: {
              locations: locationCount,
              teamMembers: teamMemberCount,
              tonePresets: tonePresetCount,
              monthlyReplies: user.monthlyRepliesUsed || 0,
            },
            canAdd: {
              location: locationCheck,
              teamMember: teamCheck,
              tonePreset: toneCheck,
              reply: replyCheck,
            }
          });

        default:
          return res.status(400).json({
            message: "Unknown action",
            availableActions: [
              "set_monthly_replies",
              "reset_monthly_replies",
              "set_plan",
              "set_trial_status",
              "get_user_limits"
            ]
          });
      }
    } catch (error) {
      console.error("Error in plan limits test:", error);
      res.status(500).json({ message: "Failed to test plan limits" });
    }
  });

  // ============================
  // PLAN INFO ENDPOINT
  // ============================

  app.get("/api/plan-info", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const planInfo = getUserPlanInfo(user);
      const locationCount = await storage.getRestaurantCount(userId);
      const teamMemberCount = await storage.getTeamMemberCount(userId);
      const tonePresetCount = await storage.getTonePresetCount(userId);

      res.json({
        ...planInfo,
        currentUsage: {
          locations: locationCount,
          teamMembers: teamMemberCount,
          tonePresets: tonePresetCount,
          monthlyReplies: user.monthlyRepliesUsed || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching plan info:", error);
      res.status(500).json({ message: "Failed to fetch plan info" });
    }
  });

  // ============================
  // AFFILIATE SYSTEM ROUTES
  // ============================

  // Affiliate session management (in-memory like admin sessions)
  const AFFILIATE_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Affiliate authentication middleware (DB-backed so sessions survive restarts)
  async function isAffiliateAuthenticated(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.affiliate_token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
      const [row] = await db
        .select()
        .from(affiliateSessionsTable)
        .where(eq(affiliateSessionsTable.token, token));
      if (!row) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      if (row.expiresAt.getTime() < Date.now()) {
        await db.delete(affiliateSessionsTable).where(eq(affiliateSessionsTable.token, token));
        return res.status(401).json({ success: false, message: "Session expired" });
      }
      (req as any).affiliateId = row.affiliateId;
      next();
    } catch (err) {
      console.error("Affiliate auth error:", err);
      return res.status(500).json({ success: false, message: "Auth check failed" });
    }
  }

  // Helper to get current affiliate from request
  async function getCurrentAffiliate(req: Request) {
    const affiliateId = (req as any).affiliateId;
    if (!affiliateId) return null;
    return await storage.getAffiliateById(affiliateId);
  }

  // Affiliate login
  app.post("/api/affiliate/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
      }

      const affiliate = await storage.getAffiliateByUsername(username);
      if (!affiliate) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      // Verify password using bcrypt
      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.compare(password, affiliate.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      // Check if affiliate is paused
      if (affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Account paused. Contact administrator." });
      }

      // Create session token (persisted in DB)
      const token = generateToken();
      const now = new Date();
      await db.insert(affiliateSessionsTable).values({
        token,
        affiliateId: affiliate.id,
        createdAt: now,
        expiresAt: new Date(now.getTime() + AFFILIATE_SESSION_TTL_MS),
      });

      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      res.cookie('affiliate_token', token, {
        httpOnly: true,
        secure: isSecure,
        maxAge: AFFILIATE_SESSION_TTL_MS,
        sameSite: 'lax'
      });

      return res.json({
        success: true,
        message: "Login successful",
        affiliate: {
          id: affiliate.id,
          username: affiliate.username,
          zone: affiliate.zone,
          status: affiliate.status,
          commissionPct: affiliate.commissionPct,
        }
      });
    } catch (error) {
      console.error("Affiliate login error:", error);
      return res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  // Affiliate logout
  app.post("/api/affiliate/logout", async (req, res) => {
    const token = req.cookies?.affiliate_token;
    if (token) {
      try {
        await db.delete(affiliateSessionsTable).where(eq(affiliateSessionsTable.token, token));
      } catch {}
    }
    res.clearCookie('affiliate_token');
    return res.json({ success: true, message: "Logged out" });
  });

  // Get current affiliate
  app.get("/api/affiliate/me", isAffiliateAuthenticated, async (req, res) => {
    try {
      const affiliate = await getCurrentAffiliate(req);
      if (!affiliate) {
        return res.status(404).json({ success: false, message: "Affiliate not found" });
      }

      // Check if paused
      if (affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Account paused" });
      }

      return res.json({
        id: affiliate.id,
        username: affiliate.username,
        zone: affiliate.zone,
        status: affiliate.status,
        commissionPct: affiliate.commissionPct,
        createdAt: affiliate.createdAt,
      });
    } catch (error) {
      console.error("Error fetching affiliate:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch affiliate" });
    }
  });

  // ============================
  // AFFILIATE PRODUCT DEMO
  // Allow affiliates to launch into a fully-functional demo of the
  // HolaRevi product (real OpenAI replies, seeded reviews) so they can
  // pitch the product to potential clients.
  // ============================
  app.post("/api/affiliate/demo/launch", isAffiliateAuthenticated, async (req, res) => {
    try {
      const { user: demoUser } = await ensureDemoEnvironment();
      const affiliateId = (req as any).affiliateId as string;

      // Switch the regular user session to the demo account.
      req.session.userId = demoUser.id;
      req.session.isDemo = true;
      req.session.affiliateIdForDemo = affiliateId;

      req.session.save((err) => {
        if (err) {
          console.error("Failed to save demo session:", err);
          return res.status(500).json({ success: false, message: "Failed to start demo" });
        }
        return res.json({ success: true });
      });
    } catch (error) {
      console.error("Affiliate demo launch error:", error);
      return res.status(500).json({ success: false, message: "Failed to start demo" });
    }
  });

  // Add a custom review to the demo restaurant so affiliates can show
  // prospects how the AI replies to any kind of review they want.
  app.post("/api/affiliate/demo/review", async (req, res) => {
    try {
      if (!req.session?.isDemo) {
        return res.status(403).json({ success: false, message: "Not in demo mode" });
      }
      const demoUser = await storage.getUserByEmail(DEMO_USER_EMAIL);
      if (!demoUser) {
        return res.status(500).json({ success: false, message: "Demo not initialized" });
      }
      const [demoRestaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.userId, demoUser.id))
        .limit(1);
      if (!demoRestaurant) {
        return res.status(500).json({ success: false, message: "Demo restaurant missing" });
      }

      const { reviewerName, rating, comment, language } = req.body || {};
      const ratingNum = Number(rating);
      if (!comment || typeof comment !== "string" || comment.trim().length < 3) {
        return res.status(400).json({ success: false, message: "Review text required" });
      }
      if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, message: "Rating must be 1-5" });
      }
      const lang = ["es", "en", "ca"].includes(language) ? language : "es";
      const sentiment =
        ratingNum >= 4 ? "positive" : ratingNum <= 2 ? "negative" : "neutral";
      const safeName =
        (typeof reviewerName === "string" && reviewerName.trim()) || "Cliente Demo";

      const [created] = await db
        .insert(reviews)
        .values({
          restaurantId: demoRestaurant.id,
          googleReviewId: `demo-custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          reviewerName: safeName.slice(0, 120),
          reviewerPhotoUrl: null,
          rating: ratingNum,
          comment: comment.trim().slice(0, 2000),
          language: lang,
          sentiment,
          generatedReply: null,
          postedReply: null,
          replyStatus: "pending",
          reviewedAt: new Date(),
          repliedAt: null,
        } as any)
        .returning();

      return res.json({ success: true, review: created });
    } catch (error) {
      console.error("Affiliate demo add-review error:", error);
      return res.status(500).json({ success: false, message: "Failed to add review" });
    }
  });

  // Reset the demo back to the seeded reviews (deletes any AI replies
  // generated during a previous demo session). Only the affiliate that
  // launched the demo (or any authenticated affiliate) can reset.
  app.post("/api/affiliate/demo/reset", isAffiliateAuthenticated, async (req, res) => {
    try {
      const demoUser = await storage.getUserByEmail(DEMO_USER_EMAIL);
      if (demoUser) {
        const demoRestaurants = await db
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(eq(restaurants.userId, demoUser.id));
        for (const r of demoRestaurants) {
          await db.delete(reviews).where(eq(reviews.restaurantId, r.id));
        }
      }
      const fresh = await ensureDemoEnvironment();
      return res.json({ success: true, restaurantId: fresh.restaurant.id });
    } catch (error) {
      console.error("Affiliate demo reset error:", error);
      return res.status(500).json({ success: false, message: "Failed to reset demo" });
    }
  });

  // Get affiliate leads
  app.get("/api/affiliate/leads", isAffiliateAuthenticated, async (req, res) => {
    try {
      const affiliate = await getCurrentAffiliate(req);
      if (!affiliate || affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const leads = await storage.getAffiliateLeads(affiliate.id);
      return res.json(leads);
    } catch (error) {
      console.error("Error fetching affiliate leads:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch leads" });
    }
  });

  // Update lead status
  app.patch("/api/affiliate/leads/:id/status", isAffiliateAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["pending", "called", "not_interested", "call_later", "sale_closed"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        });
      }

      const affiliate = await getCurrentAffiliate(req);
      if (!affiliate || affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      // Verify lead belongs to this affiliate
      const lead = await storage.getAffiliateLead(id);
      if (!lead || lead.affiliateId !== affiliate.id) {
        return res.status(404).json({ success: false, message: "Lead not found" });
      }

      const updated = await storage.updateAffiliateLeadStatus(id, status);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating lead status:", error);
      return res.status(500).json({ success: false, message: "Failed to update lead status" });
    }
  });

  // Update lead notes
  app.patch("/api/affiliate/leads/:id/notes", isAffiliateAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (typeof notes !== "string") {
        return res.status(400).json({ success: false, message: "Notes must be a string" });
      }

      const affiliate = await getCurrentAffiliate(req);
      if (!affiliate || affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      // Verify lead belongs to this affiliate
      const lead = await storage.getAffiliateLead(id);
      if (!lead || lead.affiliateId !== affiliate.id) {
        return res.status(404).json({ success: false, message: "Lead not found" });
      }

      const updated = await storage.updateAffiliateLeadNotes(id, notes);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating lead notes:", error);
      return res.status(500).json({ success: false, message: "Failed to update lead notes" });
    }
  });

  // Affiliate adds leads via plain text (one per line)
  // Format per line:  Business Name | City | Phone | Email | Notes
  // Only Business Name is required; other fields are optional.
  app.post("/api/affiliate/leads/bulk-text", isAffiliateAuthenticated, async (req, res) => {
    try {
      const affiliate = await getCurrentAffiliate(req);
      if (!affiliate || affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const { text } = req.body as { text?: string };
      if (typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ success: false, message: "Text is required" });
      }

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        return res.status(400).json({ success: false, message: "No leads found" });
      }

      const MAX_LEADS = 500;
      if (lines.length > MAX_LEADS) {
        return res.status(400).json({
          success: false,
          message: `Too many leads. Max ${MAX_LEADS} per request`,
        });
      }

      const toInsert = lines
        .map((line) => {
          const parts = line.split(/\s*[|\t;]\s*/);
          const businessName = (parts[0] || "").trim();
          if (!businessName) return null;
          const city = (parts[1] || "").trim() || null;
          const phone = (parts[2] || "").trim() || null;
          let email: string | null = (parts[3] || "").trim() || null;
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = null;
          const notes = (parts.slice(4).join(" | ") || "").trim() || null;
          return {
            affiliateId: affiliate.id,
            businessName,
            city,
            phone,
            email,
            notes,
            status: "pending" as const,
          };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);

      if (toInsert.length === 0) {
        return res.status(400).json({ success: false, message: "No valid leads found" });
      }

      const created = await storage.createAffiliateLeadsBulk(toInsert as any);
      return res.json({ success: true, created: created.length, leads: created });
    } catch (error) {
      console.error("Error creating affiliate leads from text:", error);
      return res.status(500).json({ success: false, message: "Failed to create leads" });
    }
  });

  // Create affiliate sale
  app.post("/api/affiliate/sales", isAffiliateAuthenticated, async (req, res) => {
    try {
      const { leadId, businessEmail, planSoldEur, comment } = req.body;

      const affiliate = await getCurrentAffiliate(req);
      if (!affiliate || affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      // Validate required fields
      if (!planSoldEur || typeof planSoldEur !== "number" || planSoldEur <= 0) {
        return res.status(400).json({ success: false, message: "Valid plan price in EUR required" });
      }

      // If leadId is provided, verify it belongs to this affiliate
      if (leadId) {
        const lead = await storage.getAffiliateLead(leadId);
        if (!lead || lead.affiliateId !== affiliate.id) {
          return res.status(404).json({ success: false, message: "Lead not found" });
        }

        // Update lead status to sale_closed
        await storage.updateAffiliateLeadStatus(leadId, "sale_closed");
      }

      const sale = await storage.createAffiliateSale({
        affiliateId: affiliate.id,
        leadId: leadId || null,
        businessEmail: businessEmail || null,
        planSoldEur,
        comment: comment || null,
        status: "pending",
      });

      return res.json(sale);
    } catch (error) {
      console.error("Error creating affiliate sale:", error);
      return res.status(500).json({ success: false, message: "Failed to create sale" });
    }
  });

  // Get affiliate sales
  app.get("/api/affiliate/sales", isAffiliateAuthenticated, async (req, res) => {
    try {
      const affiliate = await getCurrentAffiliate(req);
      if (!affiliate || affiliate.status === "paused") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const sales = await storage.getAffiliateSales(affiliate.id);
      return res.json(sales);
    } catch (error) {
      console.error("Error fetching affiliate sales:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch sales" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
