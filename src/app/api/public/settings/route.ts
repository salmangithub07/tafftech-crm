import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    const s = await getSettings(0);
    return NextResponse.json({
      site_name: s.site_name,
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
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load pricing settings" }, { status: 500 });
  }
}
