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
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const products = await query<Record<string, unknown>>(
    `SELECT p.id, p.name, p.sku, p.price,
       COALESCE(SUM(CASE WHEN s.type='in' THEN s.quantity WHEN s.type='out' THEN -s.quantity ELSE 0 END), 0) AS stock,
       p.created_at
     FROM products p
     LEFT JOIN stock_transactions s ON s.product_id = p.id
     WHERE p.tenant_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [tenantId]
  );

  const headers = ["id", "name", "sku", "price", "stock", "created_at"];
  const csv = [headers.join(","), ...products.map((p) => headers.map((h) => csvEscape(p[h])).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
