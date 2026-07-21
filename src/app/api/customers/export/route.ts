import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import type { Customer } from "@/lib/types";

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const customers = await query<Customer>(
    "SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC",
    [tenantId]
  );

  const headers = ["id", "name", "product", "phone", "email", "address", "notes", "status", "visited", "created_at"];
  const rows = customers.map((c) => headers.map((h) => csvEscape((c as never)[h])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
