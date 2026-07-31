import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables, logActivity } from "@/lib/activity";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  customer_ids: z.array(z.coerce.number().int().positive()).optional(),
  empty_all: z.boolean().optional(),
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
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }
    const { customer_ids, empty_all } = parsed.data;

    let res: { affectedRows: number } = { affectedRows: 0 };

    if (empty_all) {
      res = await execute(
        "DELETE FROM customers WHERE tenant_id = ? AND COALESCE(is_trashed, 0) = 1",
        [tenantId]
      );
      logActivity({
        tenantId,
        actorId: session.id,
        actorName: session.name,
        action: "💥 Emptied Customer Trash",
        entityType: "customer",
        entityLabel: `Emptied trash (${res.affectedRows} customer(s) permanently deleted)`,
      });
    } else if (customer_ids && customer_ids.length > 0) {
      const placeholders = customer_ids.map(() => "?").join(",");
      res = await execute(
        `DELETE FROM customers WHERE id IN (${placeholders}) AND tenant_id = ? AND COALESCE(is_trashed, 0) = 1`,
        [...customer_ids, tenantId]
      );
      logActivity({
        tenantId,
        actorId: session.id,
        actorName: session.name,
        action: "💥 Permanently Deleted Customers",
        entityType: "customer",
        entityLabel: `${res.affectedRows} customer(s) permanently deleted from trash`,
      });
    }

    return NextResponse.json({ ok: true, count: res.affectedRows });
  } catch (err: any) {
    console.error("Error bulk deleting customers:", err);
    return NextResponse.json({ error: err.message || "Failed to delete customers" }, { status: 500 });
  }
}
