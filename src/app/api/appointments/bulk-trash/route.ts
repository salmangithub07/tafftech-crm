import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables, logActivity } from "@/lib/activity";
import { z } from "zod";

const schema = z.object({
  appointment_ids: z.array(z.coerce.number().int().positive()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    await ensureActivityTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "appointments"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });

    const ids = parsed.data.appointment_ids;
    const placeholders = ids.map(() => "?").join(",");
    const res = await execute(
      `UPDATE appointments SET is_trashed = 1 WHERE id IN (${placeholders}) AND tenant_id = ?`,
      [...ids, tenantId]
    );

    logActivity({
      tenantId,
      actorId: session.id,
      actorName: session.name,
      action: "🗑️ Moved Appointments to Trash",
      entityType: "appointment",
      entityLabel: `${ids.length} appointment(s) moved to trash`,
    });

    return NextResponse.json({ ok: true, count: res.affectedRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
