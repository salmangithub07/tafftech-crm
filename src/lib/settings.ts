import { query, execute } from "@/lib/db";

export type InvoiceTemplateType = "modern" | "classic" | "minimal" | "compact";
export type WhatsAppProviderType = "none" | "ultramsg" | "greenapi" | "wati" | "twilio";

export type AppSettings = {
  site_name: string;
  company_phone: string;
  privacy_policy: string;
  accent_color: string;
  radius: string;
  invoice_template: InvoiceTemplateType;
  invoice_terms: string;
  bank_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  bank_upi_id: string;
  bank_details: string;
  whatsapp_api_provider: WhatsAppProviderType;
  whatsapp_phone: string;
  whatsapp_api_key: string;
  whatsapp_instance_id: string;
  whatsapp_reminder_template: string;
  yearly_plan_price: string;
  three_year_plan_price: string;
  payment_qr_code: string;
  trial_max_executives: string;
  trial_max_customers: string;
  yearly_max_executives: string;
  yearly_max_customers: string;
  three_year_max_executives: string;
  three_year_max_customers: string;
  lifetime_max_executives: string;
  lifetime_max_customers: string;
  broadcast_announcement_enabled: string;
  broadcast_announcement_message: string;
  broadcast_announcement_type: string;
  broadcast_announcement_target_plan: string;
};

const DEFAULTS: AppSettings = {
  site_name: "Tafftech CRM",
  company_phone: "+91 9876543210",
  privacy_policy: "We value your privacy. All customer data and transaction history are protected under our privacy guidelines.",
  accent_color: "#2563eb",
  radius: "0.65",
  invoice_template: "modern",
  invoice_terms: "1. Goods once sold will not be taken back.\n2. Payment due within 15 days of invoice date.\n3. Subject to local jurisdiction.",
  bank_name: "HDFC Bank",
  bank_account_no: "50200012345678",
  bank_ifsc: "HDFC0001234",
  bank_upi_id: "merchant@upi",
  bank_details: "Bank: HDFC Bank\nA/C No: 50200012345678\nIFSC Code: HDFC0001234\nUPI ID: merchant@upi",
  whatsapp_api_provider: "none",
  whatsapp_phone: "",
  whatsapp_api_key: "",
  whatsapp_instance_id: "",
  whatsapp_reminder_template: "Namaste {customer_name}! 🔔\nRemind karne ke liye text hai ki aapka appointment aaj {appointment_date} ko {appointment_time} baje scheduled hai for {product_name}.\nThank you! — {company_name}",
  yearly_plan_price: "4999",
  three_year_plan_price: "12999",
  payment_qr_code: "",
  trial_max_executives: "2",
  trial_max_customers: "50",
  yearly_max_executives: "10",
  yearly_max_customers: "1000",
  three_year_max_executives: "25",
  three_year_max_customers: "5000",
  lifetime_max_executives: "-1",
  lifetime_max_customers: "-1",
  broadcast_announcement_enabled: "0",
  broadcast_announcement_message: "",
  broadcast_announcement_type: "info",
  broadcast_announcement_target_plan: "all",
};

/**
 * Reads settings for a tenant, falling back to the global (tenant_id = 0,
 * Super Admin controlled) row for any key the tenant hasn't overridden yet.
 * Pass 0 (or omit) to read the global defaults directly.
 */
export async function getSettings(tenantId = 0): Promise<AppSettings> {
  try {
    const rows = await query<{ tenant_id: number; key: string; value: string }>(
      "SELECT tenant_id, key, value FROM settings WHERE tenant_id IN (0, ?)",
      [tenantId]
    );

    const globalMap: Record<string, string> = {};
    const tenantMap: Record<string, string> = {};
    for (const r of rows) {
      if (r.tenant_id === 0) globalMap[r.key] = r.value;
      else tenantMap[r.key] = r.value;
    }

    const templateRaw = tenantMap.invoice_template ?? globalMap.invoice_template ?? DEFAULTS.invoice_template;
    const invoice_template: InvoiceTemplateType = ["modern", "classic", "minimal", "compact"].includes(templateRaw)
      ? (templateRaw as InvoiceTemplateType)
      : "modern";

    const providerRaw = tenantMap.whatsapp_api_provider ?? globalMap.whatsapp_api_provider ?? DEFAULTS.whatsapp_api_provider;
    const whatsapp_api_provider: WhatsAppProviderType = ["none", "ultramsg", "greenapi", "wati", "twilio"].includes(providerRaw)
      ? (providerRaw as WhatsAppProviderType)
      : "none";

    const bName = tenantMap.bank_name ?? globalMap.bank_name ?? DEFAULTS.bank_name;
    const bAcc = tenantMap.bank_account_no ?? globalMap.bank_account_no ?? DEFAULTS.bank_account_no;
    const bIfsc = tenantMap.bank_ifsc ?? globalMap.bank_ifsc ?? DEFAULTS.bank_ifsc;
    const bUpi = tenantMap.bank_upi_id ?? globalMap.bank_upi_id ?? DEFAULTS.bank_upi_id;

    const formattedBankDetails = `Bank: ${bName}\nA/C No: ${bAcc}\nIFSC Code: ${bIfsc}\nUPI ID: ${bUpi}`;

    return {
      site_name: tenantMap.site_name ?? globalMap.site_name ?? DEFAULTS.site_name,
      company_phone: tenantMap.company_phone ?? globalMap.company_phone ?? DEFAULTS.company_phone,
      privacy_policy: tenantMap.privacy_policy ?? globalMap.privacy_policy ?? DEFAULTS.privacy_policy,
      accent_color: tenantMap.accent_color ?? globalMap.accent_color ?? DEFAULTS.accent_color,
      radius: tenantMap.radius ?? globalMap.radius ?? DEFAULTS.radius,
      invoice_template,
      invoice_terms: tenantMap.invoice_terms ?? globalMap.invoice_terms ?? DEFAULTS.invoice_terms,
      bank_name: bName,
      bank_account_no: bAcc,
      bank_ifsc: bIfsc,
      bank_upi_id: bUpi,
      bank_details: tenantMap.bank_details ?? globalMap.bank_details ?? formattedBankDetails,
      whatsapp_api_provider,
      whatsapp_phone: tenantMap.whatsapp_phone ?? globalMap.whatsapp_phone ?? DEFAULTS.whatsapp_phone,
      whatsapp_api_key: tenantMap.whatsapp_api_key ?? globalMap.whatsapp_api_key ?? DEFAULTS.whatsapp_api_key,
      whatsapp_instance_id: tenantMap.whatsapp_instance_id ?? globalMap.whatsapp_instance_id ?? DEFAULTS.whatsapp_instance_id,
      whatsapp_reminder_template: tenantMap.whatsapp_reminder_template ?? globalMap.whatsapp_reminder_template ?? DEFAULTS.whatsapp_reminder_template,
      yearly_plan_price: tenantMap.yearly_plan_price ?? globalMap.yearly_plan_price ?? DEFAULTS.yearly_plan_price,
      three_year_plan_price: tenantMap.three_year_plan_price ?? globalMap.three_year_plan_price ?? DEFAULTS.three_year_plan_price,
      payment_qr_code: tenantMap.payment_qr_code ?? globalMap.payment_qr_code ?? DEFAULTS.payment_qr_code,
      trial_max_executives: tenantMap.trial_max_executives ?? globalMap.trial_max_executives ?? DEFAULTS.trial_max_executives,
      trial_max_customers: tenantMap.trial_max_customers ?? globalMap.trial_max_customers ?? DEFAULTS.trial_max_customers,
      yearly_max_executives: tenantMap.yearly_max_executives ?? globalMap.yearly_max_executives ?? DEFAULTS.yearly_max_executives,
      yearly_max_customers: tenantMap.yearly_max_customers ?? globalMap.yearly_max_customers ?? DEFAULTS.yearly_max_customers,
      three_year_max_executives: tenantMap.three_year_max_executives ?? globalMap.three_year_max_executives ?? DEFAULTS.three_year_max_executives,
      three_year_max_customers: tenantMap.three_year_max_customers ?? globalMap.three_year_max_customers ?? DEFAULTS.three_year_max_customers,
      lifetime_max_executives: tenantMap.lifetime_max_executives ?? globalMap.lifetime_max_executives ?? DEFAULTS.lifetime_max_executives,
      lifetime_max_customers: tenantMap.lifetime_max_customers ?? globalMap.lifetime_max_customers ?? DEFAULTS.lifetime_max_customers,
      broadcast_announcement_enabled: tenantMap.broadcast_announcement_enabled ?? globalMap.broadcast_announcement_enabled ?? DEFAULTS.broadcast_announcement_enabled,
      broadcast_announcement_message: tenantMap.broadcast_announcement_message ?? globalMap.broadcast_announcement_message ?? DEFAULTS.broadcast_announcement_message,
      broadcast_announcement_type: tenantMap.broadcast_announcement_type ?? globalMap.broadcast_announcement_type ?? DEFAULTS.broadcast_announcement_type,
      broadcast_announcement_target_plan: tenantMap.broadcast_announcement_target_plan ?? globalMap.broadcast_announcement_target_plan ?? DEFAULTS.broadcast_announcement_target_plan,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function setSetting(key: string, value: string, tenantId = 0) {
  await execute(
    "INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?) ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value",
    [tenantId, key, value]
  );
}
