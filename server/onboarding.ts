import { Router } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "./auth";

export const onboardingRouter = Router();

// Retrieve onboarding status
onboardingRouter.get("/status", isAuthenticated, async (req, res) => {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, req.session.userId!)
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            onboardingStep: user.onboardingStep,
            onboardingCompleted: user.onboardingCompleted
        });
    } catch (error) {
        console.error("[Onboarding Status Error]", error);
        res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
});

// Update onboarding step
onboardingRouter.post("/step", isAuthenticated, async (req, res) => {
    try {
        const { step, completed } = req.body;

        if (typeof step !== 'string' && typeof completed !== 'boolean') {
            return res.status(400).json({ error: "Invalid payload" });
        }

        const updates: any = {};
        if (step) updates.onboardingStep = step;
        if (completed !== undefined) updates.onboardingCompleted = completed;

        const [updatedUser] = await db.update(users)
            .set(updates)
            .where(eq(users.id, req.session.userId!))
            .returning();

        res.json({
            onboardingStep: updatedUser.onboardingStep,
            onboardingCompleted: updatedUser.onboardingCompleted
        });
    } catch (error) {
        console.error("[Onboarding Step Update Error]", error);
        res.status(500).json({ error: "Failed to update onboarding step" });
    }
});
