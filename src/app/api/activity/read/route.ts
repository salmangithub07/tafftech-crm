import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { ensureActivityTables } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = tenantOf(session);
  if (!tenantId) return NextResponse.json({ error: "No tenant scope" }, { status: 400 });

  await ensureActivityTables();

  const userId = session.id;

  await execute(
    `INSERT INTO notification_reads (tenant_id, user_id, last_read_at)
     VALUES (?, ?, NOW())
     ON CONFLICT (tenant_id, user_id)
     DO UPDATE SET last_read_at = NOW()`,
    [tenantId, userId]
  );

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
}
