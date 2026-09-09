import { LedgerStatementView } from "@/components/balance-sheet/ledger-statement-view";

export default async function LedgerAccountStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <LedgerStatementView accountId={resolvedParams.id} />;
}
