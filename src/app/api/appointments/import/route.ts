import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

const rowSchema = z.object({
  customer_name: z.string().optional().default(""),
  customer_phone: z.string().optional().default(""),
  title: z.string().optional().default(""),
  appointment_date: z.string().min(1),
  appointment_time: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  status: z.enum(["pending", "completed", "cancelled"]).optional().default("pending"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  const customers = await query<{ id: number; name: string; phone: string | null }>(
    "SELECT id, name, phone FROM customers WHERE tenant_id = ?",
    [tenantId]
  );

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const d = parsed.data;

    // Match the customer by phone first (more reliable), then exact name.
    const match =
      (d.customer_phone && customers.find((c) => c.phone === d.customer_phone)) ||
      (d.customer_name && customers.find((c) => c.name.toLowerCase() === d.customer_name.toLowerCase()));

    if (!match) {
      skipped++;
      errors.push(`No matching customer for "${d.customer_name || d.customer_phone || "row"}"`);
      continue;
    }

    await execute(
      `INSERT INTO appointments (tenant_id, customer_id, title, appointment_date, appointment_time, status, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, match.id, d.title || null, d.appointment_date, d.appointment_time || null, d.status, d.remarks, session.id]
    );
    inserted++;
  }

  return NextResponse.json({ inserted, skipped, errors: errors.slice(0, 5) });
}
