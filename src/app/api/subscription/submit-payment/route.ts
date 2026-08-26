import { NextRequest, NextResponse } from "next/server";
import { getSession, tenantOf } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";
import { ensureActivityTables, logActivity } from "@/lib/activity";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureActivityTables();

  const body = await req.json().catch(() => ({}));
  const utrNumber = (body?.utr_number || "").toString().trim();
  const planType = body?.plan_type === "3_year" ? "3_year" : "yearly";
  const notes = (body?.notes || "").toString().trim();

  if (!utrNumber) {
    return NextResponse.json({ error: "UTR / Transaction Reference Number is required." }, { status: 400 });
  }

  // Strict 12-digit numeric UPI UTR format validation
  if (!/^[0-9]{12}$/.test(utrNumber)) {
    return NextResponse.json(
      { error: "Invalid UTR format. Standard Indian UPI UTR numbers must be exactly 12 numeric digits (e.g. 428910293847)." },
      { status: 400 }
    );
  }

  // Check for duplicate UTR number in system
  const existingUtr = await queryOne<{ id: number; status: string; admin_name: string }>(
    `SELECT id, status, admin_name FROM subscription_payments WHERE LOWER(utr_number) = LOWER(?)`,
    [utrNumber]
  );

  if (existingUtr) {
    if (existingUtr.status === "approved") {
      return NextResponse.json(
        { error: `This UTR Number (${utrNumber}) has already been used and approved for a previous payment. Duplicate UTR submission is not allowed.` },
        { status: 400 }
      );
    } else if (existingUtr.status === "pending") {
      return NextResponse.json(
        { error: `A payment request with UTR (${utrNumber}) is already pending review with Super Admin.` },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: `This UTR Number (${utrNumber}) was previously submitted and rejected. Please enter a valid new payment UTR.` },
        { status: 400 }
      );
    }
  }

  const tenantId = tenantOf(session) ?? session.id;

  // Read Super Admin's pricing settings
  const superAdminSettings = await getSettings(0);
  const amountRaw = planType === "3_year"
    ? (superAdminSettings.three_year_plan_price || "12999")
    : (superAdminSettings.yearly_plan_price || "4999");
  const baseAmount = parseFloat(amountRaw);
  const couponCode = (body?.coupon_code || "").toString().trim().toUpperCase();
  const discountAmount = parseFloat(body?.discount_amount) || 0;
  const finalAmount = Math.max(0, baseAmount - discountAmount);

  const planTitle = planType === "3_year" ? "3-Year Plan" : "1-Year Plan";

  // Save payment submission record
  const result = await execute(
    `INSERT INTO subscription_payments (tenant_id, admin_name, admin_email, plan_type, amount, utr_number, notes, status, coupon_code, discount_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [tenantId, session.name, session.email, planType, finalAmount, utrNumber, notes, couponCode || null, discountAmount]
  );

  const couponNote = couponCode ? ` (Coupon: ${couponCode}, -₹${discountAmount.toLocaleString("en-IN")})` : "";

  // Log activity for Super Admin notification
  await logActivity({
    tenantId: 0, // Global super admin feed
    actorId: session.id,
    actorName: session.name,
    action: "💳 Renewal Payment Proof Submitted",
    entityType: "team",
    entityId: session.id,
    entityLabel: `${session.name} submitted UTR: ${utrNumber} for ₹${finalAmount.toLocaleString("en-IN")} (${planTitle}${couponNote})`,
  });

  return NextResponse.json({
    success: true,
    payment_id: result.insertId,
    message: `Payment proof submitted successfully! Super Admin will review and activate your ${planTitle}.`,
  });
}
