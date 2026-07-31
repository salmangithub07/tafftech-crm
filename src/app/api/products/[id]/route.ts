import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().optional().or(z.literal("")).default("Pcs"),
  price: z.coerce.number().min(0).default(0),
  min_stock_level: z.coerce.number().int().min(0).default(5),
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
  await execute("UPDATE products SET name=?, unit=?, price=?, min_stock_level=? WHERE id=? AND tenant_id=?", [
    d.name,
    d.unit || "Pcs",
    d.price,
    d.min_stock_level,
    id,
    tenantId,
  ]);
  const product = await query("SELECT * FROM products WHERE id = ?", [id]);
  return NextResponse.json(product[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM products WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return NextResponse.json({ ok: true });
}
