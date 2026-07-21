import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM ledger_transactions WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM ledger_transactions WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return NextResponse.json({ ok: true });
}
