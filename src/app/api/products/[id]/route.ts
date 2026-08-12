import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().optional().or(z.literal("")).default("Pcs"),
  price: z.coerce.number().min(0).default(0),
  cost_price: z.coerce.number().min(0).default(0),
  min_stock_level: z.coerce.number().int().min(0).default(5),
  supplier_id: z.coerce.number().int().positive().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const existing = await query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = parsed.data;
  await execute("UPDATE products SET name=?, unit=?, price=?, cost_price=?, min_stock_level=?, supplier_id=? WHERE id=? AND tenant_id=?", [
    d.name,
    d.unit || "Pcs",
    d.price,
    d.cost_price || 0,
    d.min_stock_level,
    d.supplier_id || null,
    id,
    tenantId,
  ]);
  const product = await query(
    "SELECT p.*, l.name AS supplier_name FROM products p LEFT JOIN ledger_accounts l ON l.id = p.supplier_id WHERE p.id = ? AND p.tenant_id = ?",
    [id, tenantId]
  );
  return NextResponse.json(product[0]);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  // Validate required reason
  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "A reason is required to delete a product." }, { status: 400 });
  }

  const existing = await query<{
    id: number;
    name: string;
    unit: string;
    price: number;
    supplier_id: number | null;
    stock: number;
  }>(
    `SELECT p.id, p.name, COALESCE(p.unit, 'Pcs') AS unit, COALESCE(p.price, 0) AS price, p.supplier_id,
       COALESCE(SUM(CASE WHEN s.type='in' THEN s.quantity WHEN s.type='out' THEN -s.quantity ELSE 0 END), 0) AS stock
     FROM products p
     LEFT JOIN stock_transactions s ON s.product_id = p.id
     WHERE p.id = ? AND p.tenant_id = ?
     GROUP BY p.id`,
    [id, tenantId]
  );
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prod = existing[0];
  const currentStock = Math.max(Number(prod.stock || 0), 0);
  const creditorAccountId = body?.creditor_account_id ? Number(body.creditor_account_id) : prod.supplier_id;

  // If product is linked to a Creditor / Supplier and has stock/value remaining,
  // update the Balance Sheet Creditor account by logging a 'decrease' ledger transaction
  if (creditorAccountId && currentStock > 0 && Number(prod.price) > 0) {
    const creditorAcc = await query(
      "SELECT id, name FROM ledger_accounts WHERE id = ? AND tenant_id = ? AND type = 'creditor'",
      [creditorAccountId, tenantId]
    );
    if (creditorAcc.length > 0) {
      const stockValue = currentStock * Number(prod.price);
      const todayStr = new Date().toISOString().slice(0, 10);
      await execute(
        `INSERT INTO ledger_transactions (tenant_id, account_id, entry_date, direction, amount, description, created_by)
         VALUES (?, ?, ?, 'decrease', ?, ?, ?)`,
        [
          tenantId,
          creditorAccountId,
          todayStr,
          stockValue,
          `Stock removed (Product deleted): ${prod.name} (${currentStock} ${prod.unit}) — Reason: ${reason}`,
          session.id,
        ]
      );
    }
  }

  // Log audit entry in stock_transactions with NULL product_id and [DELETED] prefix before deleting product
  await execute(
    "INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by) VALUES (?, NULL, 'out', ?, ?, ?)",
    [
      tenantId,
      currentStock,
      `[DELETED] ${prod.name} — Reason: ${reason}`,
      session.id,
    ]
  );

  await execute("DELETE FROM products WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return NextResponse.json({ ok: true });
}
