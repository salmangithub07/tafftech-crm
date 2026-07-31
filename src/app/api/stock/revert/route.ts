import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const revertStockSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = tenantOf(session)!;
  const body = await req.json().catch(() => null);
  const parsed = revertStockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Fetch product info
  const products = await query<{ name: string; unit: string }>(
    "SELECT name, COALESCE(unit, 'Pcs') as unit FROM products WHERE id = ? AND tenant_id = ?",
    [d.product_id, tenantId]
  );
  if (!products.length) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const prod = products[0];

  // Insert a stock IN transaction to revert stock
  await execute(
    "INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by) VALUES (?, ?, 'in', ?, ?, ?)",
    [tenantId, d.product_id, d.quantity, "[REVERTED] Cancelled stock reduction (No bill/reason provided)", session.id]
  );

  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: "↺ Stock Reduction Reverted (+)",
    entityType: "stock",
    entityId: d.product_id,
    entityLabel: `${prod.name} (+${d.quantity} ${prod.unit} reverted to stock)`,
  });

  return NextResponse.json({ ok: true });
}
