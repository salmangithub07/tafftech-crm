import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { logActivity, ensureActivityTables } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "quotations"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;

    await ensureActivityTables();

    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
    const emptyAll = body?.all === true;

    if (emptyAll) {
      const res = await execute(
        `DELETE FROM quotations WHERE tenant_id = ? AND COALESCE(is_trashed, 0) = 1`,
        [tenantId]
      );
      logActivity({
        tenantId,
        actorId: session.id,
        actorName: session.name,
        action: "Emptied Trash",
        entityType: "quotation",
        entityLabel: `Emptied trash (${res.affectedRows} quotation(s) permanently deleted)`,
      });
      return NextResponse.json({ success: true, count: res.affectedRows });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "No quotation IDs provided" }, { status: 400 });
    }

    const placeholders = ids.map(() => "?").join(",");
    const res = await execute(
      `DELETE FROM quotations WHERE id IN (${placeholders}) AND tenant_id = ? AND COALESCE(is_trashed, 0) = 1`,
      [...ids, tenantId]
    );

    logActivity({
      tenantId,
      actorId: session.id,
      actorName: session.name,
      action: "Bulk Deleted Quotations",
      entityType: "quotation",
      entityLabel: `${res.affectedRows} quotation(s) permanently deleted from trash`,
    });

    return NextResponse.json({ success: true, count: res.affectedRows });
  } catch (err: any) {
    console.error("Error bulk deleting quotations:", err);
    return NextResponse.json({ error: err?.message || "Failed to delete quotations" }, { status: 500 });
  }
}
