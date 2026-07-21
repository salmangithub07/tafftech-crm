import { query } from "@/lib/db";
import { AdminsClient } from "@/components/admins/admins-client";
import type { Admin } from "@/lib/types";

export default async function AdminsPage() {
  const admins = await query<Admin>(
    `SELECT ad.id, ad.name, ad.email, ad.role, ad.status, ad.created_at,
       (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = ad.id) AS customer_count,
       (SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = ad.id) AS appointment_count,
       (SELECT COUNT(*) FROM admins e WHERE e.tenant_id = ad.id AND e.role = 'executive') AS executive_count
     FROM admins ad WHERE ad.role = 'admin' ORDER BY ad.created_at ASC`
  );

  return <AdminsClient initialAdmins={admins} />;
}
