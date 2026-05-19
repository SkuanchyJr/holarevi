import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, restaurants, reviews } from "../shared/schema";
import { storage } from "./storage";

export const DEMO_USER_EMAIL = "demo@holarevi.com";

interface DemoReviewSeed {
  reviewerName: string;
  rating: number;
  comment: string;
  language: "es" | "en" | "ca";
  sentiment: "positive" | "neutral" | "negative";
  daysAgo: number;
  generatedReply?: string | null;
  postedReply?: string | null;
  replyStatus?: "pending" | "approved" | "posted" | "dismissed";
}

const DEMO_REVIEWS: DemoReviewSeed[] = [
  {
    reviewerName: "María González",
    rating: 5,
    comment:
      "¡Una experiencia increíble! El servicio fue impecable y la comida deliciosa. Los empleados muy atentos. Volveremos sin duda.",
    language: "es",
    sentiment: "positive",
    daysAgo: 1,
    replyStatus: "pending",
  },
  {
    reviewerName: "James Carter",
    rating: 4,
    comment:
      "Great atmosphere and friendly staff. The food was tasty although the wait was a bit long. Will come back.",
    language: "en",
    sentiment: "positive",
    daysAgo: 2,
    replyStatus: "pending",
  },
  {
    reviewerName: "Carlos Ramírez",
    rating: 2,
    comment:
      "La comida estaba fría cuando llegó a la mesa y tardaron mucho en atendernos. Esperaba más por el precio.",
    language: "es",
    sentiment: "negative",
    daysAgo: 3,
    replyStatus: "pending",
  },
  {
    reviewerName: "Anna Schmidt",
    rating: 5,
    comment:
      "Absolutely loved it! Best paella I've had in Barcelona. The service was top-notch.",
    language: "en",
    sentiment: "positive",
    daysAgo: 4,
    replyStatus: "pending",
  },
  {
    reviewerName: "Marc Puig",
    rating: 3,
    comment:
      "El menú està bé però la relació qualitat-preu es pot millorar. L'ambient agradable.",
    language: "ca",
    sentiment: "neutral",
    daysAgo: 5,
    replyStatus: "pending",
  },
  {
    reviewerName: "Lucía Fernández",
    rating: 5,
    comment:
      "Restaurante increíble. La pasta hecha en casa es espectacular y el postre, una delicia. ¡100% recomendado!",
    language: "es",
    sentiment: "positive",
    daysAgo: 7,
    generatedReply:
      "¡Hola Lucía! Mil gracias por tus palabras tan amables. Nos alegra muchísimo que disfrutases de la pasta casera y el postre. Te esperamos pronto de vuelta. Un abrazo del equipo.",
    replyStatus: "posted",
    postedReply:
      "¡Hola Lucía! Mil gracias por tus palabras tan amables. Nos alegra muchísimo que disfrutases de la pasta casera y el postre. Te esperamos pronto de vuelta. Un abrazo del equipo.",
  },
  {
    reviewerName: "David Lee",
    rating: 1,
    comment:
      "Terrible experience. The waiter ignored us for 30 minutes and the bill had charges we didn't order.",
    language: "en",
    sentiment: "negative",
    daysAgo: 9,
    replyStatus: "pending",
  },
  {
    reviewerName: "Sofía Martín",
    rating: 4,
    comment:
      "Buena cocina mediterránea, ambiente acogedor. El brunch del domingo es muy recomendable.",
    language: "es",
    sentiment: "positive",
    daysAgo: 12,
    replyStatus: "pending",
  },
];

async function ensureDemoUser() {
  const existing = await storage.getUserByEmail(DEMO_USER_EMAIL);
  if (existing) {
    // Make sure the demo user always has full access (in case fields drifted).
    if (
      existing.subscriptionStatus !== "active" ||
      existing.subscriptionPlan !== "business" ||
      !existing.onboardingCompleted ||
      !existing.emailVerified
    ) {
      await db
        .update(users)
        .set({
          subscriptionStatus: "active",
          subscriptionPlan: "business",
          billingCycle: "monthly",
          onboardingCompleted: true,
          onboardingStep: "completed",
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));
    }
    return (await storage.getUser(existing.id))!;
  }

  const passwordHash = await bcrypt.hash(
    "demo-account-no-login-" + Math.random().toString(36).slice(2),
    10,
  );

  return await storage.createUser({
    email: DEMO_USER_EMAIL,
    passwordHash,
    firstName: "Demo",
    lastName: "HolaRevi",
    profileImageUrl: "",
    subscriptionStatus: "active",
    subscriptionPlan: "business",
    billingCycle: "monthly",
    onboardingCompleted: true,
    onboardingStep: "completed",
    emailVerified: true,
    emailLanguage: "es",
  } as any);
}

async function ensureDemoRestaurant(userId: string) {
  const existing = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.userId, userId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(restaurants)
    .values({
      userId,
      name: "Restaurante Demo HolaRevi",
      address: "Carrer de Mallorca, 123, 08036 Barcelona",
      isConnected: false,
      autoPostEnabled: false,
      autoSyncReviews: false,
      toneOfVoice: "friendly",
    })
    .returning();
  return created;
}

async function ensureDemoReviews(restaurantId: string) {
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.restaurantId, restaurantId))
    .limit(1);
  if (existing.length > 0) return;

  const now = Date.now();
  const rows = DEMO_REVIEWS.map((r, idx) => ({
    restaurantId,
    googleReviewId: `demo-${restaurantId}-${idx}`,
    reviewerName: r.reviewerName,
    reviewerPhotoUrl: null,
    rating: r.rating,
    comment: r.comment,
    language: r.language,
    sentiment: r.sentiment,
    generatedReply: r.generatedReply ?? null,
    postedReply: r.postedReply ?? null,
    replyStatus: r.replyStatus ?? "pending",
    reviewedAt: new Date(now - r.daysAgo * 24 * 60 * 60 * 1000),
    repliedAt: r.postedReply ? new Date(now - (r.daysAgo - 1) * 24 * 60 * 60 * 1000) : null,
  }));

  await db.insert(reviews).values(rows as any).onConflictDoNothing();
}

export async function ensureDemoEnvironment() {
  const user = await ensureDemoUser();
  const restaurant = await ensureDemoRestaurant(user.id);
  await ensureDemoReviews(restaurant.id);
  return { user, restaurant };
}

export function isDemoEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === DEMO_USER_EMAIL;
}
