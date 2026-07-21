import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "bank", "creditor", "debtor"]),
  opening_balance: z.coerce.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")).default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const type = req.nextUrl.searchParams.get("type");
  let sql = `
    SELECT a.*,
      a.opening_balance
        + COALESCE(SUM(CASE WHEN t.direction='increase' THEN t.amount WHEN t.direction='decrease' THEN -t.amount ELSE 0 END), 0)
        AS balance
    FROM ledger_accounts a
    LEFT JOIN ledger_transactions t ON t.account_id = a.id
    WHERE a.tenant_id = ?`;
  const params: unknown[] = [tenantId];
  if (type && ["cash", "bank", "creditor", "debtor"].includes(type)) {
    sql += " AND a.type = ?";
    params.push(type);
  }
  sql += " GROUP BY a.id ORDER BY a.created_at ASC";

  const accounts = await query(sql, params);
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const result = await execute(
    "INSERT INTO ledger_accounts (tenant_id, name, type, opening_balance, notes) VALUES (?, ?, ?, ?, ?)",
    [tenantId, d.name, d.type, d.opening_balance, d.notes]
  );
  const account = await query("SELECT *, opening_balance AS balance FROM ledger_accounts WHERE id = ?", [
    result.insertId,
  ]);
  return NextResponse.json(account[0], { status: 201 });
}
