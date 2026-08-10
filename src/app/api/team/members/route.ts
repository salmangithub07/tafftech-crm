import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = tenantOf(session)!;

  const members = await query<{ id: number; name: string; email: string; role: string }>(
    `SELECT id, name, email, role FROM admins 
     WHERE (id = ? OR tenant_id = ?) AND COALESCE(status, 'active') = 'active'
     ORDER BY role ASC, name ASC`,
    [tenantId, tenantId]
  );

  return NextResponse.json({ data: members, current_user_id: session.id });
}
