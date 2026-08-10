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
  const body = await req.json().catch(() => ({}));
  const reason = (body?.reason || "").toString().trim();

  const payment = await queryOne<{
    id: number;
    tenant_id: number;
    admin_name: string;
    utr_number: string;
    status: string;
  }>("SELECT id, tenant_id, admin_name, utr_number, status FROM subscription_payments WHERE id = ?", [id]);

  if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });

  await execute("UPDATE subscription_payments SET status = 'rejected', notes = ?, updated_at = NOW() WHERE id = ?", [
    reason ? `Rejected: ${reason}` : "Rejected by Super Admin",
    id,
  ]);

  await logActivity({
    tenantId: payment.tenant_id,
    actorId: session.id,
    actorName: session.name,
    action: "❌ Payment Proof Rejected",
    entityType: "team",
    entityId: payment.tenant_id,
    entityLabel: `Payment proof (UTR: ${payment.utr_number}) rejected for ${payment.admin_name}. ${reason ? `Reason: ${reason}` : ""}`,
  });

  return NextResponse.json({
    success: true,
    message: `Payment proof for ${payment.admin_name} rejected.`,
  });
}
