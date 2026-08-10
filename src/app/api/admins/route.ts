import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, execute } from "@/lib/db";
import { ensureActivityTables } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const adminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureActivityTables();

  let admins = [];
  try {
    admins = await query(
      `SELECT ad.id, ad.name, ad.email, ad.role, ad.status, ad.created_at,
         ad.plan_type, ad.plan_start_date, ad.plan_expiry_date,
         (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = ad.id) AS customer_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = ad.id) AS appointment_count,
         (SELECT COUNT(*) FROM admins e WHERE e.tenant_id = ad.id AND e.role = 'executive') AS executive_count
       FROM admins ad WHERE ad.role = 'admin' ORDER BY ad.created_at ASC`
    );
  } catch (err) {
    console.error("Failed to query admins in GET API:", err);
    admins = await query(
      `SELECT ad.id, ad.name, ad.email, ad.role, ad.status, ad.created_at,
         (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = ad.id) AS customer_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = ad.id) AS appointment_count,
         (SELECT COUNT(*) FROM admins e WHERE e.tenant_id = ad.id AND e.role = 'executive') AS executive_count
       FROM admins ad WHERE ad.role = 'admin' ORDER BY ad.created_at ASC`
    );
  }
  return NextResponse.json(admins);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = adminSchema.safeParse(body);
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const result = await execute(
    "INSERT INTO admins (name, email, password, role, tenant_id, created_by, status, plan_type, plan_start_date) VALUES (?, ?, ?, 'admin', NULL, ?, 'active', 'trial', ?)",
    [d.name, d.email.toLowerCase(), hash, session.id, todayStr]
  );

  const admin = await query(
    "SELECT id, name, email, role, status, created_at, plan_type, plan_start_date, plan_expiry_date FROM admins WHERE id = ?",
    [result.insertId]
  );
  return NextResponse.json(admin[0], { status: 201 });
}
