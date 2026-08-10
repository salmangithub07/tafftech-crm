import type { Admin, PlanStatus, PlanType } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";

export type SubscriptionInfo = {
  status: PlanStatus;
  daysRemaining: number | null; // negative if past expiry
  graceDaysRemaining: number | null; // 3 to 0 during grace, negative if locked
  formattedExpiry: string | null;
  planType: PlanType;
};

/**
 * Returns Max Executives and Max Customers allowed for a given plan type based on Super Admin settings.
 * Returns -1 if unlimited.
 */
export function getPlanLimits(planType: PlanType | string | null | undefined, settings: AppSettings) {
  const p = (planType || "trial") as PlanType;
  let maxExecs = -1;
  let maxCusts = -1;

  if (p === "trial") {
    maxExecs = parseInt(settings.trial_max_executives || "2", 10);
    maxCusts = parseInt(settings.trial_max_customers || "50", 10);
  } else if (p === "yearly") {
    maxExecs = parseInt(settings.yearly_max_executives || "10", 10);
    maxCusts = parseInt(settings.yearly_max_customers || "1000", 10);
  } else if (p === "3_year") {
    maxExecs = parseInt(settings.three_year_max_executives || "25", 10);
    maxCusts = parseInt(settings.three_year_max_customers || "5000", 10);
  } else if (p === "lifetime") {
    maxExecs = parseInt(settings.lifetime_max_executives || "-1", 10);
    maxCusts = parseInt(settings.lifetime_max_customers || "-1", 10);
  }

  return {
    maxExecutives: isNaN(maxExecs) ? -1 : maxExecs,
    maxCustomers: isNaN(maxCusts) ? -1 : maxCusts,
  };
}

/**
 * Evaluates subscription status for an Admin/Tenant.
 * Grace period is 3 days after plan_expiry_date.
 * If today > plan_expiry_date + 3 days => status = "locked".
 */
export function getSubscriptionInfo(admin: {
  plan_type?: PlanType | null;
  plan_expiry_date?: string | null;
}): SubscriptionInfo {
  const planType: PlanType = admin.plan_type || "trial";
  const expiryStr = admin.plan_expiry_date || null;

  // Trial or Lifetime plans without explicit expiry date never expire
  if ((planType === "trial" || planType === "lifetime") && !expiryStr) {
    return {
      status: "active",
      daysRemaining: null,
      graceDaysRemaining: null,
      formattedExpiry: "Never",
      planType,
    };
  }

  if (!expiryStr) {
    return {
      status: "active",
      daysRemaining: null,
      graceDaysRemaining: null,
      formattedExpiry: "No Expiry Set",
      planType,
    };
  }

  // Calculate difference in midnight UTC dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining >= 0) {
    return {
      status: "active",
      daysRemaining,
      graceDaysRemaining: 3,
      formattedExpiry: expiryStr,
      planType,
    };
  }

  // Grace period: days 1, 2, 3 after expiry (i.e. daysRemaining = -1, -2, -3)
  // graceDaysRemaining = 3 + daysRemaining  => e.g. -1 gives 2 days left of grace
  const graceDaysRemaining = 3 + daysRemaining;

  if (graceDaysRemaining >= 0) {
    return {
      status: "grace",
      daysRemaining,
      graceDaysRemaining,
      formattedExpiry: expiryStr,
      planType,
    };
  }

  return {
    status: "locked",
    daysRemaining,
    graceDaysRemaining: 0,
    formattedExpiry: expiryStr,
    planType,
  };
}
