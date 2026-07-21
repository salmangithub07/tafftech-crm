import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { z } from "zod";

const transactionSchema = z.object({
  account_id: z.coerce.number().int().positive("Select an account"),
  entry_date: z.string().min(1, "Date is required"),
  direction: z.enum(["increase", "decrease"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().optional().or(z.literal("")).default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const accountId = req.nextUrl.searchParams.get("account_id");
  let sql = `
    SELECT t.*, a.name AS account_name, ad.name AS created_by_name
    FROM ledger_transactions t
    LEFT JOIN ledger_accounts a ON a.id = t.account_id
    LEFT JOIN admins ad ON ad.id = t.created_by
    WHERE t.tenant_id = ?`;
  const params: unknown[] = [tenantId];
  if (accountId) {
    sql += " AND t.account_id = ?";
    params.push(accountId);
  }
  sql += " ORDER BY t.entry_date DESC, t.id DESC LIMIT 200";

  const transactions = await query(sql, params);
  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const account = await query("SELECT id FROM ledger_accounts WHERE id = ? AND tenant_id = ?", [
    d.account_id,
    tenantId,
  ]);
  if (!account.length) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const result = await execute(
    `INSERT INTO ledger_transactions (tenant_id, account_id, entry_date, direction, amount, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, d.account_id, d.entry_date, d.direction, d.amount, d.description, session.id]
  );

  const transaction = await query(
    `SELECT t.*, a.name AS account_name FROM ledger_transactions t
     LEFT JOIN ledger_accounts a ON a.id = t.account_id WHERE t.id = ?`,
    [result.insertId]
  );
  return NextResponse.json(transaction[0], { status: 201 });
}
