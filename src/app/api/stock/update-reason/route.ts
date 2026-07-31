import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const updateReasonSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  reason: z.string().min(1, "Audit reason is required"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = tenantOf(session)!;
  const body = await req.json().catch(() => null);
  const parsed = updateReasonSchema.safeParse(body);
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

  // Find latest stock transaction for this product of type 'out'
  const txs = await query<{ id: number; quantity: number; note: string }>(
    `SELECT id, quantity, note FROM stock_transactions
     WHERE tenant_id = ? AND product_id = ? AND type = 'out'
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, d.product_id]
  );

  const auditNote = `[NO BILL GENERATED] Audit Reason: ${d.reason}`;

  if (txs.length > 0) {
    const txId = txs[0].id;
    await execute(
      "UPDATE stock_transactions SET note = ? WHERE id = ? AND tenant_id = ?",
      [auditNote, txId, tenantId]
    );
  }

  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: "⚠️ Stock Reduction Audit Reason Logged",
    entityType: "stock",
    entityId: d.product_id,
    entityLabel: `${prod.name} (${auditNote})`,
  });

  return NextResponse.json({ ok: true });
}
