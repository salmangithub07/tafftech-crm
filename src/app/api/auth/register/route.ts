import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne, execute } from "@/lib/db";
import {
  signSession,
  SESSION_COOKIE,
  parsePermissions,
  type SessionPayload,
} from "@/lib/auth";
import { ensureActivityTables, logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    await ensureActivityTables();
    const body = await req.json().catch(() => null);

    const name = (body?.name || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const phone = (body?.phone || "").toString().trim();
    const password = (body?.password || "").toString();

    // Validation
    if (!name) {
      return NextResponse.json({ error: "Business or owner name is required." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    
    // Strict Phone Validation
    const phoneClean = phone.trim();
    if (!phoneClean) {
      return NextResponse.json({ error: "Phone / WhatsApp number is required." }, { status: 400 });
    }
    if (/[a-zA-Z]/.test(phoneClean)) {
      return NextResponse.json({ error: "Phone number cannot contain letters or text." }, { status: 400 });
    }

    const digits = phoneClean.replace(/[^0-9]/g, "");
    if (digits.length < 10 || digits.length > 15) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number (e.g. 9876543210)." }, { status: 400 });
    }

    // Check repetitive / dummy patterns (e.g. 0000000000, 1111111111, 1234567890)
    if (/^(\d)\1+$/.test(digits)) {
      return NextResponse.json({ error: "Dummy or repetitive phone numbers (e.g. 0000000000) are not allowed." }, { status: 400 });
    }
    const dummySequences = ["1234567890", "0123456789", "9876543210", "0987654321", "1234512345"];
    if (dummySequences.includes(digits.slice(-10))) {
      return NextResponse.json({ error: "Test or dummy phone numbers (e.g. 1234567890) are not allowed." }, { status: 400 });
    }

    const last10 = digits.slice(-10);
    if (!/^[6-9]\d{9}$/.test(last10)) {
      return NextResponse.json({ error: "Enter a valid mobile number starting with 6, 7, 8, or 9." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const selectedPlan = body?.selected_plan === "3_year" ? "3_year" : body?.selected_plan === "yearly" ? "yearly" : "trial";
    const utrNumber = (body?.utr_number || "").toString().trim();
    const couponCode = (body?.coupon_code || "").toString().trim().toUpperCase();
    const discountAmount = parseFloat(body?.discount_amount) || 0;

    // Paid Plan UTR Validation
    if (selectedPlan !== "trial") {
      if (!utrNumber) {
        return NextResponse.json({ error: "Payment UTR / Transaction Reference Number is required for paid plans." }, { status: 400 });
      }
      if (!/^[0-9]{12}$/.test(utrNumber)) {
        return NextResponse.json({ error: "Invalid UTR format. Standard Indian UPI UTR numbers must be exactly 12 numeric digits (e.g. 428910293847)." }, { status: 400 });
      }
      // Check for duplicate UTR number
      const existingUtr = await queryOne<{ id: number }>(
        `SELECT id FROM subscription_payments WHERE LOWER(utr_number) = LOWER(?)`,
        [utrNumber]
      );
      if (existingUtr) {
        return NextResponse.json({ error: `This UTR Number (${utrNumber}) has already been submitted.` }, { status: 400 });
      }
    }

    // Strict duplicate email check across all admins & executives
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM admins WHERE LOWER(email) = ?",
      [email]
    );

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // Calculate 14-day trial dates
    const startDateObj = new Date();
    const expiryDateObj = new Date();
    expiryDateObj.setDate(expiryDateObj.getDate() + 14);

    const startDateStr = startDateObj.toISOString().split("T")[0];
    const expiryDateStr = expiryDateObj.toISOString().split("T")[0];

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert new Tenant Admin
    const insertRes = await execute(
      `INSERT INTO admins (
        name, email, phone, password, role, tenant_id, permissions, status,
        plan_type, plan_start_date, plan_expiry_date, created_at, last_login_at
      ) VALUES (?, ?, ?, ?, 'admin', NULL, NULL, 'active', 'trial', ?, ?, NOW(), NOW())`,
      [name, email, phone, hashedPassword, startDateStr, expiryDateStr]
    );

    const newAdminId = Number(insertRes.insertId);

    // Update tenant_id to be self-referencing for top-level tenant admin
    if (newAdminId) {
      await execute("UPDATE admins SET tenant_id = ? WHERE id = ?", [newAdminId, newAdminId]);
    }

    // If a paid plan was selected, record payment submission for Super Admin approval
    if (selectedPlan !== "trial" && newAdminId) {
      const baseAmountRaw = selectedPlan === "3_year" ? "12999" : "4999";
      const finalAmount = Math.max(0, parseFloat(baseAmountRaw) - discountAmount);

      await execute(
        `INSERT INTO subscription_payments (tenant_id, admin_name, admin_email, plan_type, amount, utr_number, notes, status, coupon_code, discount_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [newAdminId, name, email, selectedPlan, finalAmount, utrNumber, "Submitted during registration", couponCode || null, discountAmount]
      );
    }

    const planTitle = selectedPlan === "3_year" ? "3-Year Plan" : selectedPlan === "yearly" ? "1-Year Plan" : "14-Day Free Trial";
    const utrNote = utrNumber ? ` (Payment UTR: ${utrNumber} Pending Approval)` : "";

    // Log Activity & Notify Super Admin
    logActivity({
      tenantId: newAdminId || 0,
      actorId: newAdminId || 0,
      actorName: name,
      action: `🎉 New Tenant Registered (${planTitle}): ${name} (${email}, Phone: ${phone})${utrNote}`,
      entityType: "tenant",
      entityId: newAdminId,
      entityLabel: `${name} (${phone})`,
    });

    // Create session payload & token for auto-login
    const sessionPayload: SessionPayload = {
      id: newAdminId,
      name,
      email,
      role: "admin",
      tenantId: newAdminId,
      permissions: parsePermissions(null),
    };

    const token = await signSession(sessionPayload);

    const res = NextResponse.json({
      success: true,
      message: "Registration successful! Welcome to your 14-day free trial.",
      user: sessionPayload,
      redirectUrl: "/dashboard",
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    console.error("Tenant Registration Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
