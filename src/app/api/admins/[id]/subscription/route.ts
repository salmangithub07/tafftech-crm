import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { ensureActivityTables } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import type { PlanType } from "@/lib/types";

const subscriptionSchema = z.object({
  plan_type: z.enum(["trial", "monthly", "quarterly", "yearly", "lifetime"]),
  plan_expiry_date: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureActivityTables();

  const { id } = await params;

  const existing = await query<{ id: number }>("SELECT id FROM admins WHERE id = ? AND role = 'admin'", [id]);
  if (!existing.length) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }

  const { plan_type, plan_expiry_date } = parsed.data;

  const todayStr = new Date().toISOString().slice(0, 10);
  let finalExpiry = plan_expiry_date || null;

  // Auto calculate expiry if not explicitly provided for paid plans
  if (!finalExpiry) {
    if (plan_type === "monthly") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      finalExpiry = d.toISOString().slice(0, 10);
    } else if (plan_type === "quarterly") {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      finalExpiry = d.toISOString().slice(0, 10);
    } else if (plan_type === "yearly") {
      const d = new Date();
      d.setDate(d.getDate() + 365);
      finalExpiry = d.toISOString().slice(0, 10);
    }
  }

  await execute(
    `UPDATE admins SET plan_type = ?, plan_start_date = ?, plan_expiry_date = ? WHERE id = ?`,
    [plan_type, todayStr, finalExpiry, id]
  );

  const updated = await query(
    `SELECT id, name, email, role, status, plan_type, plan_start_date, plan_expiry_date FROM admins WHERE id = ?`,
    [id]
  );

  return NextResponse.json(updated[0]);
}
