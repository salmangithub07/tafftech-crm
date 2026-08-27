import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables, logActivity } from "@/lib/activity";
import { z } from "zod";

const bulkStatusSchema = z.object({
  customer_ids: z.array(z.coerce.number().int().positive()).min(1, "At least one customer ID required"),
  status: z.enum(["lead", "progress", "active", "order_soon", "completed"]),
});

export async function POST(req: NextRequest) {
  try {
    await ensureActivityTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "customers"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;

    const body = await req.json().catch(() => null);
    const parsed = bulkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const ids = parsed.data.customer_ids;
    const status = parsed.data.status;
    const placeholders = ids.map(() => "?").join(",");

    const res = await execute(
      `UPDATE customers SET status = ? WHERE id IN (${placeholders}) AND tenant_id = ? AND COALESCE(is_trashed, 0) = 0`,
      [status, ...ids, tenantId]
    );

    const labelMap: Record<string, string> = {
      lead: "Lead",
      progress: "In Progress",
      active: "Active",
      order_soon: "Order Soon",
      completed: "Final / Completed",
    };

    logActivity({
      tenantId,
      actorId: session.id,
      actorName: session.name,
      action: `🔄 Bulk Updated Customer Status to '${labelMap[status] || status}'`,
      entityType: "customer",
      entityLabel: `${ids.length} customer(s) moved to ${labelMap[status] || status}`,
    });

    return NextResponse.json({ ok: true, count: res.affectedRows, status, statusLabel: labelMap[status] || status });
  } catch (err: any) {
    console.error("Error bulk updating customer status:", err);
    return NextResponse.json({ error: err.message || "Failed to update customer statuses" }, { status: 500 });
  }
}
