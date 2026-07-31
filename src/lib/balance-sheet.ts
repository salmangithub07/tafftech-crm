import { query } from "@/lib/db";
import type { LedgerAccount, FixedAsset, BalanceSheetSummary } from "@/lib/types";

/**
 * Builds the full Balance Sheet for a tenant.
 * - Raw material value is computed live from Products × current stock.
 * - Bills & Invoices pending/uncollected balance is fetched live from Bills.
 * - Debtors total includes both manual debtor ledger accounts + live Bills uncollected balance.
 * - Equity is the balancing figure (Total Assets − Creditors) — so both sides always tally.
 */
export async function getBalanceSheetSummary(tenantId: number): Promise<BalanceSheetSummary> {
  const accounts = await query<LedgerAccount>(
    `SELECT a.*,
       a.opening_balance
         + COALESCE(SUM(CASE WHEN t.direction='increase' THEN t.amount WHEN t.direction='decrease' THEN -t.amount ELSE 0 END), 0)
         AS balance
     FROM ledger_accounts a
     LEFT JOIN ledger_transactions t ON t.account_id = a.id
     WHERE a.tenant_id = ?
     GROUP BY a.id
     ORDER BY a.created_at ASC`,
    [tenantId]
  );

  const fixedAssets = await query<FixedAsset>(
    "SELECT * FROM fixed_assets WHERE tenant_id = ? ORDER BY created_at ASC",
    [tenantId]
  );

  const rawMaterialRow = await query<{ value: number }>(
    `SELECT COALESCE(SUM(p.price * stock.qty), 0) AS value
     FROM products p
     JOIN (
       SELECT product_id, COALESCE(SUM(CASE WHEN type='in' THEN quantity WHEN type='out' THEN -quantity ELSE 0 END), 0) AS qty
       FROM stock_transactions GROUP BY product_id
     ) stock ON stock.product_id = p.id
     WHERE p.tenant_id = ?`,
    [tenantId]
  );
  const rawMaterialValue = Number(rawMaterialRow[0]?.value ?? 0);

  const billsOutstandingRow = await query<{ value: number }>(
    `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS value
     FROM bills
     WHERE tenant_id = ? AND (total_amount - paid_amount) > 0`,
    [tenantId]
  );
  const billsOutstandingValue = Number(billsOutstandingRow[0]?.value ?? 0);

  const cash = accounts.filter((a) => a.type === "cash");
  const bank = accounts.filter((a) => a.type === "bank");
  const creditors = accounts.filter((a) => a.type === "creditor");
  const debtors = accounts.filter((a) => a.type === "debtor");

  const sumBalance = (list: LedgerAccount[]) => list.reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const cashTotal = sumBalance(cash);
  const bankTotal = sumBalance(bank);
  const creditorsTotal = sumBalance(creditors);
  const manualDebtorsTotal = sumBalance(debtors);
  const debtorsTotal = manualDebtorsTotal + billsOutstandingValue;
  const fixedAssetsTotal = fixedAssets.reduce((s, a) => s + Number(a.quantity) * Number(a.unit_value), 0);

  const totalAssets = cashTotal + bankTotal + debtorsTotal + rawMaterialValue + fixedAssetsTotal;
  const equity = totalAssets - creditorsTotal;
  const totalLiabilities = creditorsTotal + equity;

  return {
    cash,
    bank,
    creditors,
    debtors,
    fixedAssets,
    rawMaterialValue,
    billsOutstandingValue,
    totals: {
      cash: cashTotal,
      bank: bankTotal,
      creditors: creditorsTotal,
      debtors: debtorsTotal,
      fixedAssets: fixedAssetsTotal,
      rawMaterial: rawMaterialValue,
      billsOutstanding: billsOutstandingValue,
      totalAssets,
      totalLiabilities,
      equity,
    },
  };
}
