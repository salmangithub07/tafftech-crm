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
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const search = req.nextUrl.searchParams.get("search")?.trim();
  const status = req.nextUrl.searchParams.get("status");
  const period = req.nextUrl.searchParams.get("period");
  const date = req.nextUrl.searchParams.get("date");
  const { page, limit, offset } = paginationParams(req, 10);

  const dateFilter = buildDateFilter("c.created_at", period, date);

  let where = " WHERE c.tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (search) {
    where += " AND (c.name ILIKE ? OR c.phone ILIKE ? OR c.product ILIKE ? OR c.email ILIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  where += dateFilter.clause;
  params.push(...dateFilter.params);

  const statusParams = [...params];
  let statusWhere = where;
  if (status === "trash") {
    statusWhere += " AND COALESCE(c.is_trashed, 0) = 1";
  } else {
    statusWhere += " AND COALESCE(c.is_trashed, 0) = 0";
    if (status && ["lead", "progress", "active", "inactive"].includes(status)) {
      statusWhere += " AND c.status = ?";
      statusParams.push(status);
    }
  }

  const [customers, totalRow, counts] = await Promise.all([
    query(
      `SELECT c.*, a.name AS created_by_name,
         (SELECT COUNT(*) FROM appointments ap WHERE ap.customer_id = c.id) AS appointment_count
       FROM customers c LEFT JOIN admins a ON a.id = c.created_by
       ${statusWhere} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...statusParams, limit, offset]
    ),
    queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM customers c ${statusWhere}`, statusParams),
    queryOne<{ all: number; lead: number; progress: number; active: number; inactive: number; trash: number }>(
      `SELECT
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 THEN 1 ELSE 0 END) AS all_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='lead' THEN 1 ELSE 0 END) AS lead_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='progress' THEN 1 ELSE 0 END) AS progress_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='active' THEN 1 ELSE 0 END) AS active_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 0 AND c.status='inactive' THEN 1 ELSE 0 END) AS inactive_count,
         SUM(CASE WHEN COALESCE(c.is_trashed, 0) = 1 THEN 1 ELSE 0 END) AS trash_count
       FROM customers c ${where}`,
      params
    ),
  ]);

  const c = counts as unknown as Record<string, number> | null;
  return NextResponse.json({
    data: customers,
    total: totalRow?.c ?? 0,
    page,
    limit,
    counts: {
      all: c?.all_count ?? 0,
      lead: c?.lead_count ?? 0,
      progress: c?.progress_count ?? 0,
      active: c?.active_count ?? 0,
      inactive: c?.inactive_count ?? 0,
      trash: c?.trash_count ?? 0,
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
  const result = await execute(
    `INSERT INTO customers (tenant_id, name, product, email, phone, address, notes, status, visited, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, d.name, d.product, d.email, d.phone, d.address, d.notes, d.status, d.visited ? 1 : 0, session.id]
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
