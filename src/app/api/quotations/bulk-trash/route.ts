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
    if (ids.length === 0) {
      return NextResponse.json({ error: "No quotation IDs provided" }, { status: 400 });
    }

    const placeholders = ids.map(() => "?").join(",");
    await execute(
      `UPDATE quotations SET is_trashed = 1 WHERE id IN (${placeholders}) AND tenant_id = ?`,
      [...ids, tenantId]
    );

    logActivity({
      tenantId,
      actorId: session.id,
      actorName: session.name,
      action: "Bulk Trashed Quotations",
      entityType: "quotation",
      entityLabel: `${ids.length} quotation(s) moved to trash`,
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err: any) {
    console.error("Error bulk trashing quotations:", err);
    return NextResponse.json({ error: err?.message || "Failed to move quotations to trash" }, { status: 500 });
  }
}
