import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

const appointmentSchema = z.object({
  title: z.string().optional().or(z.literal("")).default(""),
  customer_id: z.coerce.number().int().positive("Select a customer"),
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().optional().or(z.literal("")).default(""),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  remarks: z.string().optional().or(z.literal("")).default(""),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const existing = await query("SELECT id FROM appointments WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = parsed.data;

  const customerRow = await query<{ id: number; product: string | null }>(
    "SELECT id, product FROM customers WHERE id = ? AND tenant_id = ?",
    [d.customer_id, tenantId]
  );
  const apptTitle = d.title && d.title.trim().length > 0 ? d.title.trim() : (customerRow[0]?.product || null);

  await execute(
    `UPDATE appointments SET title=?, customer_id=?, appointment_date=?, appointment_time=?, status=?, remarks=? WHERE id=? AND tenant_id=?`,
    [apptTitle, d.customer_id, d.appointment_date, d.appointment_time || null, d.status, d.remarks, id, tenantId]
  );

  const appointment = await query(
    `SELECT ap.*, c.name AS customer_name FROM appointments ap
     LEFT JOIN customers c ON c.id = ap.customer_id WHERE ap.id = ?`,
    [id]
  );
  return NextResponse.json(appointment[0]);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const statusSchema = z.object({ status: z.enum(["pending", "completed", "cancelled"]) });
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const existing = await query("SELECT id FROM appointments WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?", [
    parsed.data.status,
    id,
    tenantId,
  ]);
  const appointment = await query(
    `SELECT ap.*, c.name AS customer_name FROM appointments ap
     LEFT JOIN customers c ON c.id = ap.customer_id WHERE ap.id = ?`,
    [id]
  );
  return NextResponse.json(appointment[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM appointments WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM appointments WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return NextResponse.json({ ok: true });
}
