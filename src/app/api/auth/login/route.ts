import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import {
  signSession,
  SESSION_COOKIE,
  tenantOf,
  parsePermissions,
  type SessionPayload,
} from "@/lib/auth";

type AdminRow = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: SessionPayload["role"];
  tenant_id: number | null;
  permissions: string | null;
  status: "active" | "inactive";
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email || "").toString().trim().toLowerCase();
  const password = (body?.password || "").toString();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are both required." },
      { status: 400 }
    );
  }

  const admin = await queryOne<AdminRow>(
    "SELECT * FROM admins WHERE LOWER(email) = ?",
    [email]
  );

  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 }
    );
  }

  if (admin.status === "inactive") {
    return NextResponse.json(
      { error: "This account has been deactivated. Please contact your admin." },
      { status: 403 }
    );
  }

  const sessionPayload: SessionPayload = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    tenantId: null,
    permissions: parsePermissions(admin.permissions),
  };
  sessionPayload.tenantId =
    admin.role === "executive" ? admin.tenant_id : tenantOf(sessionPayload);

  const token = await signSession(sessionPayload);

  const res = NextResponse.json(sessionPayload);

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
