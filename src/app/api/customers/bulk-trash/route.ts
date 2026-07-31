import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables, logActivity } from "@/lib/activity";
import { z } from "zod";

const bulkTrashSchema = z.object({
  customer_ids: z.array(z.coerce.number().int().positive()).min(1, "At least one customer ID required"),
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
    const parsed = bulkTrashSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }
    const ids = parsed.data.customer_ids;
    const placeholders = ids.map(() => "?").join(",");

    const res = await execute(
      `UPDATE customers SET is_trashed = 1 WHERE id IN (${placeholders}) AND tenant_id = ?`,
      [...ids, tenantId]
    );

    logActivity({
      tenantId,
      actorId: session.id,
      actorName: session.name,
      action: "🗑️ Moved Customers to Trash",
      entityType: "customer",
      entityLabel: `${ids.length} customer(s) moved to trash`,
    });

    return NextResponse.json({ ok: true, count: res.affectedRows });
  } catch (err: any) {
    console.error("Error bulk trashing customers:", err);
    return NextResponse.json({ error: err.message || "Failed to move customers to trash" }, { status: 500 });
  }
}
