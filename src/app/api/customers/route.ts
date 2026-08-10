import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { buildDateFilter, paginationParams } from "@/lib/query-helpers";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  product: z.string().optional().or(z.literal("")).default(""),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")).default(""),
  phone: z.string().optional().or(z.literal("")).default(""),
  address: z.string().optional().or(z.literal("")).default(""),
  notes: z.string().optional().or(z.literal("")).default(""),
  status: z.enum(["lead", "progress", "active", "inactive"]).default("lead"),
  visited: z.boolean().default(false),
  created_by: z.coerce.number().int().positive().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const filter = req.nextUrl.searchParams.get("filter") || "all";
  const search = req.nextUrl.searchParams.get("search")?.trim();
  const period = req.nextUrl.searchParams.get("period");
  const date = req.nextUrl.searchParams.get("date");
  const { page, limit, offset } = paginationParams(req, 10);

  const dateFilter = buildDateFilter("c.created_at", period, date);

  let statusWhere = " WHERE c.tenant_id = ?";
  const statusParams: unknown[] = [tenantId];

  if (filter === "trash") {
    statusWhere += " AND COALESCE(c.is_trashed, 0) = 1";
  } else {
    statusWhere += " AND COALESCE(c.is_trashed, 0) = 0";
    if (filter !== "all") {
      statusWhere += " AND c.status = ?";
      statusParams.push(filter);
    }
  }

  if (search) {
    statusWhere += " AND (c.name ILIKE ? OR c.phone ILIKE ? OR c.product ILIKE ? OR c.email ILIKE ?)";
    const like = `%${search}%`;
    statusParams.push(like, like, like, like);
  }
  statusWhere += dateFilter.clause;
  statusParams.push(...dateFilter.params);

  const [customers, totalRow, counts] = await Promise.all([
    query(
      `SELECT c.*, a.name AS created_by_name,
         (SELECT COUNT(*) FROM appointments ap WHERE ap.customer_id = c.id) AS appointment_count
       FROM customers c LEFT JOIN admins a ON a.id = c.created_by
       ${statusWhere} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...statusParams, limit, offset]
    ),
    queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM customers c ${statusWhere}`, statusParams),
    queryOne<{ all_count: number; lead_count: number; progress_count: number; active_count: number; inactive_count: number; trash_count: number }>(
      `SELECT
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 THEN 1 ELSE 0 END) AS all_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='lead' THEN 1 ELSE 0 END) AS lead_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='progress' THEN 1 ELSE 0 END) AS progress_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='active' THEN 1 ELSE 0 END) AS active_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='inactive' THEN 1 ELSE 0 END) AS inactive_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 1 THEN 1 ELSE 0 END) AS trash_count
       FROM customers c WHERE c.tenant_id = ?${dateFilter.clause}`,
      [tenantId, ...dateFilter.params]
    ),
  ]);

  return NextResponse.json({
    data: customers,
    total: totalRow?.c ?? 0,
    page,
    limit,
    counts: {
      all: counts?.all_count ?? 0,
      lead: counts?.lead_count ?? 0,
      progress: counts?.progress_count ?? 0,
      active: counts?.active_count ?? 0,
      inactive: counts?.inactive_count ?? 0,
      trash: counts?.trash_count ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const createdBy = d.created_by || session.id;

  const result = await execute(
    `INSERT INTO customers (tenant_id, name, product, email, phone, address, notes, status, visited, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, d.name, d.product, d.email, d.phone, d.address, d.notes, d.status, d.visited ? 1 : 0, createdBy]
  );

  const customer = await query("SELECT * FROM customers WHERE id = ?", [result.insertId]);

  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: "Added new Customer",
    entityType: "customer",
    entityId: result.insertId,
    entityLabel: d.name,
  });

  return NextResponse.json(customer[0], { status: 201 });
}
