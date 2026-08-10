import { NextRequest, NextResponse } from "next/server";
import { getSession, tenantOf } from "@/lib/auth";
import { getSettings, setSetting } from "@/lib/settings";
import { z } from "zod";

const settingsSchema = z.object({
  site_name: z.string().min(1).optional(),
  company_phone: z.string().optional(),
  privacy_policy: z.string().optional(),
  accent_color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Invalid hex color")
    .optional(),
  invoice_template: z.enum(["modern", "classic", "minimal", "compact"]).optional(),
  invoice_terms: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_no: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_upi_id: z.string().optional(),
  bank_details: z.string().optional(),
  whatsapp_api_provider: z.enum(["none", "ultramsg", "greenapi", "wati", "twilio"]).optional(),
  whatsapp_phone: z.string().optional(),
  whatsapp_api_key: z.string().optional(),
  whatsapp_instance_id: z.string().optional(),
  whatsapp_reminder_template: z.string().optional(),
  yearly_plan_price: z.string().optional(),
  three_year_plan_price: z.string().optional(),
  payment_qr_code: z.string().optional(),
  trial_max_executives: z.string().optional(),
  trial_max_customers: z.string().optional(),
  yearly_max_executives: z.string().optional(),
  yearly_max_customers: z.string().optional(),
  three_year_max_executives: z.string().optional(),
  three_year_max_customers: z.string().optional(),
  lifetime_max_executives: z.string().optional(),
  lifetime_max_customers: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = tenantOf(session) ?? 0;
  return NextResponse.json(await getSettings(tenantId));
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "executive") {
    return NextResponse.json(
      { error: "You do not have permission to change settings." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }

  const tenantId = session.role === "super_admin" ? 0 : (tenantOf(session) ?? 0);
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) await setSetting(key, value, tenantId);
  }

  // Also maintain formatted bank_details if structured fields were updated
  const d = parsed.data;
  if (d.bank_name || d.bank_account_no || d.bank_ifsc || d.bank_upi_id) {
    const current = await getSettings(tenantId);
    const bName = d.bank_name ?? current.bank_name;
    const bAcc = d.bank_account_no ?? current.bank_account_no;
    const bIfsc = d.bank_ifsc ?? current.bank_ifsc;
    const bUpi = d.bank_upi_id ?? current.bank_upi_id;
    const formatted = `Bank: ${bName}\nA/C No: ${bAcc}\nIFSC Code: ${bIfsc}\nUPI ID: ${bUpi}`;
    await setSetting("bank_details", formatted, tenantId);
  }

  return NextResponse.json(await getSettings(tenantId));
}
