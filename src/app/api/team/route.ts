import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, execute } from "@/lib/db";
import { getSession, PERMISSION_MODULES } from "@/lib/auth";
import { z } from "zod";

const teamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  permissions: z.array(z.enum(PERMISSION_MODULES)).default([]),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const team = await query(
    `SELECT id, name, email, role, status, permissions, created_at,
       (SELECT COUNT(*) FROM customers c WHERE c.created_by = admins.id) AS customer_count,
       (SELECT COUNT(*) FROM appointments ap WHERE ap.created_by = admins.id) AS appointment_count
     FROM admins WHERE tenant_id = ? AND role = 'executive' ORDER BY created_at ASC`,
    [session.id]
  );
  return NextResponse.json(team);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = teamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const existing = await query("SELECT id FROM admins WHERE LOWER(email) = ?", [d.email.toLowerCase()]);
  if (existing.length) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const hash = bcrypt.hashSync(d.password, 10);
  const result = await execute(
    "INSERT INTO admins (name, email, password, role, tenant_id, permissions, created_by, status) VALUES (?, ?, ?, 'executive', ?, ?, ?, 'active')",
    [d.name, d.email.toLowerCase(), hash, session.id, JSON.stringify(d.permissions), session.id]
  );

  const member = await query(
    "SELECT id, name, email, role, status, permissions, created_at FROM admins WHERE id = ?",
    [result.insertId]
  );
  return NextResponse.json(member[0], { status: 201 });
}
