import { DispatchDetailView } from "@/components/dispatch/dispatch-detail-view";

export default async function QuotationDispatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <DispatchDetailView type="quotation" docId={resolvedParams.id} />;
}
