import { CustomersClient } from "@/components/customers/customers-client";

export default function CustomersPage() {
  // Data is fetched client-side (paginated, filterable) — see CustomersClient.
  return <CustomersClient initialCustomers={[]} />;
}
