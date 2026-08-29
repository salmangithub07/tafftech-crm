import { QuotationForm } from "@/components/quotations/quotation-form";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <QuotationForm quotationId={resolvedParams.id} />;
}
