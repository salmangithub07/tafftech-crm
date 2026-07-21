import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const rows = await query<Record<string, unknown>>(
    `SELECT ap.id, c.name AS customer_name, c.phone AS customer_phone, ap.title,
       ap.appointment_date, ap.appointment_time, ap.status, ap.remarks, ap.created_at
     FROM appointments ap LEFT JOIN customers c ON c.id = ap.customer_id
     WHERE ap.tenant_id = ? ORDER BY ap.appointment_date DESC`,
    [tenantId]
  );

  const headers = ["id", "customer_name", "customer_phone", "title", "appointment_date", "appointment_time", "status", "remarks", "created_at"];
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
