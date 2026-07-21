import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

const rowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().default(""),
  price: z.coerce.number().min(0).optional().default(0),
  stock: z.coerce.number().int().min(0).optional().default(0),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const d = parsed.data;
    const result = await execute("INSERT INTO products (tenant_id, name, sku, price) VALUES (?, ?, ?, ?)", [
      tenantId,
      d.name,
      d.sku,
      d.price,
    ]);
    if (d.stock > 0) {
      await execute(
        "INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by) VALUES (?, ?, 'in', ?, 'Imported opening stock', ?)",
        [tenantId, result.insertId, d.stock, session.id]
      );
    }
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
