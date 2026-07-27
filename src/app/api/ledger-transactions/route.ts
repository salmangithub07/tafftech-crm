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

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
  const offset = (page - 1) * limit;

  const accountId = url.searchParams.get("account_id");
  const direction = url.searchParams.get("direction");
  const search = url.searchParams.get("search") || "";
  const year = url.searchParams.get("year");
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  // DateFilter component sends period + date params
  const period = url.searchParams.get("period") || "";
  const date = url.searchParams.get("date") || "";
  const isPaginated = url.searchParams.has("page") || url.searchParams.has("limit");

  let whereSql = `WHERE t.tenant_id = ?`;
  const params: unknown[] = [tenantId];

  if (accountId && accountId !== "all") {
    whereSql += " AND t.account_id = ?";
    params.push(parseInt(accountId, 10));
  }

  if (direction && direction !== "all") {
    whereSql += " AND t.direction = ?";
    params.push(direction);
  }

  if (year && year !== "all") {
    whereSql += " AND EXTRACT(YEAR FROM t.entry_date) = ?";
    params.push(parseInt(year, 10));
  }

  if (fromDate) {
    whereSql += " AND t.entry_date >= ?";
    params.push(fromDate);
  }

  if (toDate) {
    whereSql += " AND t.entry_date <= ?";
    params.push(toDate);
  }

  // DateFilter period+date params
  if (period && period !== "all" && date) {
    if (period === "day") {
      whereSql += " AND t.entry_date::date = ?::date";
      params.push(date);
    } else if (period === "month") {
      whereSql += " AND TO_CHAR(t.entry_date, 'YYYY-MM') = ?";
      params.push(date);
    } else if (period === "year") {
      whereSql += " AND TO_CHAR(t.entry_date, 'YYYY') = ?";
      params.push(date);
    }
  }

  if (search) {
    whereSql += " AND (t.description ILIKE ? OR a.name ILIKE ? OR ad.name ILIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Calculate totals for filtered dataset
  const statsRes = await query<{ total_inflow: number; total_outflow: number }>(
    `SELECT 
       COALESCE(SUM(CASE WHEN t.direction = 'increase' THEN t.amount ELSE 0 END), 0) AS total_inflow,
       COALESCE(SUM(CASE WHEN t.direction = 'decrease' THEN t.amount ELSE 0 END), 0) AS total_outflow
     FROM ledger_transactions t
     LEFT JOIN ledger_accounts a ON a.id = t.account_id
     LEFT JOIN admins ad ON ad.id = t.created_by
     ${whereSql}`,
    params
  );
  const totalInflow = Number(statsRes[0]?.total_inflow || 0);
  const totalOutflow = Number(statsRes[0]?.total_outflow || 0);
  const netFlow = totalInflow - totalOutflow;

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*) AS count 
     FROM ledger_transactions t
     LEFT JOIN ledger_accounts a ON a.id = t.account_id
     LEFT JOIN admins ad ON ad.id = t.created_by
     ${whereSql}`,
    params
  );
  const total = parseInt(countRes[0]?.count || "0", 10);

  let dataSql = `
    SELECT t.*, a.name AS account_name, a.type AS account_type, ad.name AS created_by_name
    FROM ledger_transactions t
    LEFT JOIN ledger_accounts a ON a.id = t.account_id
    LEFT JOIN admins ad ON ad.id = t.created_by
    ${whereSql}
    ORDER BY t.entry_date DESC, t.id DESC
  `;

  if (isPaginated) {
    dataSql += ` LIMIT ? OFFSET ?`;
    const dataParams = [...params, limit, offset];
    const transactions = await query(dataSql, dataParams);
    return NextResponse.json({
      data: transactions,
      total,
      page,
      limit,
      stats: { totalInflow, totalOutflow, netFlow },
    });
  }

  // Backwards compatibility if no page parameter passed
  dataSql += ` LIMIT 200`;
  const transactions = await query(dataSql, params);
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
