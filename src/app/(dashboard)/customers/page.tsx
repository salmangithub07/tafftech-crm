import { getSession, tenantOf } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getPlanLimits } from "@/lib/subscription";
import { CustomersClient } from "@/components/customers/customers-client";

export default async function CustomersPage() {
  const session = await getSession();
  const tenantId = tenantOf(session!) || session!.id;

  const [superAdminSettings, tenantAdmin] = await Promise.all([
    getSettings(0),
    queryOne<{ plan_type: string }>("SELECT plan_type FROM admins WHERE id = ?", [tenantId]),
  ]);

  const limits = getPlanLimits(tenantAdmin?.plan_type, superAdminSettings);

  return (
    <CustomersClient
      initialCustomers={[]}
      maxCustomers={limits.maxCustomers}
      planType={tenantAdmin?.plan_type || "trial"}
    />
  );
}
