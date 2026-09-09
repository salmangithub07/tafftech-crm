import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { ensureLedgerSchema } from "@/lib/balance-sheet";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureLedgerSchema();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;
  const accountId = parseInt(id, 10);

  const accountRows = await query<any>(
    "SELECT * FROM ledger_accounts WHERE id = ? AND tenant_id = ?",
    [accountId, tenantId]
  );
  if (!accountRows.length) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  const account = accountRows[0];
  const isCreditor = account.type === "creditor";

  const url = req.nextUrl;
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const period = url.searchParams.get("period") || "";
  const date = url.searchParams.get("date") || "";

  // 1. Calculate Opening Balance before filter window
  let priorFilterSql = "";
  const priorParams: unknown[] = [tenantId, accountId];

  let rangeFilterSql = "";
  const rangeParams: unknown[] = [tenantId, accountId];

  if (fromDate) {
    priorFilterSql += " AND entry_date < ?";
    priorParams.push(fromDate);

    rangeFilterSql += " AND entry_date >= ?";
    rangeParams.push(fromDate);
  }

  if (toDate) {
    rangeFilterSql += " AND entry_date <= ?";
    rangeParams.push(toDate);
  }

  if (period && period !== "all" && date) {
    if (period === "day") {
      rangeFilterSql += " AND entry_date::date = ?::date";
      rangeParams.push(date);
      priorFilterSql += " AND entry_date::date < ?::date";
      priorParams.push(date);
    } else if (period === "month") {
      rangeFilterSql += " AND TO_CHAR(entry_date, 'YYYY-MM') = ?";
      rangeParams.push(date);
      priorFilterSql += " AND TO_CHAR(entry_date, 'YYYY-MM') < ?";
      priorParams.push(date);
    } else if (period === "year") {
      rangeFilterSql += " AND TO_CHAR(entry_date, 'YYYY') = ?";
      rangeParams.push(date);
      priorFilterSql += " AND TO_CHAR(entry_date, 'YYYY') < ?";
      priorParams.push(date);
    }
  }

  // Prior transactions net sum
  const priorSum = await query<{ net: number }>(
    `SELECT COALESCE(SUM(CASE WHEN direction = 'increase' THEN amount WHEN direction = 'decrease' THEN -amount ELSE 0 END), 0) AS net
     FROM ledger_transactions
     WHERE tenant_id = ? AND account_id = ? ${priorFilterSql}`,
    priorParams
  );
  const openingBalance = Number(account.opening_balance || 0) + Number(priorSum[0]?.net || 0);

  // 2. Fetch all transactions in filter range in ASCENDING chronological order for statement
  const rows = await query<any>(
    `SELECT t.*, ad.name AS created_by_name
     FROM ledger_transactions t
     LEFT JOIN admins ad ON ad.id = t.created_by
     WHERE t.tenant_id = ? AND t.account_id = ? ${rangeFilterSql}
     ORDER BY t.entry_date ASC, t.id ASC`,
    rangeParams
  );

  let currentBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const statement = rows.map((tx) => {
    const isIncrease = tx.direction === "increase";
    const drAmount = isCreditor ? (isIncrease ? 0 : Number(tx.amount)) : (isIncrease ? Number(tx.amount) : 0);
    const crAmount = isCreditor ? (isIncrease ? Number(tx.amount) : 0) : (isIncrease ? 0 : Number(tx.amount));

    totalDebit += drAmount;
    totalCredit += crAmount;

    // Update running balance
    if (isIncrease) {
      currentBalance += Number(tx.amount);
    } else {
      currentBalance -= Number(tx.amount);
    }

    // Determine Dr/Cr tag
    let balanceType: "Dr" | "Cr" = "Dr";
    if (isCreditor) {
      balanceType = currentBalance >= 0 ? "Cr" : "Dr";
    } else {
      balanceType = currentBalance >= 0 ? "Dr" : "Cr";
    }

    let vType = tx.voucher_type;
    if (!vType) {
      if (account.type === "cash" || account.type === "bank") {
        vType = isIncrease ? "receipt" : "payment";
      } else {
        vType = "journal";
      }
    }

    return {
      ...tx,
      voucher_type: vType,
      dr_amount: drAmount,
      cr_amount: crAmount,
      running_balance: Math.abs(currentBalance),
      balance_type: balanceType,
    };
  });

  const closingBalance = currentBalance;
  const closingBalanceType = isCreditor
    ? (closingBalance >= 0 ? "Cr" : "Dr")
    : (closingBalance >= 0 ? "Dr" : "Cr");

  return NextResponse.json({
    account,
    openingBalance: Math.abs(openingBalance),
    openingBalanceType: isCreditor ? (openingBalance >= 0 ? "Cr" : "Dr") : (openingBalance >= 0 ? "Dr" : "Cr"),
    statement,
    totalDebit,
    totalCredit,
    closingBalance: Math.abs(closingBalance),
    closingBalanceType,
  });
}
