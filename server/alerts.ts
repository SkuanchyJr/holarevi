import { Router } from "express";
import { db } from "./db";
import { alerts, reviews } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { isAuthenticated } from "./auth";

export const alertsRouter = Router();

// Retrieve unresolved alerts
alertsRouter.get("/", isAuthenticated, async (req, res) => {
    try {
        const userAlerts = await db.query.alerts.findMany({
            where: and(
                eq(alerts.userId, req.session.userId!),
                eq(alerts.resolved, false)
            ),
            orderBy: [desc(alerts.createdAt)],
            with: {
                review: true
            }
        });

        res.json(userAlerts);
    } catch (error) {
        console.error("[Alerts Fetch Error]", error);
        res.status(500).json({ error: "Failed to fetch alerts" });
    }
});

// Mark alert as resolved
alertsRouter.post("/:id/resolve", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const hit = await db.query.alerts.findFirst({
            where: and(eq(alerts.id, id), eq(alerts.userId, req.session.userId!))
        });

        if (!hit) {
            return res.status(404).json({ error: "Alert not found or unauthorized" });
        }

        const [updated] = await db.update(alerts)
            .set({ resolved: true })
            .where(eq(alerts.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("[Alert Resolve Error]", error);
        res.status(500).json({ error: "Failed to resolve alert" });
    }
});
