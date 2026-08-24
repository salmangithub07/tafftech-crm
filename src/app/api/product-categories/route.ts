import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables } from "@/lib/activity";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export async function GET() {
  await ensureActivityTables();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const categories = await query(
    `SELECT * FROM product_categories WHERE tenant_id = ? ORDER BY name ASC`,
    [tenantId]
  );

  return NextResponse.json({ data: categories });
}

export async function POST(req: NextRequest) {
  await ensureActivityTables();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }

  // Check duplicate
  const existing = await query(
    `SELECT id FROM product_categories WHERE tenant_id = ? AND LOWER(name) = LOWER(?)`,
    [tenantId, parsed.data.name.trim()]
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: "Category already exists" }, { status: 400 });
  }

  const result = await execute(
    `INSERT INTO product_categories (tenant_id, name) VALUES (?, ?)`,
    [tenantId, parsed.data.name.trim()]
  );

  const newCat = await query(
    `SELECT * FROM product_categories WHERE id = ?`,
    [result.insertId]
  );

  return NextResponse.json({ data: newCat[0] }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await ensureActivityTables();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 });

  await execute(
    `DELETE FROM product_categories WHERE id = ? AND tenant_id = ?`,
    [Number(id), tenantId]
  );

  // Set category_id to NULL on products using this category
  await execute(
    `UPDATE products SET category_id = NULL WHERE category_id = ? AND tenant_id = ?`,
    [Number(id), tenantId]
  );

  return NextResponse.json({ success: true });
}
