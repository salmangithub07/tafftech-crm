import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession, signSession, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import type { Admin } from "@/lib/types";

export async function POST() {
  const session = await getSession();
  if (!session || !session.is_impersonating || !session.original_super_admin_id) {
    return NextResponse.json({ error: "Not currently in impersonation mode." }, { status: 400 });
  }

  const superAdminId = session.original_super_admin_id;
  const superAdmin = await queryOne<Admin>("SELECT * FROM admins WHERE id = ?", [superAdminId]);

  if (!superAdmin) {
    return NextResponse.json({ error: "Original Super Admin account not found." }, { status: 404 });
  }

  // Restore original Super Admin session payload
  const restoredPayload = {
    id: superAdmin.id,
    name: superAdmin.name,
    email: superAdmin.email,
    role: superAdmin.role,
    tenantId: null,
    permissions: [],
  };

  const token = await signSession(restoredPayload);

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({
    success: true,
    message: "Exited support mode. Returned to Super Admin dashboard.",
    redirectUrl: "/admins",
  });
}
