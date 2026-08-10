import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getPlanLimits } from "@/lib/subscription";
import { TeamClient } from "@/components/team/team-client";
import type { Admin } from "@/lib/types";

export default async function TeamPage() {
  const session = await getSession();

  const [team, superAdminSettings, tenantAdmin] = await Promise.all([
    query<Admin>(
      `SELECT id, name, email, role, status, permissions, created_at,
         (SELECT COUNT(*) FROM customers c WHERE c.created_by = admins.id) AS customer_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.created_by = admins.id) AS appointment_count
       FROM admins WHERE tenant_id = ? AND role = 'executive' ORDER BY created_at ASC`,
      [session!.id]
    ),
    getSettings(0),
    queryOne<{ plan_type: string }>("SELECT plan_type FROM admins WHERE id = ?", [session!.id]),
  ]);

  const limits = getPlanLimits(tenantAdmin?.plan_type, superAdminSettings);

  return (
    <TeamClient
      initialTeam={team}
      maxExecutives={limits.maxExecutives}
      planType={tenantAdmin?.plan_type || "trial"}
    />
  );
}
