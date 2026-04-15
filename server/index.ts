import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import path from "path";
import { initReviewSyncJob } from "./jobs/reviewSync";
import { initWeeklyEmailScheduler } from "./jobs/weeklyEmailScheduler";
import { fixOnboardingData } from "./migrations/fix-onboarding-data";

const app = express();
const httpServer = createServer(app);

const isDev = process.env.NODE_ENV !== "production";
app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://*.googleapis.com", "wss:"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message} `);
}

// Initialize Stripe schema and sync data on startup
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log("DATABASE_URL not set, skipping Stripe initialization", "stripe");
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    log("STRIPE_SECRET_KEY not set, skipping Stripe initialization", "stripe");
    return;
  }

  try {
    log("Initializing Stripe schema...", "stripe");
    await runMigrations({
      databaseUrl,
    });
    log("Stripe schema ready", "stripe");

    // Get StripeSync instance
    const stripeSync = await getStripeSync();

    // Set up managed webhook
    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) {
      log("Setting up managed webhook...", "stripe");
      const webhookBaseUrl = `https://${replitDomains.split(",")[0]}`;
      const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`,
        {
          enabled_events: ["*"],
          description: "Managed webhook for HolaRevi",
        },
      );
      log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`, "stripe");
    }

    // Sync all existing Stripe data in background
    log("Syncing Stripe data...", "stripe");
    stripeSync
      .syncBackfill()
      .then(() => {
        log("Stripe data synced", "stripe");
      })
      .catch((err: any) => {
        log(`Error syncing Stripe data: ${err.message}`, "stripe");
      });
  } catch (error: any) {
    log(`Failed to initialize Stripe: ${error.message}`, "stripe");
  }
}

// Register Stripe webhook route BEFORE express.json()
// This is critical - webhook needs raw Buffer, not parsed JSON
app.post(
  "/api/stripe/webhook/:uuid",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        log("Webhook body is not a Buffer", "stripe");
        return res.status(500).json({ error: "Webhook processing error" });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error: any) {
      log(`Webhook error: ${error.message}`, "stripe");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

// Now apply JSON middleware for all other routes
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await fixOnboardingData();

  // Initialize Stripe before routes
  await initStripe();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(server, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  // Initialize background jobs
  initReviewSyncJob();
  initWeeklyEmailScheduler(app);

  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
