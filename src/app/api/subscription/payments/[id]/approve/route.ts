import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureActivityTables, logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureActivityTables();

  const { id } = await params;

  const payment = await queryOne<{
    id: number;
    tenant_id: number;
    admin_name: string;
    plan_type: string;
    status: string;
  }>("SELECT id, tenant_id, admin_name, plan_type, status FROM subscription_payments WHERE id = ?", [id]);

  if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });

  const isThreeYear = payment.plan_type === "3_year";
  const daysToAdd = isThreeYear ? 1095 : 365; // 3 years vs 1 year
  const planTypeSave = isThreeYear ? "3_year" : "yearly";
  const planLabel = isThreeYear ? "3 Years" : "1 Year";

  const todayStr = new Date().toISOString().slice(0, 10);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysToAdd);
  const expiryStr = expiryDate.toISOString().slice(0, 10);

  // 1. Update payment status to approved
  await execute("UPDATE subscription_payments SET status = 'approved', updated_at = NOW() WHERE id = ?", [id]);

  // 2. Extend admin plan by duration
  await execute(
    "UPDATE admins SET plan_type = ?, plan_start_date = ?, plan_expiry_date = ? WHERE id = ?",
    [planTypeSave, todayStr, expiryStr, payment.tenant_id]
  );

  // 3. Log activity
  await logActivity({
    tenantId: payment.tenant_id,
    actorId: session.id,
    actorName: session.name,
    action: "✅ Subscription Approved",
    entityType: "team",
    entityId: payment.tenant_id,
    entityLabel: `Subscription renewed for ${planLabel} until ${expiryStr}`,
  });

  return NextResponse.json({
    success: true,
    message: `Payment approved! Subscription extended by ${planLabel} for ${payment.admin_name}.`,
  });
}
