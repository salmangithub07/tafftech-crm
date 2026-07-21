import { getSession, tenantOf } from "@/lib/auth";
import { getBalanceSheetSummary } from "@/lib/balance-sheet";
import { BalanceSheetClient } from "@/components/balance-sheet/balance-sheet-client";

export default async function BalanceSheetPage() {
  const session = await getSession();
  const tenantId = tenantOf(session!)!;
  const summary = await getBalanceSheetSummary(tenantId);
  return <BalanceSheetClient initialSummary={summary} />;
}
