import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { logActivity, checkAndLogLowStock } from "@/lib/activity";
import { z } from "zod";

const stockSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  note: z.string().optional().or(z.literal("")).default(""),
  creditor_account_id: z.number().optional().nullable(),
});

import { buildDateFilter, paginationParams } from "@/lib/query-helpers";
import { queryOne } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const productId = req.nextUrl.searchParams.get("product_id");
  const searchQ = req.nextUrl.searchParams.get("search")?.trim();
  const isPaginated = req.nextUrl.searchParams.has("page");
  const { page, limit, offset } = paginationParams(req, 10);

  let where = " WHERE s.tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (productId) {
    where += " AND s.product_id = ?";
    params.push(productId);
  }

  if (searchQ) {
    where += " AND (p.name ILIKE ? OR s.note ILIKE ? OR a.name ILIKE ?)";
    const like = `%${searchQ}%`;
    params.push(like, like, like);
  }

  if (isPaginated) {
    const [transactions, totalRow] = await Promise.all([
      query(
        `SELECT s.*, p.name AS product_name, a.name AS created_by_name
         FROM stock_transactions s
         LEFT JOIN products p ON p.id = s.product_id
         LEFT JOIN admins a ON a.id = s.created_by
         ${where}
         ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      queryOne<{ c: number }>(
        `SELECT COUNT(*) as c
         FROM stock_transactions s
         LEFT JOIN products p ON p.id = s.product_id
         LEFT JOIN admins a ON a.id = s.created_by
         ${where}`,
        params
      ),
    ]);

    return NextResponse.json({
      data: transactions,
      total: Number(totalRow?.c || 0),
      page,
      limit,
    });
  }

  const transactions = await query(
    `SELECT s.*, p.name AS product_name, a.name AS created_by_name
     FROM stock_transactions s
     LEFT JOIN products p ON p.id = s.product_id
     LEFT JOIN admins a ON a.id = s.created_by
     ${where}
     ORDER BY s.created_at DESC LIMIT 200`,
    params
  );
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

  const productRes = await query<{ id: number; name: string; price: number; unit: string }>(
    "SELECT id, name, price, COALESCE(unit, 'Pcs') as unit FROM products WHERE id = ? AND tenant_id = ?",
    [d.product_id, tenantId]
  );
  if (!productRes.length) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const prod = productRes[0];
  const prodName = prod.name || "Product";

  await execute(
    "INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [tenantId, d.product_id, d.type, d.quantity, d.note, session.id]
  );

  // If Stock IN and Creditor Account is selected, record purchase in Balance Sheet Creditor account
  if (d.type === "in" && d.creditor_account_id) {
    const creditorAcc = await query("SELECT id, name FROM ledger_accounts WHERE id = ? AND tenant_id = ? AND type = 'creditor'", [
      d.creditor_account_id,
      tenantId,
    ]);
    if (creditorAcc.length > 0) {
      const totalCost = Number(prod.price || 0) * d.quantity;
      const todayStr = new Date().toISOString().slice(0, 10);
      await execute(
        `INSERT INTO ledger_transactions (tenant_id, account_id, entry_date, direction, amount, description, created_by)
         VALUES (?, ?, ?, 'increase', ?, ?, ?)`,
        [
          tenantId,
          d.creditor_account_id,
          todayStr,
          totalCost,
          `Stock purchase: ${prodName} (${d.quantity} ${prod.unit})${d.note ? ` - ${d.note}` : ""}`,
          session.id,
        ]
      );
    }
  }

  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: d.type === "in" ? "Stock Increased (+)" : "Stock Decreased (-)",
    entityType: "stock",
    entityId: d.product_id,
    entityLabel: `${prodName} (${d.type === "in" ? "+" : "-"}${d.quantity} ${prod.unit})`,
  });

  if (d.type === "out") {
    await checkAndLogLowStock(tenantId, d.product_id, session.id, session.name);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
