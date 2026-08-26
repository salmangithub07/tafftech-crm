import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureActivityTables } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureActivityTables();

  const url = req.nextUrl;
  const statusFilter = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search")?.trim() || "";
  const period = url.searchParams.get("period") || "all";
  const dateValue = url.searchParams.get("dateValue")?.trim() || "";

  let whereSql = "WHERE 1=1";
  const params: unknown[] = [];

  if (statusFilter !== "all") {
    whereSql += " AND sp.status = ?";
    params.push(statusFilter);
  }

  if (search) {
    whereSql += " AND (sp.admin_name ILIKE ? OR sp.admin_email ILIKE ? OR sp.utr_number ILIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  let dateWhereSql = "";
  const dateParams: unknown[] = [];

  if (period === "day" && dateValue) {
    dateWhereSql = " AND sp.created_at::date = ?::date";
    dateParams.push(dateValue);
  } else if (period === "month" && dateValue) {
    dateWhereSql = " AND TO_CHAR(sp.created_at, 'YYYY-MM') = ?";
    dateParams.push(dateValue);
  } else if (period === "year" && dateValue) {
    dateWhereSql = " AND TO_CHAR(sp.created_at, 'YYYY') = ?";
    dateParams.push(dateValue);
  }

  whereSql += dateWhereSql;
  params.push(...dateParams);

  const summaryWhereSql = dateWhereSql ? `WHERE 1=1 ${dateWhereSql}` : "";

  const [payments, summary, expiringSoon, monthlyTrends, planDist] = await Promise.all([
    query(
      `SELECT sp.*, a.status AS admin_status, a.plan_expiry_date
       FROM subscription_payments sp
       LEFT JOIN admins a ON a.id = sp.tenant_id
       ${whereSql} ORDER BY sp.created_at DESC LIMIT 200`,
      params
    ),
    queryOne<{
      total_revenue: number;
      this_month_revenue: number;
      last_month_revenue: number;
      pending_revenue: number;
      approved_count: number;
      pending_count: number;
      rejected_count: number;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN sp.status = 'approved' THEN sp.amount ELSE 0 END), 0) AS total_revenue,
         COALESCE(SUM(CASE WHEN sp.status = 'approved' AND sp.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN sp.amount ELSE 0 END), 0) AS this_month_revenue,
         COALESCE(SUM(CASE WHEN sp.status = 'approved' AND sp.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND sp.created_at < DATE_TRUNC('month', CURRENT_DATE) THEN sp.amount ELSE 0 END), 0) AS last_month_revenue,
         COALESCE(SUM(CASE WHEN sp.status = 'pending' THEN sp.amount ELSE 0 END), 0) AS pending_revenue,
         COALESCE(SUM(CASE WHEN sp.status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_count,
         COALESCE(SUM(CASE WHEN sp.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
         COALESCE(SUM(CASE WHEN sp.status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected_count
       FROM subscription_payments sp
       ${summaryWhereSql}`,
      dateParams
    ),
    query<{ id: number; name: string; email: string; plan_type: string; plan_expiry_date: string }>(
      `SELECT id, name, email, plan_type, plan_expiry_date
       FROM admins
       WHERE role = 'admin'
         AND plan_expiry_date IS NOT NULL
         AND (plan_expiry_date::date - CURRENT_DATE) BETWEEN 0 AND 7
       ORDER BY plan_expiry_date ASC`
    ),
    query<{ month_key: string; month_label: string; revenue: number; count: number }>(
      `SELECT
         TO_CHAR(created_at, 'YYYY-MM') AS month_key,
         TO_CHAR(created_at, 'Mon YYYY') AS month_label,
         COALESCE(SUM(amount), 0) AS revenue,
         COUNT(*) AS count
       FROM subscription_payments
       WHERE status = 'approved'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon YYYY')
       ORDER BY month_key ASC
       LIMIT 12`
    ),
    query<{ plan_type: string; count: number }>(
      `SELECT COALESCE(plan_type, 'trial') AS plan_type, COUNT(*) AS count
       FROM admins
       WHERE role = 'admin'
       GROUP BY COALESCE(plan_type, 'trial')`
    ),
  ]);

  const thisMonthRev = Number(summary?.this_month_revenue || 0);
  const lastMonthRev = Number(summary?.last_month_revenue || 0);
  let growthPercent = 0;
  if (lastMonthRev > 0) {
    growthPercent = Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100);
  } else if (thisMonthRev > 0) {
    growthPercent = 100;
  }

  return NextResponse.json({
    payments,
    analytics: {
      total_revenue: Number(summary?.total_revenue || 0),
      this_month_revenue: thisMonthRev,
      last_month_revenue: lastMonthRev,
      growth_percent: growthPercent,
      pending_revenue: Number(summary?.pending_revenue || 0),
      approved_count: Number(summary?.approved_count || 0),
      pending_count: Number(summary?.pending_count || 0),
      rejected_count: Number(summary?.rejected_count || 0),
      expiring_soon_count: expiringSoon.length,
      monthly_trends: monthlyTrends.map((t) => ({
        ...t,
        revenue: Number(t.revenue),
        count: Number(t.count),
      })),
      plan_distribution: planDist.map((p) => ({
        plan_type: p.plan_type,
        count: Number(p.count),
      })),
    },
    expiring_soon: expiringSoon,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No payment record IDs provided for deletion" }, { status: 400 });
    }

    const placeholders = ids.map(() => "?").join(",");
    const res = await execute(`DELETE FROM subscription_payments WHERE id IN (${placeholders})`, ids);

    return NextResponse.json({ success: true, count: res.affectedRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not delete payments" }, { status: 500 });
  }
}
