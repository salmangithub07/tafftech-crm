import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { buildDateFilter } from "@/lib/query-helpers";

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const url = req.nextUrl;
  const filter = url.searchParams.get("filter") || "all"; // all | today | tomorrow | past | trash
  const search = url.searchParams.get("search") || "";
  const period = url.searchParams.get("period") || "";
  const date = url.searchParams.get("date") || "";

  const dateFilter = buildDateFilter("ap.appointment_date", period, date);

  let where = "WHERE ap.tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (filter === "trash") {
    where += " AND COALESCE(ap.is_trashed, 0) = 1";
  } else {
    where += " AND COALESCE(ap.is_trashed, 0) = 0";
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
  }

  if (search) {
    where += " AND (c.name ILIKE ? OR c.phone ILIKE ? OR c.product ILIKE ? OR ap.title ILIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  where += dateFilter.clause;
  params.push(...dateFilter.params);

  const rows = await query<Record<string, unknown>>(
    `SELECT ap.id, c.name AS customer_name, c.phone AS customer_phone, ap.title,
       ap.appointment_date, ap.appointment_time, ap.status, ap.remarks,
       a.name AS created_by, ap.created_at
     FROM appointments ap
     LEFT JOIN customers c ON c.id = ap.customer_id
     LEFT JOIN admins a ON a.id = ap.created_by
     ${where} ORDER BY ap.appointment_date ASC, ap.appointment_time ASC`,
    params
  );

  const headers = ["id", "customer_name", "customer_phone", "title", "appointment_date", "appointment_time", "status", "remarks", "created_by", "created_at"];
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");

  // Build descriptive filename
  const filterLabel = filter !== "all" ? `_${filter}` : "";
  const periodLabel = period && period !== "all" ? `_${period}` : "";
  const filename = `appointments${filterLabel}${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
