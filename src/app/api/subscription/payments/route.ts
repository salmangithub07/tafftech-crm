import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
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

  const [payments, summary, expiringSoon] = await Promise.all([
    query(
      `SELECT sp.*, a.status AS admin_status, a.plan_expiry_date
       FROM subscription_payments sp
       LEFT JOIN admins a ON a.id = sp.tenant_id
       ${whereSql} ORDER BY sp.created_at DESC LIMIT 100`,
      params
    ),
    queryOne<{
      total_revenue: number;
      approved_count: number;
      pending_count: number;
      rejected_count: number;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS total_revenue,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_count,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
         COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected_count
       FROM subscription_payments`
    ),
    query<{ id: number; name: string; email: string; plan_expiry_date: string }>(
      `SELECT id, name, email, plan_expiry_date
       FROM admins
       WHERE role = 'admin'
         AND plan_expiry_date IS NOT NULL
         AND (plan_expiry_date::date - CURRENT_DATE) BETWEEN 0 AND 7
       ORDER BY plan_expiry_date ASC`
    ),
  ]);

  return NextResponse.json({
    payments,
    analytics: {
      total_revenue: Number(summary?.total_revenue || 0),
      approved_count: Number(summary?.approved_count || 0),
      pending_count: Number(summary?.pending_count || 0),
      rejected_count: Number(summary?.rejected_count || 0),
      expiring_soon_count: expiringSoon.length,
    },
    expiring_soon: expiringSoon,
  });
}
