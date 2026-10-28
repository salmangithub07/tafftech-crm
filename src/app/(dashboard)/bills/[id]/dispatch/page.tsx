import { DispatchDetailView } from "@/components/dispatch/dispatch-detail-view";

export default async function BillDispatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <DispatchDetailView type="bill" docId={resolvedParams.id} />;
}
