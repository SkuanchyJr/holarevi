export type PlanId = "local" | "pro" | "business" | "enterprise";

export type BillingCycle = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
    stripePriceIds: {
      monthly: string;
      yearly: string;
    };
  };
  limits: {
    maxLocations: number | "unlimited";
    maxRepliesPerMonth: number | "unlimited";
    maxTeamMembers: number | "unlimited";
    maxTonePresets: number | "unlimited";
  };
  features: string[];
  hasYearly: boolean;
  isCustomPricing: boolean;
  isPopular: boolean;
  trialAllowed: boolean;
  extraLocationPrice?: number;
};

export const PLANS: Record<PlanId, Plan> = {
  local: {
    id: "local",
    name: "Local",
    description: "Perfect for single-location restaurants.",
    price: {
      monthly: 49,
      yearly: 470,
      currency: "EUR",
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
      monthly: 99,
      yearly: 950,
      currency: "EUR",
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
      monthly: 199,
      yearly: 1910,
      currency: "EUR",
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
      "+€39/month per extra location",
      "1000 AI replies/month",
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
    extraLocationPrice: 39,
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
