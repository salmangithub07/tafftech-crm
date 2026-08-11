import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession, signSession, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity";
import type { Admin } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin" && !session.is_impersonating) {
    return NextResponse.json({ error: "Only Super Admin can impersonate tenant accounts." }, { status: 403 });
  }

  const { id } = await params;
  const targetId = parseInt(id, 10);
  if (isNaN(targetId)) return NextResponse.json({ error: "Invalid Admin ID" }, { status: 400 });

  const targetAdmin = await queryOne<Admin>("SELECT * FROM admins WHERE id = ?", [targetId]);
  if (!targetAdmin) return NextResponse.json({ error: "Tenant account not found" }, { status: 404 });

  if (targetAdmin.role === "super_admin") {
    return NextResponse.json({ error: "Cannot impersonate Super Admin account" }, { status: 400 });
  }

  const superAdminId = session.is_impersonating ? session.original_super_admin_id! : session.id;
  const superAdminName = session.is_impersonating ? session.original_super_admin_name! : session.name;

  // Create impersonated session payload
  const impersonatedPayload = {
    id: targetAdmin.id,
    name: targetAdmin.name,
    email: targetAdmin.email,
    role: targetAdmin.role,
    tenantId: targetAdmin.tenant_id ?? targetAdmin.id,
    permissions: targetAdmin.permissions ? JSON.parse(targetAdmin.permissions) : [],
    is_impersonating: true,
    original_super_admin_id: superAdminId,
    original_super_admin_name: superAdminName,
  };

  const token = await signSession(impersonatedPayload);

  // Save session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // Log activity
  await logActivity({
    tenantId: targetAdmin.id,
    actorId: superAdminId,
    actorName: superAdminName,
    action: "🕵️ Impersonated Tenant Account for Support",
    entityType: "team",
    entityId: targetAdmin.id,
    entityLabel: `Super Admin ${superAdminName} logged into ${targetAdmin.name} (${targetAdmin.email})`,
  });

  return NextResponse.json({
    success: true,
    message: `Logged in as ${targetAdmin.name}. Redirecting to tenant dashboard...`,
    redirectUrl: "/dashboard",
  });
}
