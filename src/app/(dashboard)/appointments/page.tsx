import { query } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { AppointmentsClient } from "@/components/appointments/appointments-client";
import type { Customer } from "@/lib/types";

export default async function AppointmentsPage() {
  const session = await getSession();
  const tenantId = tenantOf(session!);

  // Appointments themselves are fetched client-side (paginated, filterable).
  // The customer list is small enough to preload for the "pick a customer" dropdown.
  const customers = await query<Customer>(
    "SELECT * FROM customers WHERE tenant_id = ? ORDER BY name ASC",
    [tenantId]
  );

  return <AppointmentsClient initialAppointments={[]} customers={customers} />;
}
