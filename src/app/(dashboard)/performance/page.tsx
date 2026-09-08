import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PerformanceClient } from "@/components/performance/performance-client";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <PerformanceClient />;
}
