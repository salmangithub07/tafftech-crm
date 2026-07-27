import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { query } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const url = req.nextUrl;
  const accountId = url.searchParams.get("account_id");
  const direction = url.searchParams.get("direction");
  const search = url.searchParams.get("search") || "";
  const year = url.searchParams.get("year");
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");

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

  if (search) {
    whereSql += " AND (t.description ILIKE ? OR a.name ILIKE ? OR ad.name ILIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const transactions = await query<any>(
    `SELECT t.entry_date, a.name AS account_name, a.type AS account_type,
            t.direction, t.amount, t.description, ad.name AS created_by_name, t.created_at
     FROM ledger_transactions t
     LEFT JOIN ledger_accounts a ON a.id = t.account_id
     LEFT JOIN admins ad ON ad.id = t.created_by
     ${whereSql}
     ORDER BY t.entry_date DESC, t.id DESC`,
    params
  );

  const rows = transactions.map((t) => ({
    "Date": t.entry_date,
    "Account Name": t.account_name || "",
    "Account Type": t.account_type ? t.account_type.toUpperCase() : "",
    "Direction": t.direction.toUpperCase(),
    "Amount (₹)": t.amount,
    "Description": t.description || "",
    "Recorded By": t.created_by_name || "",
    "Created At": t.created_at,
  }));

  const csv = Papa.unparse(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger_transactions_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
