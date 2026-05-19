import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

const PRELAUNCH_CONFIG_KEY = "prelaunchEnabled";

const ALLOWED_PATHS = [
  "/prelaunch",
  "/admin",
  "/api/prelaunch-status",
  "/api/admin",
  "/privacy",
  "/terms",
  "/contact",
  "/google-permissions",
];

export async function isPrelaunchEnabled(): Promise<boolean> {
  const value = await storage.getConfig(PRELAUNCH_CONFIG_KEY);
  return value === "true";
}

export async function setPrelaunchEnabled(enabled: boolean): Promise<void> {
  await storage.setConfig(PRELAUNCH_CONFIG_KEY, enabled ? "true" : "false");
}

function isAllowedPath(path: string): boolean {
  const normalizedPath = path.split("?")[0];
  
  for (const allowed of ALLOWED_PATHS) {
    if (normalizedPath === allowed || normalizedPath.startsWith(allowed + "/")) {
      return true;
    }
  }
  
  if (normalizedPath.startsWith("/@") || 
      normalizedPath.startsWith("/node_modules") ||
      normalizedPath.startsWith("/src") ||
      normalizedPath.includes(".") && (
        normalizedPath.endsWith(".js") ||
        normalizedPath.endsWith(".ts") ||
        normalizedPath.endsWith(".tsx") ||
        normalizedPath.endsWith(".css") ||
        normalizedPath.endsWith(".svg") ||
        normalizedPath.endsWith(".png") ||
        normalizedPath.endsWith(".ico") ||
        normalizedPath.endsWith(".woff") ||
        normalizedPath.endsWith(".woff2") ||
        normalizedPath.endsWith(".ttf") ||
        normalizedPath.endsWith(".map")
      )) {
    return true;
  }
  
  return false;
}

export function createPrelaunchMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = req.path;
      
      // Always allow all API routes to pass through
      if (path.startsWith("/api/")) {
        return next();
      }
      
      // Allow static assets and specific paths
      if (isAllowedPath(path)) {
        return next();
      }
      
      const prelaunchActive = await isPrelaunchEnabled();
      
      if (!prelaunchActive) {
        return next();
      }
      
      // Only redirect GET requests for pages, not POST/OPTIONS/etc.
      if (req.method !== "GET") {
        return next();
      }
      
      return res.redirect("/prelaunch");
    } catch (error) {
      console.error("[Prelaunch Middleware] Error:", error);
      return next();
    }
  };
}
