import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { TeamClient } from "@/components/team/team-client";
import type { Admin } from "@/lib/types";

export default async function TeamPage() {
  const session = await getSession();

  const team = await query<Admin>(
    `SELECT id, name, email, role, status, permissions, created_at,
       (SELECT COUNT(*) FROM customers c WHERE c.created_by = admins.id) AS customer_count,
       (SELECT COUNT(*) FROM appointments a WHERE a.created_by = admins.id) AS appointment_count
     FROM admins WHERE tenant_id = ? AND role = 'executive' ORDER BY created_at ASC`,
    [session!.id]
  );

  return <TeamClient initialTeam={team} />;
}
