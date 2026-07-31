import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables, logActivity } from "@/lib/activity";
import { z } from "zod";

const schema = z.object({
  appointment_ids: z.array(z.coerce.number().int().positive()).optional(),
  empty_all: z.boolean().optional(),
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

    const { appointment_ids, empty_all } = parsed.data;
    let res: { affectedRows: number } = { affectedRows: 0 };

    if (empty_all) {
      res = await execute(
        "DELETE FROM appointments WHERE tenant_id = ? AND COALESCE(is_trashed, 0) = 1",
        [tenantId]
      );
      logActivity({
        tenantId,
        actorId: session.id,
        actorName: session.name,
        action: "💥 Emptied Appointment Trash",
        entityType: "appointment",
        entityLabel: `Emptied trash (${res.affectedRows} appointment(s) permanently deleted)`,
      });
    } else if (appointment_ids && appointment_ids.length > 0) {
      const placeholders = appointment_ids.map(() => "?").join(",");
      res = await execute(
        `DELETE FROM appointments WHERE id IN (${placeholders}) AND tenant_id = ? AND COALESCE(is_trashed, 0) = 1`,
        [...appointment_ids, tenantId]
      );
      logActivity({
        tenantId,
        actorId: session.id,
        actorName: session.name,
        action: "💥 Permanently Deleted Appointments",
        entityType: "appointment",
        entityLabel: `${res.affectedRows} appointment(s) permanently deleted`,
      });
    }

    return NextResponse.json({ ok: true, count: res.affectedRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
