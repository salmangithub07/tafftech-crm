import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { buildDateFilter, paginationParams } from "@/lib/query-helpers";
import { ensureActivityTables } from "@/lib/activity";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().optional().or(z.literal("")).default("Pcs"),
  price: z.coerce.number().min(0).default(0),
  min_stock_level: z.coerce.number().int().min(0).default(5),
  quantity: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  await ensureActivityTables();

  const stockFilter = req.nextUrl.searchParams.get("stock"); // all | in | low | out
  const period = req.nextUrl.searchParams.get("period");
  const date = req.nextUrl.searchParams.get("date");
  const { page, limit, offset } = paginationParams(req, 10);

  const dateFilter = buildDateFilter("p.created_at", period, date);

  const base = `
    FROM products p
    LEFT JOIN stock_transactions s ON s.product_id = p.id
    WHERE p.tenant_id = ?${dateFilter.clause}
    GROUP BY p.id`;
  const baseParams = [tenantId, ...dateFilter.params];

  const productsWithStock = await query<{ id: number; stock: number; min_stock_level: number }>(
    `SELECT p.id,
       COALESCE(p.min_stock_level, 5) AS min_stock_level,
       COALESCE(SUM(CASE WHEN s.type='in' THEN s.quantity WHEN s.type='out' THEN -s.quantity ELSE 0 END), 0) AS stock
     ${base}`,
    baseParams
  );
  const allCount = productsWithStock.length;
  const outOfStockCount = productsWithStock.filter((p) => p.stock <= 0).length;
  const lowStockCount = productsWithStock.filter(
    (p) => p.stock > 0 && p.stock <= (p.min_stock_level ?? 5)
  ).length;
  const inStockCount = productsWithStock.filter(
    (p) => p.stock > (p.min_stock_level ?? 5)
  ).length;

  let idsFiltered = productsWithStock.map((p) => p.id);
  if (stockFilter === "in") {
    idsFiltered = productsWithStock.filter((p) => p.stock > (p.min_stock_level ?? 5)).map((p) => p.id);
  } else if (stockFilter === "low") {
    idsFiltered = productsWithStock
      .filter((p) => p.stock > 0 && p.stock <= (p.min_stock_level ?? 5))
      .map((p) => p.id);
  } else if (stockFilter === "out") {
    idsFiltered = productsWithStock.filter((p) => p.stock <= 0).map((p) => p.id);
  }

  const total = idsFiltered.length;
  const pageIds = idsFiltered.slice(offset, offset + limit);

  const products = pageIds.length
    ? await query(
        `SELECT p.*,
           COALESCE(p.min_stock_level, 5) AS min_stock_level,
           COALESCE(SUM(CASE WHEN s.type='in' THEN s.quantity WHEN s.type='out' THEN -s.quantity ELSE 0 END), 0) AS stock
         FROM products p
         LEFT JOIN stock_transactions s ON s.product_id = p.id
         WHERE p.id IN (${pageIds.map(() => "?").join(",")})
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        pageIds
      )
    : [];
  // Preserve the same ordering as the filtered id list (created_at DESC)
  const order = new Map(pageIds.map((id, i) => [id, i]));
  products.sort((a, b) => (order.get((a as { id: number }).id) ?? 0) - (order.get((b as { id: number }).id) ?? 0));

  return NextResponse.json({
    data: products,
    total,
    page,
    limit,
    counts: { all: allCount, in: inStockCount, low: lowStockCount, out: outOfStockCount },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  await ensureActivityTables();

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const result = await execute(
    "INSERT INTO products (tenant_id, name, unit, price, min_stock_level) VALUES (?, ?, ?, ?, ?)",
    [tenantId, d.name, d.unit || "Pcs", d.price, d.min_stock_level]
  );
  if (d.quantity > 0) {
    await execute(
      "INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by) VALUES (?, ?, 'in', ?, 'Initial stock', ?)",
      [tenantId, result.insertId, d.quantity, session.id]
    );
  }

  const product = await query("SELECT * FROM products WHERE id = ?", [result.insertId]);
  return NextResponse.json(product[0], { status: 201 });
}
