import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    const s = await getSettings(0);
    return NextResponse.json({
      site_name: s.site_name,
      meta_title: s.meta_title,
      meta_description: s.meta_description,
      yearly_plan_price: s.yearly_plan_price || "4999",
      three_year_plan_price: s.three_year_plan_price || "11999",
      lifetime_plan_price: s.lifetime_plan_price || "24999",
      trial_max_executives: s.trial_max_executives || "2",
      trial_max_customers: s.trial_max_customers || "50",
      yearly_max_executives: s.yearly_max_executives || "10",
      yearly_max_customers: s.yearly_max_customers || "1000",
      three_year_max_executives: s.three_year_max_executives || "25",
      three_year_max_customers: s.three_year_max_customers || "5000",
      lifetime_max_executives: s.lifetime_max_executives || "-1",
      lifetime_max_customers: s.lifetime_max_customers || "-1",
      bank_upi_id: s.bank_upi_id || "",
      payment_qr_code: s.payment_qr_code || "",
      company_phone: s.company_phone || "",
      terms_of_service: s.terms_of_service || "",
      privacy_policy: s.privacy_policy || "",
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load pricing settings" }, { status: 500 });
  }
}
