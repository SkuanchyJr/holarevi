export type PlanId = "free" | "local" | "pro" | "business" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface PlanLimits {
  maxLocations: number | "unlimited";
  maxRepliesPerMonth: number | "unlimited";
  maxTeamMembers: number | "unlimited";
  maxTonePresets: number | "unlimited";
}

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanPrice {
  monthly: number;
  yearly: number;
  currency: string;
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: PlanPrice;
  limits: PlanLimits;
  features: string[];
  hasYearly: boolean;
  isCustomPricing: boolean;
  /** True for the no-charge plan: never goes through Stripe checkout. */
  isFree: boolean;
  isPopular: boolean;
  trialAllowed: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// ⚠️ STRIPE PRICE IDS — ACTION REQUIRED BEFORE THIS REACHES PRODUCTION ⚠️
// The amounts below (Local 14€, Pro 39€, Business 99€ — monthly; 10× that per
// year) DO NOT match the Stripe Prices the IDs below point at (those are the
// old 49/99/199€ Prices). You MUST create new Stripe Prices for these amounts
// and replace every `stripePriceIds` value, or checkout will charge the wrong
// amount. Yearly = monthly × 10 (i.e. "2 months free").
// ──────────────────────────────────────────────────────────────────────────

export const TRIAL_CONFIG = {
  trialDays: 14, // Full-experience trial on Local and Pro (managed by Stripe, card required)
  maxTrialReplies: 100, // Generous cap so a real restaurant can evaluate the product
};

export const PRO_TRIAL_CONFIG = {
  trialDays: 14,
  maxTrialReplies: 100,
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Connect Google and see the value — no card required.",
    price: {
      monthly: 0,
      yearly: 0,
      currency: "EUR",
      stripePriceIds: {
        monthly: "",
        yearly: "",
      },
    },
    limits: {
      maxLocations: 1,
      maxRepliesPerMonth: 0, // AI replies are gated — upgrade to generate/post
      maxTeamMembers: 1,
      maxTonePresets: 1,
    },
    features: [
      "1 Google location",
      "All your reviews in one dashboard",
      "Sentiment & theme analysis",
      "Monthly AI executive summary",
      "Weekly performance email",
    ],
    hasYearly: false,
    isCustomPricing: false,
    isFree: true,
    isPopular: false,
    trialAllowed: false,
  },
  local: {
    id: "local",
    name: "Local",
    description: "For a single-location restaurant.",
    price: {
      monthly: 14,
      yearly: 140,
      currency: "EUR",
      // TODO(pricing): replace with the Stripe Price IDs for 14€/mo and 140€/yr.
      stripePriceIds: {
        monthly: "price_1SeggpCWGp48IrUqKKOzqamR",
        yearly: "price_1SkUlcCWGp48IrUqVLKjDbFq",
      },
    },
    limits: {
      maxLocations: 1,
      maxRepliesPerMonth: "unlimited",
      maxTeamMembers: 1,
      maxTonePresets: 1,
    },
    features: [
      "1 Google location",
      "Unlimited AI replies",
      "Auto-post or review before publishing",
      "Reply to old reviews",
      "1 user",
      "Brand tone presets",
      "Negative review alerts",
      "AI executive summary + weekly email",
    ],
    hasYearly: true,
    isCustomPricing: false,
    isFree: false,
    isPopular: false,
    trialAllowed: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For groups of up to 5 locations.",
    price: {
      monthly: 39,
      yearly: 390,
      currency: "EUR",
      // TODO(pricing): replace with the Stripe Price IDs for 39€/mo and 390€/yr.
      stripePriceIds: {
        monthly: "price_1SkU3TCWGp48IrUqyRn3Oah2",
        yearly: "price_1SkUkqCWGp48IrUqtvbzyOT3",
      },
    },
    limits: {
      maxLocations: 5,
      maxRepliesPerMonth: "unlimited",
      maxTeamMembers: 5,
      maxTonePresets: 5,
    },
    features: [
      "Up to 5 locations",
      "Unlimited AI replies",
      "Multi-location dashboard",
      "Up to 5 users",
      "5 brand tone presets",
      "Per-location controls",
      "Priority support",
      "Everything in Local",
    ],
    hasYearly: true,
    isCustomPricing: false,
    isFree: false,
    isPopular: true,
    trialAllowed: true,
  },
  business: {
    id: "business",
    name: "Business",
    description: "For chains and multi-location operations.",
    price: {
      monthly: 99,
      yearly: 990,
      currency: "EUR",
      // TODO(pricing): replace with the Stripe Price IDs for 99€/mo and 990€/yr.
      stripePriceIds: {
        monthly: "price_1SkUKbCWGp48IrUqdNXhOqkS",
        yearly: "price_1SkUj8CWGp48IrUqQYuEMtpv",
      },
    },
    limits: {
      maxLocations: "unlimited",
      maxRepliesPerMonth: "unlimited",
      maxTeamMembers: "unlimited",
      maxTonePresets: "unlimited",
    },
    features: [
      "Unlimited locations",
      "Unlimited AI replies",
      "Advanced multi-location dashboard",
      "Unlimited users & tone presets",
      "Roles & permission controls",
      "WhatsApp & TripAdvisor auto-replies",
      "SLA & priority support",
      "Dedicated onboarding & success manager",
      "Everything in Pro",
    ],
    hasYearly: true,
    isCustomPricing: false,
    isFree: false,
    isPopular: false,
    trialAllowed: false,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations.",
    price: {
      monthly: 0,
      yearly: 0,
      currency: "EUR",
      stripePriceIds: {
        monthly: "price_enterprise_monthly",
        yearly: "price_enterprise_yearly",
      },
    },
    limits: {
      maxLocations: "unlimited",
      maxRepliesPerMonth: "unlimited",
      maxTeamMembers: "unlimited",
      maxTonePresets: "unlimited",
    },
    features: [
      "API access",
      "CRM integrations",
      "Custom automations",
      "Audit logs",
      "Advanced reporting",
      "SLA",
      "Account manager",
      "Custom onboarding",
      "Everything in Business",
    ],
    hasYearly: false,
    isCustomPricing: true,
    isFree: false,
    isPopular: false,
    trialAllowed: false,
  },
};

export const PLAN_IDS: PlanId[] = ["free", "local", "pro", "business", "enterprise"];

/** Plan ids that can be purchased via self-serve Stripe checkout. */
export const PURCHASABLE_PLAN_IDS: PlanId[] = ["local", "pro", "business"];

export function getPlan(planId: PlanId): Plan {
  return PLANS[planId];
}

export function getPlanPrice(
  planId: PlanId,
  billingCycle: BillingCycle,
): number {
  const plan = PLANS[planId];
  if (plan.isCustomPricing || plan.isFree) return 0;
  return billingCycle === "yearly" ? plan.price.yearly : plan.price.monthly;
}

export function getPlanMonthlyEquivalent(
  planId: PlanId,
  billingCycle: BillingCycle,
): number {
  const plan = PLANS[planId];
  if (plan.isCustomPricing || plan.isFree) return 0;
  if (billingCycle === "yearly") {
    return Math.round((plan.price.yearly / 12) * 100) / 100;
  }
  return plan.price.monthly;
}

// Format a price number for display (no currency symbol; callers prefix "€").
// Keeps two decimals only when the amount has cents (4.9 → "4,90", 47 → "47").
export function formatPrice(amount: number, language: "es" | "en" = "es"): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getStripePriceId(
  planId: PlanId,
  billingCycle: BillingCycle,
): string {
  const plan = PLANS[planId];

  if (plan.isCustomPricing) {
    throw new Error(`Plan ${planId} uses custom pricing - contact sales`);
  }
  if (plan.isFree) {
    throw new Error(`Plan ${planId} is free - no Stripe checkout`);
  }

  const priceId = plan.price.stripePriceIds[billingCycle];

  if (!priceId || priceId === "") {
    throw new Error(
      `No Stripe price ID configured for ${planId} ${billingCycle}`,
    );
  }

  if (!priceId.startsWith("price_")) {
    throw new Error(
      `Invalid Stripe price ID format for ${planId} ${billingCycle}: ${priceId}`,
    );
  }

  return priceId;
}

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId].limits;
}

export function isUnlimited(value: number | "unlimited"): value is "unlimited" {
  return value === "unlimited";
}

// Derive planId and billingCycle from a Stripe price ID
// Returns null if priceId doesn't match any known plan
export function getPlanFromPriceId(priceId: string): { planId: PlanId; billingCycle: BillingCycle } | null {
  for (const planId of PURCHASABLE_PLAN_IDS) {
    const plan = PLANS[planId];

    if (plan.price.stripePriceIds.monthly === priceId) {
      return { planId, billingCycle: "monthly" };
    }
    if (plan.price.stripePriceIds.yearly === priceId) {
      return { planId, billingCycle: "yearly" };
    }
  }

  return null;
}

export const YEARLY_DISCOUNT_PERCENT = 17; // ≈ "2 months free" when yearly = monthly × 10
