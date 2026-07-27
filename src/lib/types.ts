export type CustomerStatus = "lead" | "active" | "inactive";

export type Customer = {
  id: number;
  tenant_id: number;
  name: string;
  product: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: CustomerStatus;
  visited: number; // 0 | 1
  created_by: number | null;
  created_by_name?: string | null;
  appointment_count?: number;
  created_at: string;
  updated_at: string;
};

export type AppointmentStatus = "pending" | "completed" | "cancelled";

export type Appointment = {
  id: number;
  tenant_id: number;
  title: string | null;
  customer_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_product?: string | null;
  appointment_date: string;
  appointment_time: string | null;
  remarks: string | null;
  status: AppointmentStatus;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationStatus = "pending" | "accepted" | "rejected";

export type Quotation = {
  id: number;
  tenant_id: number;
  appointment_id: number;
  customer_id: number;
  customer_name?: string | null;
  quotation_date: string;
  quotation_amount: number;
  quotation_status: QuotationStatus;
  notes: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
};

export type Product = {
  id: number;
  tenant_id: number;
  name: string;
  sku: string | null;
  price: number;
  stock?: number;
  created_at: string;
};

export type StockTransaction = {
  id: number;
  tenant_id: number;
  product_id: number;
  product_name?: string | null;
  type: "in" | "out";
  quantity: number;
  note: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
};

export type SocialPlatform = {
  id: number;
  tenant_id: number;
  platform_name: string;
};

export type AnalyticsEntry = {
  id: number;
  tenant_id: number;
  executive_id: number;
  executive_name?: string | null;
  platform_id: number;
  platform_name?: string | null;
  analytics_date: string;
  post_reference: string | null;
  enquiries: number;
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  watch_time: number;
  subscribers_gained: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Role = "super_admin" | "admin" | "executive";

/** The tenant-scoped modules an Admin can grant/restrict per Executive. */
export const PERMISSION_MODULES = [
  "customers",
  "appointments",
  "quotations",
  "products",
  "analytics",
  "bills",
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

/* --------------------------- Bills & Invoices --------------------------- */

export type BillPaymentStatus = "paid" | "unpaid" | "partial";
export type BillPaymentMethod = "cash" | "bank" | "credit" | "other";

export type BillItem = {
  id?: number;
  bill_id?: number;
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type Bill = {
  id: number;
  tenant_id: number;
  bill_number: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  bill_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: BillPaymentStatus;
  payment_method: BillPaymentMethod;
  notes?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  items?: BillItem[];
};


export type SessionPayload = {
  id: number;
  name: string;
  email: string;
  role: Role;
  /** For 'admin': their own id. For 'executive': their owning admin's id. For 'super_admin': null (no tenant). */
  tenantId: number | null;
  /** Modules this account can access. Only meaningful for role === 'executive'. */
  permissions: PermissionModule[];
};

/** The tenant (admin) id whose data this session should see. Null for super_admin. */
export function tenantOf(session: SessionPayload): number | null {
  if (session.role === "admin") return session.id;
  if (session.role === "executive") return session.tenantId;
  return null;
}

/**
 * Whether this session can access a given tenant-scoped module.
 * Admins always have full access to their own tenant. Executives are
 * limited to whatever modules their Admin has granted them.
 */
export function canAccess(session: SessionPayload, module: PermissionModule): boolean {
  if (session.role === "admin") return true;
  if (session.role === "executive") return session.permissions?.includes(module) ?? false;
  return false;
}

export function parsePermissions(raw: string | null | undefined): PermissionModule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is PermissionModule =>
      (PERMISSION_MODULES as readonly string[]).includes(p)
    );
  } catch {
    return [];
  }
}

export type Admin = {
  id: number;
  name: string;
  email: string;
  role: Role;
  tenant_id: number | null;
  created_by: number | null;
  status: "active" | "inactive";
  avatar: string | null;
  permissions: string | null;
  created_at: string;
  customer_count?: number;
  appointment_count?: number;
  executive_count?: number;
};

/* --------------------------- Balance Sheet --------------------------- */

export type LedgerAccountType = "cash" | "bank" | "creditor" | "debtor";

export type LedgerAccount = {
  id: number;
  tenant_id: number;
  name: string;
  type: LedgerAccountType;
  opening_balance: number;
  notes: string | null;
  created_at: string;
  /** Computed server-side: opening_balance + net of all transactions. */
  balance?: number;
};

export type LedgerTransaction = {
  id: number;
  tenant_id: number;
  account_id: number;
  account_name?: string;
  entry_date: string;
  direction: "increase" | "decrease";
  amount: number;
  description: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  created_at: string;
};

export type FixedAsset = {
  id: number;
  tenant_id: number;
  name: string;
  quantity: number;
  unit_value: number;
  notes: string | null;
  created_at: string;
};

export type BalanceSheetSummary = {
  cash: LedgerAccount[];
  bank: LedgerAccount[];
  creditors: LedgerAccount[];
  debtors: LedgerAccount[];
  fixedAssets: FixedAsset[];
  rawMaterialValue: number;
  totals: {
    cash: number;
    bank: number;
    creditors: number;
    debtors: number;
    fixedAssets: number;
    rawMaterial: number;
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
  };
};
