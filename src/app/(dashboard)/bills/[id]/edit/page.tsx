import { BillForm } from "@/components/bills/bill-form";

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <BillForm billId={resolvedParams.id} />;
}
