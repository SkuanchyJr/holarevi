import type { Express, RequestHandler } from "express";
import session from "express-session";

declare module "express-session" {
    interface SessionData {
        userId: string;
    }
}
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { TRIAL_CONFIG } from "../shared/plans";

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

const signupSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // Populate req.user with claims shape expected by all route handlers
    // This bridges session-based auth with the legacy req.user.claims.sub pattern
    const user = await storage.getUser(req.session.userId);
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = {
        claims: {
            sub: user.id,
            email: user.email,
        }
    };
    next();
};

export async function setupAuth(app: Express) {
    app.set("trust proxy", 1);
    app.use(getSession());

    app.post("/api/auth/signup", async (req, res) => {
        try {
            const data = signupSchema.parse(req.body);

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
            });

            req.session.userId = user.id;
            return res.status(201).json({ message: "Signup successful", user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
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

            req.session.userId = user.id;
            return res.json({ message: "Login successful", user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
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

        return res.json(safeUser);
    });
}
