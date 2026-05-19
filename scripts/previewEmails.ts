import { writeFileSync } from "fs";
import { generateFallbackEmail } from "../server/jobs/emailGenerator";
import type { WeeklyMetrics } from "../server/jobs/emailMetrics";

const metrics: WeeklyMetrics = {
  userName: "María",
  userEmail: "test@ejemplo.com",
  businessNames: ["Negocio de Prueba"],
  planName: "Pro",
  weekStart: "7 abril",
  weekEnd: "13 abril",
  weeksActive: 12,
  reviewsReceived: 0,
  autoResponded: 0,
  avgResponseTime: "n/a",
  currentRating: "4.6",
  previousWeekRating: "4.6",
  ratingChange: "sin cambios",
  negativeHandled: 0,
  totalManaged: 287,
  bestReview: "",
  requestsSent: null,
  conversionRate: null,
  hasActivity: false,
};

const result = generateFallbackEmail(metrics);
writeFileSync("/tmp/preview_weekly.html", result.html, "utf8");

const bytes = Buffer.byteLength(result.html, "utf8");
const firstLines = result.html.split("\n").slice(0, 20).join("\n");

console.log("SUBJECT:", result.subject);
console.log("BYTES:", bytes);
console.log("---FIRST 20 LINES---");
console.log(firstLines);
