import { db } from "../db";
import { users, restaurants, reviews, pageViews } from "@shared/schema";
import { sql, count, eq, gte, and, desc, lt } from "drizzle-orm";

export interface OverviewMetrics {
  totalSignups: number;
  activePayingCustomers: number;
  totalAiReplies: number;
  averageRating: number;
  signupsChange: number;
  customersChange: number;
  repliesChange: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface DualChartDataPoint {
  date: string;
  signups: number;
  replies: number;
}

export interface TrafficMetrics {
  dailyVisits: number;
  weeklyVisits: number;
  dailySignups: number;
  weeklySignups: number;
  conversionRate: number;
  visitsChange: number;
  signupsChange: number;
  uniqueVisitors: number;
  bounceRate: number;
}

export interface VisitDataPoint {
  date: string;
  visits: number;
  signups: number;
}

export interface BillingMetrics {
  mrr: number;
  mrrChange: number;
  activeSubscriptions: number;
  newSubscriptionsThisMonth: number;
  churnedThisMonth: number;
  churnRate: number;
  planBreakdown: {
    plan: string;
    count: number;
    revenue: number;
  }[];
}

export interface MrrDataPoint {
  month: string;
  mrr: number;
}

export interface LocationMetrics {
  id: string;
  name: string;
  totalReviews: number;
  aiReplies: number;
  averageRating: number;
  avgResponseTimeHours: number;
  ownerEmail: string;
}

export interface UsageMetrics {
  totalReviewsThisMonth: number;
  autoRepliedPercentage: number;
  manualRepliedPercentage: number;
  pendingPercentage: number;
  avgResponseTimeHours: number;
}

export interface DailyUsageDataPoint {
  date: string;
  reviewsReceived: number;
  autoReplies: number;
  manualReplies: number;
}

const PLAN_PRICES = {
  local: { monthly: 49, yearly: 39 },
  pro: { monthly: 99, yearly: 79 },
  business: { monthly: 199, yearly: 166 },
  enterprise: { monthly: 499, yearly: 416 },
};

// ============================================
// OVERVIEW METRICS - All real data
// ============================================

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Total users count
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users);

    // Active paying customers (current period)
    const [payingUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.subscriptionStatus, "active"));

    // Active paying customers (previous period)
    const [prevPayingUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.subscriptionStatus, "active"),
        lt(users.createdAt, thirtyDaysAgo)
      ));

    // Total posted replies
    const [totalRepliesResult] = await db
      .select({ count: count() })
      .from(reviews)
      .where(sql`${reviews.postedReply} IS NOT NULL`);

    // Replies in last 30 days
    const [recentRepliesResult] = await db
      .select({ count: count() })
      .from(reviews)
      .where(and(
        sql`${reviews.postedReply} IS NOT NULL`,
        gte(reviews.repliedAt, thirtyDaysAgo)
      ));

    // Replies in previous 30 days (60-30 days ago)
    const [prevRepliesResult] = await db
      .select({ count: count() })
      .from(reviews)
      .where(and(
        sql`${reviews.postedReply} IS NOT NULL`,
        gte(reviews.repliedAt, sixtyDaysAgo),
        lt(reviews.repliedAt, thirtyDaysAgo)
      ));

    // Average rating across all reviews
    const [avgRatingResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)` })
      .from(reviews);

    // Signups in last 30 days
    const [recentSignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    // Signups in previous 30 days
    const [previousSignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, sixtyDaysAgo),
        lt(users.createdAt, thirtyDaysAgo)
      ));

    // Calculate percentage changes (return 0 if no previous data to avoid misleading 100% jumps)
    const recentSignups = recentSignupsResult?.count || 0;
    const previousSignups = previousSignupsResult?.count || 0;
    const signupsChange = previousSignups > 0 
      ? Math.round(((recentSignups - previousSignups) / previousSignups) * 100) 
      : 0;

    const currentPayingUsers = payingUsersResult?.count || 0;
    const prevPayingUsers = prevPayingUsersResult?.count || 0;
    const customersChange = prevPayingUsers > 0
      ? Math.round(((currentPayingUsers - prevPayingUsers) / prevPayingUsers) * 100)
      : 0;

    const recentReplies = recentRepliesResult?.count || 0;
    const prevReplies = prevRepliesResult?.count || 0;
    const repliesChange = prevReplies > 0
      ? Math.round(((recentReplies - prevReplies) / prevReplies) * 100)
      : 0;

    const avgRating = Number(avgRatingResult?.avg) || 0;
    
    return {
      totalSignups: totalUsersResult?.count || 0,
      activePayingCustomers: payingUsersResult?.count || 0,
      totalAiReplies: totalRepliesResult?.count || 0,
      averageRating: Number(avgRating.toFixed(1)),
      signupsChange,
      customersChange,
      repliesChange,
    };
  } catch (error) {
    console.error("Error fetching overview metrics:", error);
    throw error;
  }
}

export async function getSignupsAndRepliesChart(): Promise<DualChartDataPoint[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const signupsByDay = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})::text`,
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    const repliesByDay = await db
      .select({
        date: sql<string>`DATE(${reviews.repliedAt})::text`,
        count: count(),
      })
      .from(reviews)
      .where(and(
        gte(reviews.repliedAt, thirtyDaysAgo),
        sql`${reviews.postedReply} IS NOT NULL`
      ))
      .groupBy(sql`DATE(${reviews.repliedAt})`)
      .orderBy(sql`DATE(${reviews.repliedAt})`);

    const signupsMap = new Map(signupsByDay.map(s => [s.date, s.count]));
    const repliesMap = new Map(repliesByDay.map(r => [r.date, r.count]));

    const result: DualChartDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        signups: signupsMap.get(dateStr) || 0,
        replies: repliesMap.get(dateStr) || 0,
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching chart data:", error);
    throw error;
  }
}

// ============================================
// TRAFFIC METRICS - Real data from page_views table
// ============================================

export async function getTrafficMetrics(): Promise<TrafficMetrics> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Daily page views (today)
    const [dailyViewsResult] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(gte(pageViews.createdAt, today));

    // Weekly page views (last 7 days)
    const [weeklyViewsResult] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(gte(pageViews.createdAt, sevenDaysAgo));

    // Previous week page views (for comparison)
    const [prevWeekViewsResult] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(and(
        gte(pageViews.createdAt, fourteenDaysAgo),
        lt(pageViews.createdAt, sevenDaysAgo)
      ));

    // Unique visitors (distinct session IDs) this week
    const [uniqueVisitorsResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})` })
      .from(pageViews)
      .where(gte(pageViews.createdAt, sevenDaysAgo));

    // Daily signups
    const [dailySignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, today));

    // Weekly signups
    const [weeklySignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo));

    // Previous week signups
    const [prevWeekSignupsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, fourteenDaysAgo),
        lt(users.createdAt, sevenDaysAgo)
      ));

    const weeklyVisits = weeklyViewsResult?.count || 0;
    const prevWeekVisits = prevWeekViewsResult?.count || 1;
    const visitsChange = prevWeekVisits > 0
      ? Math.round(((weeklyVisits - prevWeekVisits) / prevWeekVisits) * 100)
      : weeklyVisits > 0 ? 100 : 0;

    const weeklySignups = weeklySignupsResult?.count || 0;
    const prevWeekSignups = prevWeekSignupsResult?.count || 1;
    const signupsChange = prevWeekSignups > 0
      ? Math.round(((weeklySignups - prevWeekSignups) / prevWeekSignups) * 100)
      : weeklySignups > 0 ? 100 : 0;

    // Conversion rate = signups / unique visitors * 100
    const uniqueVisitors = Number(uniqueVisitorsResult?.count) || 0;
    const conversionRate = uniqueVisitors > 0
      ? Number(((weeklySignups / uniqueVisitors) * 100).toFixed(1))
      : 0;

    // Bounce rate (sessions with only 1 page view)
    const sessionCounts = await db
      .select({
        sessionId: pageViews.sessionId,
        viewCount: count(),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, sevenDaysAgo))
      .groupBy(pageViews.sessionId);

    const totalSessions = sessionCounts.length;
    const singlePageSessions = sessionCounts.filter(s => s.viewCount === 1).length;
    const bounceRate = totalSessions > 0
      ? Number(((singlePageSessions / totalSessions) * 100).toFixed(1))
      : 0;

    return {
      dailyVisits: dailyViewsResult?.count || 0,
      weeklyVisits,
      dailySignups: dailySignupsResult?.count || 0,
      weeklySignups,
      conversionRate,
      visitsChange,
      signupsChange,
      uniqueVisitors,
      bounceRate,
    };
  } catch (error) {
    console.error("Error fetching traffic metrics:", error);
    throw error;
  }
}

export async function getVisitsChart(): Promise<VisitDataPoint[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Page views by day
    const viewsByDay = await db
      .select({
        date: sql<string>`DATE(${pageViews.createdAt})::text`,
        count: count(),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${pageViews.createdAt})`)
      .orderBy(sql`DATE(${pageViews.createdAt})`);

    // Signups by day
    const signupsByDay = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})::text`,
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    const viewsMap = new Map(viewsByDay.map(v => [v.date, v.count]));
    const signupsMap = new Map(signupsByDay.map(s => [s.date, s.count]));

    const result: VisitDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        visits: viewsMap.get(dateStr) || 0,
        signups: signupsMap.get(dateStr) || 0,
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching visits chart:", error);
    throw error;
  }
}

// ============================================
// BILLING METRICS - Real data from users table
// ============================================

export async function getBillingMetrics(): Promise<BillingMetrics> {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get all active subscribers
    const activeUsers = await db
      .select({
        plan: users.subscriptionPlan,
        cycle: users.billingCycle,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.subscriptionStatus, "active"));

    // Calculate current MRR
    let mrr = 0;
    const planCounts: Record<string, { count: number; revenue: number }> = {
      local: { count: 0, revenue: 0 },
      pro: { count: 0, revenue: 0 },
      business: { count: 0, revenue: 0 },
      enterprise: { count: 0, revenue: 0 },
    };

    for (const user of activeUsers) {
      const plan = user.plan || "local";
      const cycle = user.cycle || "monthly";
      const price = PLAN_PRICES[plan as keyof typeof PLAN_PRICES]?.[cycle as "monthly" | "yearly"] || 49;
      mrr += price;
      if (planCounts[plan]) {
        planCounts[plan].count++;
        planCounts[plan].revenue += price;
      }
    }

    // Previous period MRR (for comparison)
    const prevActiveUsers = await db
      .select({
        plan: users.subscriptionPlan,
        cycle: users.billingCycle,
      })
      .from(users)
      .where(and(
        eq(users.subscriptionStatus, "active"),
        lt(users.createdAt, thirtyDaysAgo)
      ));

    let prevMrr = 0;
    for (const user of prevActiveUsers) {
      const plan = user.plan || "local";
      const cycle = user.cycle || "monthly";
      const price = PLAN_PRICES[plan as keyof typeof PLAN_PRICES]?.[cycle as "monthly" | "yearly"] || 49;
      prevMrr += price;
    }

    const mrrChange = prevMrr > 0
      ? Math.round(((mrr - prevMrr) / prevMrr) * 100)
      : mrr > 0 ? 100 : 0;

    // New subscriptions this month
    const [newSubsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.subscriptionStatus, "active"),
        gte(users.createdAt, thirtyDaysAgo)
      ));

    // Churned this month (canceled in last 30 days)
    const [canceledResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.subscriptionStatus, "canceled"),
        gte(users.updatedAt, thirtyDaysAgo)
      ));

    const churnRate = activeUsers.length > 0 
      ? ((canceledResult?.count || 0) / activeUsers.length) * 100 
      : 0;

    return {
      mrr,
      mrrChange,
      activeSubscriptions: activeUsers.length,
      newSubscriptionsThisMonth: newSubsResult?.count || 0,
      churnedThisMonth: canceledResult?.count || 0,
      churnRate: Number(churnRate.toFixed(1)),
      planBreakdown: Object.entries(planCounts).map(([plan, data]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        count: data.count,
        revenue: data.revenue,
      })),
    };
  } catch (error) {
    console.error("Error fetching billing metrics:", error);
    throw error;
  }
}

export async function getMrrChart(): Promise<MrrDataPoint[]> {
  try {
    const result: MrrDataPoint[] = [];
    const now = new Date();

    // Calculate MRR for each of the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthName = monthDate.toLocaleString('default', { month: 'short' });

      // Get active users at the end of that month
      const activeUsersInMonth = await db
        .select({
          plan: users.subscriptionPlan,
          cycle: users.billingCycle,
        })
        .from(users)
        .where(and(
          eq(users.subscriptionStatus, "active"),
          lt(users.createdAt, nextMonthDate)
        ));

      let monthMrr = 0;
      for (const user of activeUsersInMonth) {
        const plan = user.plan || "local";
        const cycle = user.cycle || "monthly";
        const price = PLAN_PRICES[plan as keyof typeof PLAN_PRICES]?.[cycle as "monthly" | "yearly"] || 49;
        monthMrr += price;
      }

      result.push({
        month: monthName,
        mrr: monthMrr,
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching MRR chart:", error);
    throw error;
  }
}

// ============================================
// LOCATION METRICS - Real data with response time
// ============================================

export async function getLocationMetrics(): Promise<LocationMetrics[]> {
  try {
    const locationsWithStats = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        ownerEmail: users.email,
      })
      .from(restaurants)
      .leftJoin(users, eq(restaurants.userId, users.id))
      .orderBy(desc(restaurants.createdAt))
      .limit(50);

    const result: LocationMetrics[] = [];

    for (const loc of locationsWithStats) {
      // Get review stats for this location
      const [reviewStats] = await db
        .select({
          totalReviews: count(),
          avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          aiReplies: sql<number>`COUNT(CASE WHEN ${reviews.postedReply} IS NOT NULL THEN 1 END)`,
        })
        .from(reviews)
        .where(eq(reviews.restaurantId, loc.id));

      // Calculate average response time (difference between reviewedAt and repliedAt)
      const [responseTimeResult] = await db
        .select({
          avgHours: sql<number>`
            COALESCE(
              AVG(
                EXTRACT(EPOCH FROM (${reviews.repliedAt} - ${reviews.reviewedAt})) / 3600
              ),
              0
            )
          `,
        })
        .from(reviews)
        .where(and(
          eq(reviews.restaurantId, loc.id),
          sql`${reviews.repliedAt} IS NOT NULL`,
          sql`${reviews.reviewedAt} IS NOT NULL`
        ));

      const avgRating = Number(reviewStats?.avgRating) || 0;
      const avgResponseTime = Number(responseTimeResult?.avgHours) || 0;

      result.push({
        id: loc.id,
        name: loc.name || "Unnamed Location",
        totalReviews: reviewStats?.totalReviews || 0,
        aiReplies: Number(reviewStats?.aiReplies) || 0,
        averageRating: Number(avgRating.toFixed(1)),
        avgResponseTimeHours: Number(avgResponseTime.toFixed(1)),
        ownerEmail: loc.ownerEmail || "unknown",
      });
    }

    return result.sort((a, b) => b.totalReviews - a.totalReviews);
  } catch (error) {
    console.error("Error fetching location metrics:", error);
    throw error;
  }
}

// ============================================
// USAGE METRICS - Real data with response time
// ============================================

export async function getUsageMetrics(): Promise<UsageMetrics> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total reviews this month
    const [totalResult] = await db
      .select({ count: count() })
      .from(reviews)
      .where(gte(reviews.createdAt, thirtyDaysAgo));

    // Auto-replied (posted status - auto-post)
    const [autoRepliedResult] = await db
      .select({ count: count() })
      .from(reviews)
      .where(and(
        gte(reviews.createdAt, thirtyDaysAgo),
        eq(reviews.replyStatus, "posted")
      ));

    // Manually replied (approved status)
    const [manualResult] = await db
      .select({ count: count() })
      .from(reviews)
      .where(and(
        gte(reviews.createdAt, thirtyDaysAgo),
        eq(reviews.replyStatus, "approved")
      ));

    // Average response time for all replied reviews
    const [responseTimeResult] = await db
      .select({
        avgHours: sql<number>`
          COALESCE(
            AVG(
              EXTRACT(EPOCH FROM (${reviews.repliedAt} - ${reviews.reviewedAt})) / 3600
            ),
            0
          )
        `,
      })
      .from(reviews)
      .where(and(
        gte(reviews.createdAt, thirtyDaysAgo),
        sql`${reviews.repliedAt} IS NOT NULL`,
        sql`${reviews.reviewedAt} IS NOT NULL`
      ));

    const total = totalResult?.count || 1;
    const autoReplied = autoRepliedResult?.count || 0;
    const manual = manualResult?.count || 0;
    const pending = Math.max(0, total - autoReplied - manual);
    const avgResponseTime = Number(responseTimeResult?.avgHours) || 0;

    return {
      totalReviewsThisMonth: total,
      autoRepliedPercentage: Number(((autoReplied / total) * 100).toFixed(1)),
      manualRepliedPercentage: Number(((manual / total) * 100).toFixed(1)),
      pendingPercentage: Number(((pending / total) * 100).toFixed(1)),
      avgResponseTimeHours: Number(avgResponseTime.toFixed(1)),
    };
  } catch (error) {
    console.error("Error fetching usage metrics:", error);
    throw error;
  }
}

export async function getDailyUsageChart(): Promise<DailyUsageDataPoint[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reviewsByDay = await db
      .select({
        date: sql<string>`DATE(${reviews.createdAt})::text`,
        total: count(),
        auto: sql<number>`COUNT(CASE WHEN ${reviews.replyStatus} = 'posted' THEN 1 END)`,
        manual: sql<number>`COUNT(CASE WHEN ${reviews.replyStatus} = 'approved' THEN 1 END)`,
      })
      .from(reviews)
      .where(gte(reviews.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${reviews.createdAt})`)
      .orderBy(sql`DATE(${reviews.createdAt})`);

    const dataMap = new Map(reviewsByDay.map(r => [r.date, r]));

    const result: DailyUsageDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const data = dataMap.get(dateStr);
      result.push({
        date: dateStr,
        reviewsReceived: data?.total || 0,
        autoReplies: Number(data?.auto) || 0,
        manualReplies: Number(data?.manual) || 0,
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching daily usage chart:", error);
    throw error;
  }
}
