import { Suspense } from "react";
import { query } from "@/lib/db";
import { ensureActivityTables } from "@/lib/activity";
import { AdminsClient } from "@/components/admins/admins-client";
import type { Admin } from "@/lib/types";

export default async function AdminsPage() {
  await ensureActivityTables();

  let admins: Admin[] = [];
  try {
    admins = await query<Admin>(
      `SELECT ad.id, ad.name, ad.email, ad.role, ad.status, ad.created_at,
         ad.plan_type, ad.plan_start_date, ad.plan_expiry_date,
         (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = ad.id) AS customer_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = ad.id) AS appointment_count,
         (SELECT COUNT(*) FROM admins e WHERE e.tenant_id = ad.id AND e.role = 'executive') AS executive_count
       FROM admins ad WHERE ad.role = 'admin' ORDER BY ad.created_at ASC`
    );
  } catch (err) {
    console.error("Failed to query admins with plan columns:", err);
    admins = await query<Admin>(
      `SELECT ad.id, ad.name, ad.email, ad.role, ad.status, ad.created_at,
         (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = ad.id) AS customer_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = ad.id) AS appointment_count,
         (SELECT COUNT(*) FROM admins e WHERE e.tenant_id = ad.id AND e.role = 'executive') AS executive_count
       FROM admins ad WHERE ad.role = 'admin' ORDER BY ad.created_at ASC`
    );
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>}>
      <AdminsClient initialAdmins={admins} />
    </Suspense>
  );
}

