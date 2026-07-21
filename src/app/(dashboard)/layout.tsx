import { redirect } from "next/navigation";
import { getSession, tenantOf } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = tenantOf(session) ?? 0;
  const settings = await getSettings(tenantId);

  return (
    <DashboardShell session={session} siteName={settings.site_name}>
      {children}
    </DashboardShell>
  );
}
