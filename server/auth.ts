import type { Express, RequestHandler } from "express";
import session from "express-session";

declare module "express-session" {
    interface SessionData {
        userId: string;
        isDemo?: boolean;
        affiliateIdForDemo?: string;
    }
}
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "../shared/schema";
import {
    generateVerificationToken,
    sendVerificationEmail,
    VERIFICATION_TOKEN_TTL_HOURS,
} from "./jobs/verificationEmail";

export function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: "sessions",
    });
    return session({
        secret: process.env.SESSION_SECRET || "dev-local-secret-key-fallback",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: sessionTtl,
        },
    });
}

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { message: "Too many login attempts, please try again after a minute" },
});

const resendVerificationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { message: "Too many verification email requests. Please wait a minute." },
});

const signupSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    language: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

const resendSchema = z.object({
    email: z.string().email("Invalid email format"),
    language: z.string().optional(),
});

function getAppUrl(): string {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    if (process.env.NODE_ENV === "production") return "https://holarevi.com";
    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) return `https://${replitDomains.split(",")[0]}`;
    return "https://holarevi.com";
}

async function issueVerification(userId: string, email: string, firstName: string | null, language: string | null) {
    const { token, expiresAt } = generateVerificationToken();
    await db
        .update(users)
        .set({
            emailVerificationToken: token,
            emailVerificationExpiresAt: expiresAt,
            emailVerified: false,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    await sendVerificationEmail({ to: email, firstName, token, language });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = {
        claims: {
            sub: user.id,
            email: user.email,
        },
    };
    next();
};

export async function setupAuth(app: Express) {
    app.set("trust proxy", 1);
    app.use(getSession());

    app.post("/api/auth/signup", async (req, res) => {
        try {
            const data = signupSchema.parse(req.body);
            const language = data.language === "en" ? "en" : "es";

            const existingUser = await storage.getUserByEmail(data.email);
            if (existingUser) {
                return res.status(409).json({ message: "Email already exists" });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(data.password, salt);

            const user = await storage.createUser({
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                profileImageUrl: "",
                subscriptionStatus: "pending",
                subscriptionPlan: null,
                trialEndsAt: null,
                emailLanguage: language,
                emailVerified: false,
            });

            try {
                await issueVerification(user.id, user.email!, user.firstName ?? null, language);
            } catch (err: any) {
                console.error("[Signup] Failed to send verification email:", err?.message || err);
                // Roll back: remove the user so the email is free to retry signup later.
                await db.delete(users).where(eq(users.id, user.id));
                return res.status(502).json({
                    message: "We couldn't send the verification email. Please try again in a moment.",
                });
            }

            return res.status(201).json({
                message: "Signup successful. Please check your email to verify your account.",
                requiresVerification: true,
                email: user.email,
            });
        } catch (error: any) {
            console.error("[Signup Error]:", error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    app.post("/api/auth/login", loginLimiter, async (req, res) => {
        try {
            const data = loginSchema.parse(req.body);

            const user = await storage.getUserByEmail(data.email);
            if (!user) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            if (!user.passwordHash) {
                return res.status(403).json({ message: "Account requires password setup." });
            }

            const isMatch = await bcrypt.compare(data.password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            if (user.emailVerified === false) {
                return res.status(403).json({
                    message: "Please verify your email before logging in.",
                    code: "EMAIL_NOT_VERIFIED",
                    email: user.email,
                });
            }

            req.session.userId = user.id;
            req.session.isDemo = false;
            req.session.affiliateIdForDemo = undefined;
            return res.json({
                message: "Login successful",
                user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    app.post("/api/auth/logout", (req, res) => {
        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            return res.json({ message: "Logged out successfully" });
        });
    });

    app.get("/api/auth/user", async (req, res) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const safeUser = { ...user };
        delete (safeUser as any).passwordHash;
        delete (safeUser as any).emailVerificationToken;

        if (safeUser.subscriptionStatus) {
            (safeUser as Record<string, unknown>).subscriptionStatus = safeUser.subscriptionStatus.trim();
        }

        (safeUser as Record<string, unknown>).isDemo = !!req.session.isDemo;

        return res.json(safeUser);
    });

    // Verify email link (clicked from inbox)
    app.get("/api/auth/verify-email", async (req, res) => {
        const token = String(req.query.token || "");
        const baseUrl = getAppUrl();
        const fallbackLang = "es";

        if (!token) {
            return res.redirect(`${baseUrl}/${fallbackLang}/auth?verified=invalid`);
        }
        try {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.emailVerificationToken, token));

            if (!user) {
                return res.redirect(`${baseUrl}/${fallbackLang}/auth?verified=invalid`);
            }

            const lang = user.emailLanguage === "en" ? "en" : "es";

            if (user.emailVerified) {
                return res.redirect(`${baseUrl}/${lang}/auth?verified=already`);
            }

            if (user.emailVerificationExpiresAt && new Date(user.emailVerificationExpiresAt) < new Date()) {
                return res.redirect(`${baseUrl}/${lang}/auth?verified=expired&email=${encodeURIComponent(user.email || "")}`);
            }

            await db
                .update(users)
                .set({
                    emailVerified: true,
                    emailVerificationToken: null,
                    emailVerificationExpiresAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));

            return res.redirect(`${baseUrl}/${lang}/auth?verified=success`);
        } catch (error: any) {
            console.error("[VerifyEmail] Error:", error?.message || error);
            return res.redirect(`${baseUrl}/${fallbackLang}/auth?verified=error`);
        }
    });

    // Resend verification email (rate-limited)
    app.post("/api/auth/resend-verification", resendVerificationLimiter, async (req, res) => {
        try {
            const data = resendSchema.parse(req.body);
            const language = data.language === "en" ? "en" : "es";
            const user = await storage.getUserByEmail(data.email);

            // Always respond success to avoid email enumeration.
            if (!user || user.emailVerified) {
                return res.json({ success: true });
            }

            await issueVerification(user.id, user.email!, user.firstName ?? null, language);
            return res.json({ success: true, ttlHours: VERIFICATION_TOKEN_TTL_HOURS });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("[ResendVerification] Error:", error?.message || error);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
}
