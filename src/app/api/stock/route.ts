import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const stockSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  note: z.string().optional().or(z.literal("")).default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const productId = req.nextUrl.searchParams.get("product_id");
  let sql = `SELECT s.*, p.name AS product_name, a.name AS created_by_name
             FROM stock_transactions s
             LEFT JOIN products p ON p.id = s.product_id
             LEFT JOIN admins a ON a.id = s.created_by
             WHERE s.tenant_id = ?`;
  const params: unknown[] = [tenantId];
  if (productId) {
    sql += " AND s.product_id = ?";
    params.push(productId);
  }
  sql += " ORDER BY s.created_at DESC LIMIT 200";

  const transactions = await query(sql, params);
  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = stockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const product = await query("SELECT id, name FROM products WHERE id = ? AND tenant_id = ?", [d.product_id, tenantId]);
  if (!product.length) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const prodName = (product[0] as any).name || "Product";

  await execute(
    "INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [tenantId, d.product_id, d.type, d.quantity, d.note, session.id]
  );

  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: d.type === "in" ? "Stock Increased (+)" : "Stock Decreased (-)",
    entityType: "stock",
    entityId: d.product_id,
    entityLabel: `${prodName} (${d.type === "in" ? "+" : "-"}${d.quantity})`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
