import { query } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { AnalyticsClient } from "@/components/analytics/analytics-client";
import type { SocialPlatform, Admin } from "@/lib/types";

export default async function AnalyticsPage() {
  const session = await getSession();
  const tenantId = tenantOf(session!);

  // Entries are fetched client-side (paginated, date-filterable).
  const platforms = await query<SocialPlatform>(
    "SELECT * FROM social_platforms WHERE tenant_id = ? ORDER BY platform_name ASC",
    [tenantId]
  );

  const executives = await query<Admin>(
    `SELECT id, name FROM admins WHERE (id = ? OR (tenant_id = ? AND role = 'executive')) ORDER BY name ASC`,
    [tenantId, tenantId]
  );

  return <AnalyticsClient initialEntries={[]} platforms={platforms} executives={executives} />;
}
