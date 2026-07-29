import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { buildDateFilter, paginationParams } from "@/lib/query-helpers";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const appointmentSchema = z.object({
  title: z.string().optional().or(z.literal("")).default(""),
  customer_id: z.coerce.number().int().positive("Select a customer"),
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().optional().or(z.literal("")).default(""),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  remarks: z.string().optional().or(z.literal("")).default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const filter = req.nextUrl.searchParams.get("filter") || "all"; // all | today | tomorrow | past
  const search = req.nextUrl.searchParams.get("search")?.trim();
  const period = req.nextUrl.searchParams.get("period");
  const date = req.nextUrl.searchParams.get("date");
  const { page, limit, offset } = paginationParams(req, 10);

  const dateFilter = buildDateFilter("ap.appointment_date", period, date);

  let where = " WHERE ap.tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (filter === "past") {
    where += " AND ap.status IN ('completed','cancelled')";
  } else {
    where += " AND ap.status = 'pending'";
    if (filter === "today") {
      where += " AND ap.appointment_date = CURRENT_DATE";
    } else if (filter === "tomorrow") {
      where += " AND ap.appointment_date = (CURRENT_DATE + INTERVAL '1 day')::date";
    }
  }

  if (search) {
    where += " AND (c.name ILIKE ? OR c.phone ILIKE ? OR c.product ILIKE ? OR ap.title ILIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  where += dateFilter.clause;
  params.push(...dateFilter.params);

  const baseWhere = " WHERE ap.tenant_id = ?" + dateFilter.clause;
  const baseParams = [tenantId, ...dateFilter.params];

  const [appointments, totalRow, counts] = await Promise.all([
    query(
      `SELECT ap.*, c.name AS customer_name, c.phone AS customer_phone, c.product AS customer_product,
         a.name AS created_by_name
       FROM appointments ap
       LEFT JOIN customers c ON c.id = ap.customer_id
       LEFT JOIN admins a ON a.id = ap.created_by
       ${where} ORDER BY ap.appointment_date ASC, ap.appointment_time ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryOne<{ c: number }>(
      `SELECT COUNT(*) as c FROM appointments ap LEFT JOIN customers c ON c.id = ap.customer_id ${where}`,
      params
    ),
    queryOne<Record<string, number>>(
      `SELECT
         SUM(CASE WHEN ap.status = 'pending' THEN 1 ELSE 0 END) AS all_count,
         SUM(CASE WHEN ap.status = 'pending' AND ap.appointment_date = CURRENT_DATE THEN 1 ELSE 0 END) AS today_count,
         SUM(CASE WHEN ap.status = 'pending' AND ap.appointment_date = (CURRENT_DATE + INTERVAL '1 day')::date THEN 1 ELSE 0 END) AS tomorrow_count,
         SUM(CASE WHEN ap.status IN ('completed','cancelled') THEN 1 ELSE 0 END) AS past_count
       FROM appointments ap ${baseWhere}`,
      baseParams
    ),
  ]);

  return NextResponse.json({
    data: appointments,
    total: totalRow?.c ?? 0,
    page,
    limit,
    counts: {
      all: counts?.all_count ?? 0,
      today: counts?.today_count ?? 0,
      tomorrow: counts?.tomorrow_count ?? 0,
      past: counts?.past_count ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const customerRow = await query<{ id: number; product: string | null }>(
    "SELECT id, product FROM customers WHERE id = ? AND tenant_id = ?",
    [d.customer_id, tenantId]
  );
  if (!customerRow.length) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const apptTitle = d.title && d.title.trim().length > 0 ? d.title.trim() : (customerRow[0].product || null);

  const result = await execute(
    `INSERT INTO appointments (tenant_id, customer_id, title, appointment_date, appointment_time, status, remarks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      d.customer_id,
      apptTitle,
      d.appointment_date,
      d.appointment_time || null,
      d.status,
      d.remarks,
      session.id,
    ]
  );

  const appointment = await query(
    `SELECT ap.*, c.name AS customer_name FROM appointments ap
     LEFT JOIN customers c ON c.id = ap.customer_id WHERE ap.id = ?`,
    [result.insertId]
  );

  const apptObj: any = appointment[0];
  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: "Scheduled Appointment",
    entityType: "appointment",
    entityId: result.insertId,
    entityLabel: `${apptObj?.customer_name || "Customer"} (${d.appointment_date})`,
  });

  return NextResponse.json(appointment[0], { status: 201 });
}
