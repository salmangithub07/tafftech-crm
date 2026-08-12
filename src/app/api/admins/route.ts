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
    const rawAdmins = await query<any>(
      `SELECT ad.id, ad.name, ad.email, ad.role, ad.status, ad.created_at,
         ad.plan_type, ad.plan_start_date, ad.plan_expiry_date,
         ad.last_login_at, ad.last_activity_at,
         (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = ad.id) AS customer_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = ad.id) AS appointment_count,
         (SELECT COUNT(*) FROM bills b WHERE b.tenant_id = ad.id) AS bill_count,
         (SELECT COUNT(*) FROM quotations q WHERE q.tenant_id = ad.id) AS quotation_count,
         (SELECT COUNT(*) FROM products p WHERE p.tenant_id = ad.id) AS product_count,
         (SELECT COUNT(*) FROM admins e WHERE e.tenant_id = ad.id AND e.role = 'executive') AS executive_count,
         (SELECT COUNT(*) FROM activity_log al WHERE al.tenant_id = ad.id AND al.created_at >= NOW() - INTERVAL '7 days') AS weekly_activity_count,
         (SELECT COUNT(DISTINCT DATE(al.created_at)) FROM activity_log al WHERE al.tenant_id = ad.id AND al.created_at >= NOW() - INTERVAL '7 days') AS daily_active_days
       FROM admins ad WHERE ad.role = 'admin' ORDER BY ad.created_at ASC`
    );

    admins = rawAdmins.map((ad: any) => {
      const cust = Number(ad.customer_count || 0);
      const appt = Number(ad.appointment_count || 0);
      const bill = Number(ad.bill_count || 0);
      const quot = Number(ad.quotation_count || 0);
      const prod = Number(ad.product_count || 0);
      const exec = Number(ad.executive_count || 0);
      const totalRecs = cust + appt + bill + quot + prod + exec;
      const estDbSizeKb = Math.round(totalRecs * 2.5 + 16);

      let score = 0;
      // 1. Login Freshness (0-35 pts)
      const lastLogin = ad.last_login_at || ad.last_activity_at;
      if (lastLogin) {
        const hours = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
        if (hours <= 24) score += 35;
        else if (hours <= 72) score += 25;
        else if (hours <= 168) score += 15;
        else if (hours <= 720) score += 5;
      }

      // 2. Active Days in last 7 days (0-35 pts)
      const activeDays = Number(ad.daily_active_days || 0);
      if (activeDays >= 5) score += 35;
      else if (activeDays >= 3) score += 25;
      else if (activeDays >= 1) score += 15;

      // 3. Database Volume & Usage (0-30 pts)
      if (totalRecs >= 50) score += 30;
      else if (totalRecs >= 20) score += 20;
      else if (totalRecs >= 5) score += 10;
      else if (totalRecs > 0) score += 5;

      return {
        ...ad,
        customer_count: cust,
        appointment_count: appt,
        bill_count: bill,
        quotation_count: quot,
        product_count: prod,
        executive_count: exec,
        daily_active_days: activeDays,
        weekly_activity_count: Number(ad.weekly_activity_count || 0),
        total_records: totalRecs,
        est_db_size_kb: estDbSizeKb,
        health_score: Math.min(100, Math.max(0, score)),
      };
    });
  } catch (err) {
    console.error("Failed to query admins in GET API:", err);
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
