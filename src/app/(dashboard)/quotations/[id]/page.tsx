import { QuotationDetailView } from "@/components/quotations/quotation-detail-view";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <QuotationDetailView quotationId={resolvedParams.id} />;
}
