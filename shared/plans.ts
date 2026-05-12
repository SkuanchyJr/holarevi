export type PlanId = "local" | "pro" | "business" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface PlanLimits {
  maxLocations: number;
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
  /** Pre-discount price, kept for "before / now" price contrast in the UI. */
  previousMonthly?: number;
  previousYearly?: number;
  currency: string;
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
}

/** Permanent price-cut applied to every plan (percentage off the old price). */
export const PERMANENT_DISCOUNT_PERCENT = 90;

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: PlanPrice;
  limits: PlanLimits;
  features: string[];
  hasYearly: boolean;
  isCustomPricing: boolean;
  isPopular: boolean;
  trialAllowed: boolean;
  extraLocationPrice?: number;
}

// ──────────────────────────────────────────────────────────────────────────
// PRICING NOTE — PERMANENT -90% PRICE CUT (May 2026)
// All plan prices below were reduced by 90% (e.g. Local 49€ → 4,90€/mo).
// `stripePriceIds` still point at the OLD Stripe Prices. Before this goes to
// production you MUST create new Stripe Prices that match the amounts here and
// replace the IDs below, otherwise checkout will charge the old amounts.
// The same applies to the server-side "extra location" add-on price in
// server/routes.ts (currently unit_amount: 3900 → should become 390).
// ──────────────────────────────────────────────────────────────────────────

export const TRIAL_CONFIG = {
  trialDays: 3, // Local plan trial duration (managed by Stripe)
  maxTrialReplies: 10, // Limited trial experience
};

export const PRO_TRIAL_CONFIG = {
  trialDays: 3, // Pro plan trial duration (2 days)
  maxTrialReplies: 100, // More generous for Pro trial
};

export const PLANS: Record<PlanId, Plan> = {
  local: {
    id: "local",
    name: "Local",
    description: "Perfect for single-location restaurants.",
    price: {
      monthly: 4.9,
      yearly: 47,
      previousMonthly: 49,
      previousYearly: 470,
      currency: "EUR",
      // TODO(pricing): replace with the new -90% Stripe Price IDs before going live.
      stripePriceIds: {
        monthly: "price_1SeggpCWGp48IrUqKKOzqamR",
        yearly: "price_1SkUlcCWGp48IrUqVLKjDbFq",
      },
    },
    limits: {
      maxLocations: 1,
      maxRepliesPerMonth: 100,
      maxTeamMembers: 1,
      maxTonePresets: 1,
    },
    features: [
      "1 Google location",
      "100 AI replies/month",
      "Manual or auto-reply",
      "1 user",
      "1 tone preset",
      "Weekly performance report",
      "Negative review alerts",
      "AI executive summary, emails, etc.",
    ],
    hasYearly: true,
    isCustomPricing: false,
    isPopular: false,
    trialAllowed: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing restaurant groups.",
    price: {
      monthly: 9.9,
      yearly: 95,
      previousMonthly: 99,
      previousYearly: 950,
      currency: "EUR",
      // TODO(pricing): replace with the new -90% Stripe Price IDs before going live.
      stripePriceIds: {
        monthly: "price_1SkU3TCWGp48IrUqyRn3Oah2",
        yearly: "price_1SkUkqCWGp48IrUqtvbzyOT3",
      },
    },
    limits: {
      maxLocations: 5,
      maxRepliesPerMonth: 300,
      maxTeamMembers: 3,
      maxTonePresets: 5,
    },
    features: [
      "Up to 5 locations",
      "300 AI replies/month",
      "Analytics & sentiment",
      "Faster performance",
      "Priority reply engine",
      "3 users",
      "5 tone presets",
      "Priority email/WhatsApp support",
      "AI executive summary, emails, etc.",
    ],
    hasYearly: true,
    isCustomPricing: false,
    isPopular: true,
    trialAllowed: false,
  },
  business: {
    id: "business",
    name: "Business",
    description: "For multi-location chains.",
    price: {
      monthly: 19.9,
      yearly: 191,
      previousMonthly: 199,
      previousYearly: 1910,
      currency: "EUR",
      // TODO(pricing): replace with the new -90% Stripe Price IDs before going live.
      stripePriceIds: {
        monthly: "price_1SkUKbCWGp48IrUqdNXhOqkS",
        yearly: "price_1SkUj8CWGp48IrUqQYuEMtpv",
      },
    },
    limits: {
      maxLocations: 5,
      maxRepliesPerMonth: 1000,
      maxTeamMembers: "unlimited",
      maxTonePresets: "unlimited",
    },
    features: [
      "5 locations included",
      "+€3.90/month per extra location",
      "1000 AI replies/month",
      "WhatsApp Business auto-replies",
      "TripAdvisor auto-replies",
      "Multi-location dashboard",
      "Unlimited team members",
      "Permission controls",
      "SLA & priority support",
      "GDPR & compliance tools",
      "Custom onboarding",
      "Dedicated success manager",
      "AI executive summary, emails, etc.",
    ],
    hasYearly: true,
    isCustomPricing: false,
    isPopular: false,
    trialAllowed: false,
    extraLocationPrice: 3.9,
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
      maxLocations: 999,
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
      "AI executive summary, emails, etc.",
    ],
    hasYearly: false,
    isCustomPricing: true,
    isPopular: false,
    trialAllowed: false,
  },
};

export const PLAN_IDS: PlanId[] = ["local", "pro", "business", "enterprise"];

export function getPlan(planId: PlanId): Plan {
  return PLANS[planId];
}

export function getPlanPrice(
  planId: PlanId,
  billingCycle: BillingCycle,
): number {
  const plan = PLANS[planId];
  if (plan.isCustomPricing) return 0;
  return billingCycle === "yearly" ? plan.price.yearly : plan.price.monthly;
}

export function getPlanMonthlyEquivalent(
  planId: PlanId,
  billingCycle: BillingCycle,
): number {
  const plan = PLANS[planId];
  if (plan.isCustomPricing) return 0;
  if (billingCycle === "yearly") {
    return Math.round((plan.price.yearly / 12) * 100) / 100;
  }
  return plan.price.monthly;
}

// Pre-discount ("before") monthly-equivalent price, used for "was X / now Y" UI.
// Falls back to 10x the current price if no explicit previous price is set.
export function getPlanPreviousMonthlyEquivalent(
  planId: PlanId,
  billingCycle: BillingCycle,
): number {
  const plan = PLANS[planId];
  if (plan.isCustomPricing) return 0;
  if (billingCycle === "yearly") {
    const prevYearly =
      plan.price.previousYearly ?? plan.price.yearly * (100 / (100 - PERMANENT_DISCOUNT_PERCENT));
    return Math.round((prevYearly / 12) * 100) / 100;
  }
  return (
    plan.price.previousMonthly ?? plan.price.monthly * (100 / (100 - PERMANENT_DISCOUNT_PERCENT))
  );
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
  const planIds: PlanId[] = ["local", "pro", "business", "enterprise"];
  
  for (const planId of planIds) {
    const plan = PLANS[planId];
    if (plan.isCustomPricing) continue;
    
    if (plan.price.stripePriceIds.monthly === priceId) {
      return { planId, billingCycle: "monthly" };
    }
    if (plan.price.stripePriceIds.yearly === priceId) {
      return { planId, billingCycle: "yearly" };
    }
  }
  
  return null;
}

export const YEARLY_DISCOUNT_PERCENT = 20;
