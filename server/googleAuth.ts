import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
  'profile'
];

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

function getRedirectUri(req: any, usePartnerCallback: boolean = false): string {
  const protocol = 'https';
  const hostname = req.hostname;
  // EmbedSocial uses /callback, direct Google OAuth uses /api/google/callback
  const path = usePartnerCallback ? '/callback' : '/api/google/callback';
  return `${protocol}://${hostname}${path}`;
}

export function setupGoogleAuth(app: Express) {
  app.get("/api/google/connect/:restaurantId", isAuthenticated, async (req: any, res) => {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.claims.sub;

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Always use direct Google OAuth (not EmbedSocial)
      const usePartner = false;
      const redirectUri = getRedirectUri(req, usePartner);
      const state = Buffer.from(JSON.stringify({ restaurantId, userId, usePartner })).toString('base64');

      // Use direct Google OAuth
      const config = getGoogleOAuthConfig();

      if (!config) {
        return res.status(500).json({
          error: "Google OAuth not configured",
          message: "Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables"
        });
      }

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      console.log(`[Google OAuth] Initiating OAuth for restaurant ${restaurantId}`);
      console.log(`[Google OAuth] Redirect URI: ${redirectUri}`);

      res.json({ authUrl: authUrl.toString() });
    } catch (error: any) {
      console.error("[Google OAuth] Connect error:", error);
      res.status(500).json({ error: "Failed to initiate Google OAuth" });
    }
  });

  app.get("/api/google/callback", async (req, res) => {
    console.log("[Google OAuth Callback] Received callback with query:", JSON.stringify(req.query));
    try {
      const { code, state, error } = req.query;

      // Determine redirect base: if user is in onboarding, redirect there
      let redirectBase = '/restaurants';
      let userId: string | null = null;
      let restaurantId: string | null = null;

      // Parse state first to get userId for onboarding check
      let stateData: any = null;
      if (state) {
        try {
          stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
          userId = stateData.userId;
          restaurantId = stateData.restaurantId;
        } catch (e) {
          // Will be handled below
        }
      }

      // Check if the user is in onboarding flow
      if (userId) {
        const user = await storage.getUser(userId);
        if (user && !user.onboardingCompleted) {
          redirectBase = '/onboarding';
        }
      }

      if (error) {
        console.error("[Google OAuth Callback] Error from Google:", error);
        return res.redirect(`${redirectBase}?error=google_auth_failed`);
      }

      if (!code || !state || !stateData) {
        console.error("[Google OAuth Callback] Missing code or state. code:", !!code, "state:", !!state);
        return res.redirect(`${redirectBase}?error=missing_code`);
      }

      console.log("[Google OAuth Callback] Parsed state:", JSON.stringify(stateData));
      const redirectUri = getRedirectUri(req, false);
      console.log("[Google OAuth Callback] Restaurant ID:", restaurantId, "User ID:", userId, "Redirect URI:", redirectUri);

      // Direct Google OAuth
      const config = getGoogleOAuthConfig();
      if (!config) {
        console.error("[Google OAuth Callback] Google OAuth not configured");
        return res.redirect(`${redirectBase}?error=not_configured`);
      }

      console.log("[Google OAuth Callback] Exchanging code for tokens...");
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("[Google OAuth Callback] Token exchange failed:", errorData);
        return res.redirect(`${redirectBase}?error=token_exchange_failed`);
      }
      console.log("[Google OAuth Callback] Token exchange successful");

      const tokens = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokens;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      // Fetch Google account info to get the account ID
      let googleAccountId = null;
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          googleAccountId = userInfo.id || userInfo.email;
          console.log(`[Google OAuth] Got Google account ID: ${googleAccountId}`);
        }
      } catch (err) {
        console.log('[Google OAuth] Could not fetch user info, continuing without account ID');
      }

      await storage.updateRestaurant(restaurantId!, {
        googleAccessToken: access_token,
        googleRefreshToken: refresh_token,
        googleTokenExpiresAt: expiresAt,
        googleAccountId: googleAccountId,
        isConnected: true,
      });

      console.log(`[Google OAuth] Successfully connected restaurant ${restaurantId}`);
      res.redirect(`${redirectBase}?success=connected`);
    } catch (error: any) {
      console.error("[OAuth] Callback error:", error);
      res.redirect('/restaurants?error=callback_failed');
    }
  });

  app.post("/api/google/disconnect/:restaurantId", isAuthenticated, async (req: any, res) => {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.claims.sub;

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.userId !== userId) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurantId, {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        googleAccountId: null,
        googleLocationId: null,
        isConnected: false,
      });

      console.log(`[Google OAuth] Disconnected restaurant ${restaurantId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Google OAuth] Disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Google account" });
    }
  });

  app.get("/api/google/status", isAuthenticated, async (req, res) => {
    const config = getGoogleOAuthConfig();
    res.json({
      configured: !!config,
      message: config
        ? "Google OAuth is configured"
        : "Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
    });
  });
}
