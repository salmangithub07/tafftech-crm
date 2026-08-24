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
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const url = req.nextUrl;
  const status = url.searchParams.get("status") || url.searchParams.get("filter") || "";
  const search = url.searchParams.get("search") || "";
  const period = url.searchParams.get("period") || "";
  const date = url.searchParams.get("date") || "";

  const dateFilter = buildDateFilter("c.created_at", period, date);

  let where = "WHERE c.tenant_id = ?";
  const params: unknown[] = [tenantId];

  // Exclude trashed unless explicitly requesting trash
  if (status === "trash") {
    where += " AND COALESCE(c.is_trashed, 0) = 1";
  } else {
    where += " AND COALESCE(c.is_trashed, 0) = 0";
    if (status && ["lead", "progress", "active", "completed", "order_soon"].includes(status)) {
      where += " AND c.status = ?";
      params.push(status);
    }
  }

  if (search) {
    where += " AND (c.name ILIKE ? OR c.phone ILIKE ? OR c.product ILIKE ? OR c.email ILIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  where += dateFilter.clause;
  params.push(...dateFilter.params);

  const customers = await query<Record<string, unknown>>(
    `SELECT c.id, c.name, c.product, c.phone, c.email, c.address, c.notes,
            c.status, c.visited, a.name AS created_by, c.created_at
     FROM customers c LEFT JOIN admins a ON a.id = c.created_by
     ${where} ORDER BY c.created_at DESC`,
    params
  );

  const headers = ["id", "name", "product", "phone", "email", "address", "notes", "status", "visited", "created_by", "created_at"];
  const rows = customers.map((c) => headers.map((h) => csvEscape(c[h])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");

  // Build descriptive filename
  const statusLabel = status && status !== "" ? `_${status}` : "";
  const periodLabel = period && period !== "all" ? `_${period}` : "";
  const filename = `customers${statusLabel}${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
