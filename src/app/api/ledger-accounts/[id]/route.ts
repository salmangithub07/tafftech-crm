import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { z } from "zod";

// Note: opening_balance is intentionally NOT editable here — once set at
// creation, all further changes must go through a ledger transaction
// (increase/decrease), keeping the balance history honest and dynamic.
const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  notes: z.string().optional().or(z.literal("")).default(""),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM ledger_accounts WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  await execute("UPDATE ledger_accounts SET name = ?, notes = ? WHERE id = ? AND tenant_id = ?", [
    d.name,
    d.notes,
    id,
    tenantId,
  ]);

  const account = await query(
    `SELECT a.*, a.opening_balance
       + COALESCE(SUM(CASE WHEN t.direction='increase' THEN t.amount WHEN t.direction='decrease' THEN -t.amount ELSE 0 END), 0)
       AS balance
     FROM ledger_accounts a LEFT JOIN ledger_transactions t ON t.account_id = a.id
     WHERE a.id = ? GROUP BY a.id`,
    [id]
  );
  return NextResponse.json(account[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM ledger_accounts WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM ledger_accounts WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return NextResponse.json({ ok: true });
}
