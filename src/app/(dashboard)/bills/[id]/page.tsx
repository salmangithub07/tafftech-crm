import { BillDetailView } from "@/components/bills/bill-detail-view";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <BillDetailView billId={resolvedParams.id} />;
}
