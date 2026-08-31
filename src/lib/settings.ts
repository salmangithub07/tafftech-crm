import { query, execute } from "@/lib/db";

export type InvoiceTemplateType = "modern" | "classic" | "minimal" | "compact";
export type WhatsAppProviderType = "none" | "ultramsg" | "greenapi" | "wati" | "twilio";

export type AppSettings = {
  site_name: string;
  company_phone: string;
  privacy_policy: string;
  terms_of_service: string;
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
  lifetime_plan_price: string;
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
  meta_title: string;
  meta_description: string;
  seo_keywords: string;
  schema_json_ld: string;
  custom_head_code: string;
  custom_body_code: string;
  gstin: string;
  pan_no: string;
  business_logo: string;
  business_tagline: string;
  business_address: string;
  bank_branch: string;
  dispute_note: string;
};

const DEFAULTS: AppSettings = {
  site_name: "Taff Desk CRM",
  company_phone: "",
  privacy_policy: "We value your privacy. All customer data and transaction history are protected under our privacy guidelines.",
  terms_of_service: "By registering and using Taff Desk CRM, you agree to comply with our acceptable use policies, license terms, and maintain the confidentiality of your account credentials.",
  accent_color: "#2563eb",
  radius: "0.65",
  invoice_template: "modern",
  invoice_terms: "",
  bank_name: "",
  bank_account_no: "",
  bank_ifsc: "",
  bank_upi_id: "heenakausarkmt@okicici",
  bank_details: "",
  whatsapp_api_provider: "none",
  whatsapp_phone: "",
  whatsapp_api_key: "",
  whatsapp_instance_id: "",
  whatsapp_reminder_template: "Hello {customer_name}, your appointment is scheduled for {appointment_date} at {appointment_time}. Please contact us if you need to reschedule.",
  yearly_plan_price: "4999",
  three_year_plan_price: "11999",
  lifetime_plan_price: "24999",
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
  meta_title: "Taff Desk CRM — Modern All-In-One CRM Software for Growing Businesses",
  meta_description: "Manage customer leads, appointments, 1-click WhatsApp reminders, GST billing, inventory, and team permissions from one unified dashboard.",
  seo_keywords: "crm, saas crm, best crm software in india, whatsapp crm, whatsapp reminder crm, gst billing software, gst invoice generator, quotation maker software, proforma invoice software, lead management software, appointment scheduling crm, crm for small business, b2b crm software, crm with ledger, crm lifetime deal",
  schema_json_ld: JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.taffdesk.com/#software",
        "name": "Taff Desk CRM",
        "alternateName": "TaffTech CRM",
        "operatingSystem": "All (Web-based SaaS, Windows, macOS, iOS, Android)",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "CRM & GST Billing Software",
        "softwareVersion": "2.0.0",
        "description": "All-in-one CRM & GST Billing Software for growing businesses. Manage customer leads, appointments, 1-click WhatsApp reminders, quotation generator, inventory, and team permissions.",
        "url": "https://www.taffdesk.com",
        "featureList": [
          "Lead & Customer Management",
          "1-Click Automated WhatsApp Reminders",
          "GST Invoice & Quotation Generator",
          "Appointment Scheduling & Tracking",
          "Role-Based Access Control (RBAC)",
          "Financial Ledger & Income/Expense Tracking",
          "Multi-Tenant Business Architecture"
        ],
        "offers": [
          {
            "@type": "Offer",
            "name": "1-Year License",
            "price": "4999",
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-01-01",
            "priceValidUntil": "2030-12-31",
            "url": "https://www.taffdesk.com"
          },
          {
            "@type": "Offer",
            "name": "3-Year License",
            "price": "11999",
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-01-01",
            "priceValidUntil": "2030-12-31",
            "url": "https://www.taffdesk.com"
          },
          {
            "@type": "Offer",
            "name": "Lifetime Access",
            "price": "24999",
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-01-01",
            "priceValidUntil": "2030-12-31",
            "url": "https://www.taffdesk.com"
          }
        ],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "128",
          "bestRating": "5",
          "worstRating": "1"
        },
        "author": {
          "@type": "Organization",
          "@id": "https://www.taffdesk.com/#organization"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://www.taffdesk.com/#organization",
        "name": "TaffTech Industrial Solutions",
        "legalName": "TaffTech Solutions",
        "url": "https://www.taffdesk.com",
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "telephone": "+91-7020716334",
            "contactType": "customer service",
            "areaServed": "IN",
            "availableLanguage": ["English", "Hindi"]
          }
        ],
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Plot No 4, Nizamuddin Colony",
          "addressLocality": "Nagpur",
          "addressRegion": "Maharashtra",
          "postalCode": "440001",
          "addressCountry": "IN"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.taffdesk.com/#website",
        "url": "https://www.taffdesk.com",
        "name": "Taff Desk CRM",
        "description": "All-In-One CRM & GST Billing Software for Businesses",
        "publisher": {
          "@id": "https://www.taffdesk.com/#organization"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.taffdesk.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is Taff Desk CRM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Taff Desk CRM is an all-in-one customer relationship management and GST billing software designed for growing businesses. It helps manage leads, send automated WhatsApp reminders, generate official GST invoices & quotations, track appointments, and manage team permissions."
            }
          },
          {
            "@type": "Question",
            "name": "Does Taff Desk CRM support GST Invoice and Quotation generation?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, Taff Desk CRM includes built-in 1-click Proforma Invoice / Quotation and GST Tax Invoice generation with custom company logo, GSTIN, bank details, and downloadable PDF / print formats."
            }
          },
          {
            "@type": "Question",
            "name": "How does 1-click WhatsApp Integration work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Taff Desk CRM allows you to instantly send appointment reminders, billing details, and customer updates directly to your customer's WhatsApp with one click."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a free trial available for Taff Desk CRM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! You can register for a 14-day free trial with full access to all features, including lead management, GST invoicing, and team executive management."
            }
          }
        ]
      }
    ]
  }, null, 2),
  custom_head_code: "",
  custom_body_code: "",
  gstin: "",
  pan_no: "",
  business_logo: "",
  business_tagline: "",
  business_address: "",
  bank_branch: "",
  dispute_note: "",
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

    const bName = (tenantMap.bank_name && tenantMap.bank_name.trim()) || globalMap.bank_name || DEFAULTS.bank_name;
    const bAcc = (tenantMap.bank_account_no && tenantMap.bank_account_no.trim()) || globalMap.bank_account_no || DEFAULTS.bank_account_no;
    const bIfsc = (tenantMap.bank_ifsc && tenantMap.bank_ifsc.trim()) || globalMap.bank_ifsc || DEFAULTS.bank_ifsc;
    const bUpi = (tenantMap.bank_upi_id && tenantMap.bank_upi_id.trim()) || (globalMap.bank_upi_id && globalMap.bank_upi_id.trim()) || DEFAULTS.bank_upi_id;

    const formattedBankDetails = `Bank: ${bName}\nA/C No: ${bAcc}\nIFSC Code: ${bIfsc}\nUPI ID: ${bUpi}`;

    return {
      site_name: tenantMap.site_name ?? globalMap.site_name ?? DEFAULTS.site_name,
      company_phone: tenantMap.company_phone ?? globalMap.company_phone ?? DEFAULTS.company_phone,
      privacy_policy: tenantMap.privacy_policy ?? globalMap.privacy_policy ?? DEFAULTS.privacy_policy,
      terms_of_service: tenantMap.terms_of_service ?? globalMap.terms_of_service ?? DEFAULTS.terms_of_service,
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
      yearly_plan_price: (tenantMap.yearly_plan_price && tenantMap.yearly_plan_price.trim()) || (globalMap.yearly_plan_price && globalMap.yearly_plan_price.trim()) || DEFAULTS.yearly_plan_price,
      three_year_plan_price: (tenantMap.three_year_plan_price && tenantMap.three_year_plan_price.trim()) || (globalMap.three_year_plan_price && globalMap.three_year_plan_price.trim()) || DEFAULTS.three_year_plan_price,
      lifetime_plan_price: (tenantMap.lifetime_plan_price && tenantMap.lifetime_plan_price.trim()) || (globalMap.lifetime_plan_price && globalMap.lifetime_plan_price.trim()) || DEFAULTS.lifetime_plan_price,
      payment_qr_code: (tenantMap.payment_qr_code && tenantMap.payment_qr_code.trim()) || (globalMap.payment_qr_code && globalMap.payment_qr_code.trim()) || DEFAULTS.payment_qr_code,
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
      meta_title: tenantMap.meta_title ?? globalMap.meta_title ?? DEFAULTS.meta_title,
      meta_description: tenantMap.meta_description ?? globalMap.meta_description ?? DEFAULTS.meta_description,
      seo_keywords: tenantMap.seo_keywords ?? globalMap.seo_keywords ?? DEFAULTS.seo_keywords,
      schema_json_ld: tenantMap.schema_json_ld ?? globalMap.schema_json_ld ?? DEFAULTS.schema_json_ld,
      custom_head_code: tenantMap.custom_head_code ?? globalMap.custom_head_code ?? DEFAULTS.custom_head_code,
      custom_body_code: tenantMap.custom_body_code ?? globalMap.custom_body_code ?? DEFAULTS.custom_body_code,
      gstin: tenantMap.gstin ?? globalMap.gstin ?? DEFAULTS.gstin,
      pan_no: tenantMap.pan_no ?? globalMap.pan_no ?? DEFAULTS.pan_no,
      business_logo: tenantMap.business_logo ?? globalMap.business_logo ?? DEFAULTS.business_logo,
      business_tagline: tenantMap.business_tagline ?? globalMap.business_tagline ?? DEFAULTS.business_tagline,
      business_address: tenantMap.business_address ?? globalMap.business_address ?? DEFAULTS.business_address,
      bank_branch: tenantMap.bank_branch ?? globalMap.bank_branch ?? DEFAULTS.bank_branch,
      dispute_note: tenantMap.dispute_note ?? globalMap.dispute_note ?? DEFAULTS.dispute_note,
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
