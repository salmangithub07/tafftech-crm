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
    const password = (body?.password || "").toString();

    // Validation
    if (!name) {
      return NextResponse.json({ error: "Business or owner name is required." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
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
        name, email, password, role, tenant_id, permissions, status,
        plan_type, plan_start_date, plan_expiry_date, created_at, last_login_at
      ) VALUES (?, ?, ?, 'admin', NULL, NULL, 'active', 'trial', ?, ?, NOW(), NOW())`,
      [name, email, hashedPassword, startDateStr, expiryDateStr]
    );

    const newAdminId = Number(insertRes.insertId);

    // Update tenant_id to be self-referencing for top-level tenant admin
    if (newAdminId) {
      await execute("UPDATE admins SET tenant_id = ? WHERE id = ?", [newAdminId, newAdminId]);
    }

    // Log Activity & Notify Super Admin
    logActivity({
      tenantId: newAdminId || 0,
      actorId: newAdminId || 0,
      actorName: name,
      action: `🎉 New Tenant Registered (14-Day Free Trial): ${name} (${email})`,
      entityType: "tenant",
      entityId: newAdminId,
      entityLabel: name,
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
