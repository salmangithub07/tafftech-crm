import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { ensureLedgerSchema } from "@/lib/balance-sheet";
import { z } from "zod";

const contraSchema = z.object({
  from_account_id: z.coerce.number().int().positive("Select source account"),
  to_account_id: z.coerce.number().int().positive("Select destination account"),
  entry_date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().optional().or(z.literal("")).default(""),
  voucher_no: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  await ensureLedgerSchema();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = contraSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (d.from_account_id === d.to_account_id) {
    return NextResponse.json({ error: "Source and destination accounts must be different." }, { status: 400 });
  }

  const fromAcc = await query<any>("SELECT id, name, type FROM ledger_accounts WHERE id = ? AND tenant_id = ?", [
    d.from_account_id,
    tenantId,
  ]);
  const toAcc = await query<any>("SELECT id, name, type FROM ledger_accounts WHERE id = ? AND tenant_id = ?", [
    d.to_account_id,
    tenantId,
  ]);

  if (!fromAcc.length || !toAcc.length) {
    return NextResponse.json({ error: "One or both accounts not found." }, { status: 404 });
  }

  const fromName = fromAcc[0].name;
  const toName = toAcc[0].name;
  const vNo = d.voucher_no || `CNTR-${Date.now().toString().slice(-5)}`;

  const descFrom = d.description
    ? `Transfer to ${toName} (${d.description})`
    : `Transfer to ${toName}`;

  const descTo = d.description
    ? `Transfer from ${fromName} (${d.description})`
    : `Transfer from ${fromName}`;

  // 1. Source account withdrawal (decrease)
  const res1 = await execute(
    `INSERT INTO ledger_transactions (tenant_id, account_id, entry_date, direction, amount, description, voucher_type, voucher_no, created_by)
     VALUES (?, ?, ?, 'decrease', ?, ?, 'contra', ?, ?)`,
    [tenantId, d.from_account_id, d.entry_date, d.amount, descFrom, vNo, session.id]
  );

  // 2. Destination account deposit (increase) linked
  const res2 = await execute(
    `INSERT INTO ledger_transactions (tenant_id, account_id, entry_date, direction, amount, description, voucher_type, voucher_no, linked_tx_id, created_by)
     VALUES (?, ?, ?, 'increase', ?, ?, 'contra', ?, ?, ?)`,
    [tenantId, d.to_account_id, d.entry_date, d.amount, descTo, vNo, res1.insertId, session.id]
  );

  // Update linked_tx_id on first row
  await execute(`UPDATE ledger_transactions SET linked_tx_id = ? WHERE id = ?`, [res2.insertId, res1.insertId]);

  return NextResponse.json({
    success: true,
    message: `₹${d.amount.toLocaleString("en-IN")} transferred from ${fromName} to ${toName}`,
    from_tx_id: res1.insertId,
    to_tx_id: res2.insertId,
  }, { status: 201 });
}
