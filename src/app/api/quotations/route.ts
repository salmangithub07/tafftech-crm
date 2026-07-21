import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { buildDateFilter, paginationParams } from "@/lib/query-helpers";
import { z } from "zod";

const quotationSchema = z.object({
  appointment_id: z.coerce.number().int().positive(),
  customer_id: z.coerce.number().int().positive(),
  quotation_amount: z.coerce.number().min(0),
  quotation_status: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  notes: z.string().optional().or(z.literal("")).default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "quotations"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const status = req.nextUrl.searchParams.get("status");
  const period = req.nextUrl.searchParams.get("period");
  const date = req.nextUrl.searchParams.get("date");
  const { page, limit, offset } = paginationParams(req, 10);

  const dateFilter = buildDateFilter("q.quotation_date", period, date);
  const baseWhere = " WHERE q.tenant_id = ?" + dateFilter.clause;
  const baseParams = [tenantId, ...dateFilter.params];

  let where = baseWhere;
  const params = [...baseParams];
  if (status && ["pending", "accepted", "rejected"].includes(status)) {
    where += " AND q.quotation_status = ?";
    params.push(status);
  }

  const [quotations, totalRow, counts] = await Promise.all([
    query(
      `SELECT q.*, c.name AS customer_name, a.name AS created_by_name
       FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN admins a ON a.id = q.created_by
       ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM quotations q ${where}`, params),
    queryOne<Record<string, number>>(
      `SELECT COUNT(*) AS all_count,
         SUM(CASE WHEN q.quotation_status='pending' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN q.quotation_status='accepted' THEN 1 ELSE 0 END) AS accepted_count,
         SUM(CASE WHEN q.quotation_status='rejected' THEN 1 ELSE 0 END) AS rejected_count
       FROM quotations q ${baseWhere}`,
      baseParams
    ),
  ]);

  return NextResponse.json({
    data: quotations,
    total: totalRow?.c ?? 0,
    page,
    limit,
    counts: {
      all: counts?.all_count ?? 0,
      pending: counts?.pending_count ?? 0,
      accepted: counts?.accepted_count ?? 0,
      rejected: counts?.rejected_count ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "quotations"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const appointment = await query("SELECT id FROM appointments WHERE id = ? AND tenant_id = ?", [
    d.appointment_id,
    tenantId,
  ]);
  if (!appointment.length) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });

  const result = await execute(
    `INSERT INTO quotations (tenant_id, appointment_id, customer_id, quotation_amount, quotation_status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, d.appointment_id, d.customer_id, d.quotation_amount, d.quotation_status, d.notes, session.id]
  );

  // Sending a quotation marks the linked appointment as completed — same rule as the original app.
  await execute("UPDATE appointments SET status = 'completed' WHERE id = ? AND tenant_id = ?", [
    d.appointment_id,
    tenantId,
  ]);

  const quotation = await query(
    `SELECT q.*, c.name AS customer_name FROM quotations q
     LEFT JOIN customers c ON c.id = q.customer_id WHERE q.id = ?`,
    [result.insertId]
  );
  return NextResponse.json(quotation[0], { status: 201 });
}
