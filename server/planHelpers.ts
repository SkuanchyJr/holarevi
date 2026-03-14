import { PLANS, getPlanLimits, isUnlimited, type PlanId, type BillingCycle } from "@shared/plans";
import type { User } from "@shared/schema";

export const PLAN_ERROR_CODES = {
  LOCATION_LIMIT_REACHED: "location_limit_reached",
  REPLY_LIMIT_REACHED: "reply_limit_reached",
  TEAM_LIMIT_REACHED: "team_limit_reached",
  TONE_PRESET_LIMIT_REACHED: "tone_preset_limit_reached",
  FEATURE_NOT_IN_PLAN: "feature_not_in_plan",
} as const;

export interface PlanCheckResult {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
  limit?: number | "unlimited";
  current?: number;
}

export function isTrialUser(user: User): boolean {
  return false;
}

export function getEffectivePlanId(user: User): PlanId {
  const status = user.subscriptionStatus || "pending";
  const planId = (user.subscriptionPlan as PlanId) || "local";
  
  if (status === "active" || status === "past_due" || status === "trialing" || status === "trial") {
    return planId;
  }
  
  return "local";
}

export function canAddLocation(user: User, currentLocations: number): PlanCheckResult {
  const planId = getEffectivePlanId(user);
  const limits = getPlanLimits(planId);
  
  if (isUnlimited(limits.maxLocations as any)) {
    return { allowed: true, limit: "unlimited", current: currentLocations };
  }
  
  let maxAllowed = limits.maxLocations as number;
  
  if (planId === "business" && user.extraLocations) {
    maxAllowed += user.extraLocations;
  }
  
  const allowed = currentLocations < maxAllowed;
  
  return {
    allowed,
    reason: allowed ? undefined : `Your ${PLANS[planId].name} plan allows up to ${maxAllowed} locations. Please upgrade to add more.`,
    errorCode: allowed ? undefined : PLAN_ERROR_CODES.LOCATION_LIMIT_REACHED,
    limit: maxAllowed,
    current: currentLocations,
  };
}

export function canAddTeamMember(user: User, currentTeamMembers: number): PlanCheckResult {
  const planId = getEffectivePlanId(user);
  const limits = getPlanLimits(planId);
  
  if (isUnlimited(limits.maxTeamMembers)) {
    return { allowed: true, limit: "unlimited", current: currentTeamMembers };
  }
  
  const maxAllowed = limits.maxTeamMembers as number;
  const allowed = currentTeamMembers < maxAllowed;
  
  return {
    allowed,
    reason: allowed ? undefined : `Your ${PLANS[planId].name} plan allows up to ${maxAllowed} team members. Please upgrade to add more.`,
    errorCode: allowed ? undefined : PLAN_ERROR_CODES.TEAM_LIMIT_REACHED,
    limit: maxAllowed,
    current: currentTeamMembers,
  };
}

export function shouldResetMonthlyReplies(user: User): boolean {
  if (!user.monthlyRepliesPeriodStart) {
    return true;
  }
  
  const periodStart = new Date(user.monthlyRepliesPeriodStart);
  const now = new Date();
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor((now.getTime() - periodStart.getTime()) / msPerDay);
  
  return daysElapsed >= 30;
}

export function getNextBillingPeriodStart(user: User): Date {
  if (!user.monthlyRepliesPeriodStart) {
    return new Date();
  }
  
  const periodStart = new Date(user.monthlyRepliesPeriodStart);
  const nextPeriod = new Date(periodStart);
  nextPeriod.setDate(nextPeriod.getDate() + 30);
  return nextPeriod;
}

export function getMonthlyReplyUsage(user: User): { used: number; needsReset: boolean } {
  if (shouldResetMonthlyReplies(user)) {
    return { used: 0, needsReset: true };
  }
  return { used: user.monthlyRepliesUsed || 0, needsReset: false };
}

export function canSendReply(user: User): PlanCheckResult {
  const { used, needsReset } = getMonthlyReplyUsage(user);
  const currentUsed = needsReset ? 0 : used;
  
  const planId = getEffectivePlanId(user);
  const limits = getPlanLimits(planId);
  
  if (isUnlimited(limits.maxRepliesPerMonth)) {
    return { allowed: true, limit: "unlimited", current: currentUsed };
  }
  
  const maxAllowed = limits.maxRepliesPerMonth as number;
  const allowed = currentUsed < maxAllowed;
  
  return {
    allowed,
    reason: allowed ? undefined : `You've reached your monthly limit of ${maxAllowed} AI replies. Please upgrade for more replies.`,
    errorCode: allowed ? undefined : PLAN_ERROR_CODES.REPLY_LIMIT_REACHED,
    limit: maxAllowed,
    current: currentUsed,
  };
}

export function canAddTonePreset(user: User, currentPresets: number): PlanCheckResult {
  const planId = getEffectivePlanId(user);
  const limits = getPlanLimits(planId);
  
  if (isUnlimited(limits.maxTonePresets)) {
    return { allowed: true, limit: "unlimited", current: currentPresets };
  }
  
  const maxAllowed = limits.maxTonePresets as number;
  const allowed = currentPresets < maxAllowed;
  
  return {
    allowed,
    reason: allowed ? undefined : `Your ${PLANS[planId].name} plan allows up to ${maxAllowed} tone presets. Please upgrade to add more.`,
    errorCode: allowed ? undefined : PLAN_ERROR_CODES.TONE_PRESET_LIMIT_REACHED,
    limit: maxAllowed,
    current: currentPresets,
  };
}

const FEATURE_ACCESS_MAP: Record<string, PlanId[]> = {
  "monthly_reporting": ["business", "enterprise"],
  "gdpr_compliance": ["business", "enterprise"],
  "multi_location_dashboard": ["business", "enterprise"],
  "permission_controls": ["business", "enterprise"],
  "analytics_export": ["business", "enterprise"],
  "instagram_replies": ["business", "enterprise"],
  "whatsapp_replies": ["business", "enterprise"],
  "tripadvisor_replies": ["business", "enterprise"],
  "priority_support": ["pro", "business", "enterprise"],
  "advanced_analytics": ["pro", "business", "enterprise"],
  "faster_ai": ["pro", "business", "enterprise"],
  "tone_personalization": ["pro", "business", "enterprise"],
  "auto_reply": ["local", "pro", "business", "enterprise"],
  "api_access": ["enterprise"],
};

export function hasFeature(user: User, feature: string): boolean {
  const planId = getEffectivePlanId(user);
  
  const allowedPlans = FEATURE_ACCESS_MAP[feature];
  if (!allowedPlans) return true;
  
  return allowedPlans.includes(planId);
}

export function hasAdvancedAnalytics(user: User): boolean {
  return hasFeature(user, "advanced_analytics");
}

export function hasMultiLocationDashboard(user: User): boolean {
  return hasFeature(user, "multi_location_dashboard");
}

export function hasAnalyticsExport(user: User): boolean {
  return hasFeature(user, "analytics_export");
}

export function hasApiAccess(user: User): boolean {
  return hasFeature(user, "api_access");
}

export function canAccessAdvancedAnalytics(user: User): PlanCheckResult {
  const allowed = hasAdvancedAnalytics(user);
  const planId = getEffectivePlanId(user);
  
  return {
    allowed,
    reason: allowed ? undefined : `Advanced analytics is not available on your ${PLANS[planId].name} plan. Upgrade to Pro or Business to access.`,
    errorCode: allowed ? undefined : PLAN_ERROR_CODES.FEATURE_NOT_IN_PLAN,
  };
}

export function canAccessMultiLocationDashboard(user: User): PlanCheckResult {
  const allowed = hasMultiLocationDashboard(user);
  const planId = getEffectivePlanId(user);
  
  return {
    allowed,
    reason: allowed ? undefined : `Multi-location dashboard is only available on the Business plan. Upgrade to access.`,
    errorCode: allowed ? undefined : PLAN_ERROR_CODES.FEATURE_NOT_IN_PLAN,
  };
}

export function getUserPlanInfo(user: User) {
  const planId = getEffectivePlanId(user);
  const plan = PLANS[planId];
  const limits = getPlanLimits(planId);
  const isTrial = isTrialUser(user);
  
  let effectiveMaxLocations = limits.maxLocations;
  if (planId === "business" && typeof limits.maxLocations === "number") {
    effectiveMaxLocations = limits.maxLocations + (user.extraLocations || 0);
  }
  
  const replyLimit = limits.maxRepliesPerMonth;
  
  return {
    planId,
    planName: plan?.name || "No Plan",
    isTrial,
    limits: {
      ...limits,
      maxLocations: effectiveMaxLocations,
      maxRepliesPerMonth: replyLimit,
    },
    billingCycle: (user.billingCycle as BillingCycle) || "monthly",
    extraLocations: user.extraLocations || 0,
    status: user.subscriptionStatus || "trial",
    trialEndsAt: user.trialEndsAt,
    features: {
      hasAdvancedAnalytics: hasAdvancedAnalytics(user),
      hasMultiLocationDashboard: hasMultiLocationDashboard(user),
      hasAnalyticsExport: hasAnalyticsExport(user),
      hasApiAccess: hasApiAccess(user),
      hasFasterAi: hasFeature(user, "faster_ai"),
      hasPrioritySupport: hasFeature(user, "priority_support"),
      hasInstagramReplies: hasFeature(user, "instagram_replies"),
      hasWhatsappReplies: hasFeature(user, "whatsapp_replies"),
      hasTripadvisorReplies: hasFeature(user, "tripadvisor_replies"),
    },
    usage: {
      monthlyRepliesUsed: user.monthlyRepliesUsed || 0,
      monthlyRepliesPeriodStart: user.monthlyRepliesPeriodStart,
    },
  };
}

export function calculateTotalLocationsAllowed(user: User): number | "unlimited" {
  const planId = getEffectivePlanId(user);
  const limits = getPlanLimits(planId);
  
  if (isUnlimited(limits.maxLocations as any)) {
    return "unlimited";
  }
  
  let total = limits.maxLocations as number;
  
  if (planId === "business" && user.extraLocations) {
    total += user.extraLocations;
  }
  
  return total;
}

export function canAddExtraLocation(user: User): boolean {
  const planId = getEffectivePlanId(user);
  return planId === "business";
}
