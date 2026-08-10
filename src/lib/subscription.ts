import type { Admin, PlanStatus, PlanType } from "@/lib/types";

export type SubscriptionInfo = {
  status: PlanStatus;
  daysRemaining: number | null; // negative if past expiry
  graceDaysRemaining: number | null; // 3 to 0 during grace, negative if locked
  formattedExpiry: string | null;
  planType: PlanType;
};

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
