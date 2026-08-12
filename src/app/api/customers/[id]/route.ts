import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables } from "@/lib/activity";
import { z } from "zod";
import type { CustomerStatus } from "@/lib/types";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  product: z.string().optional().or(z.literal("")).default(""),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")).default(""),
  phone: z.string().optional().or(z.literal("")).default(""),
  address: z.string().optional().or(z.literal("")).default(""),
  notes: z.string().optional().or(z.literal("")).default(""),
  status: z.enum(["lead", "progress", "active", "inactive"]).default("lead"),
  visited: z.boolean().default(false),
  created_by: z.coerce.number().int().positive().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await ensureActivityTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "customers"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;
    const { id } = await params;
    const custId = parseInt(id, 10);

    const body = await req.json().catch(() => null);
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const existing = await query<{ id: number; created_by: number | null }>(
      "SELECT id, created_by FROM customers WHERE id = ? AND tenant_id = ?",
      [custId, tenantId]
    );
    if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = parsed.data;
    const createdBy = d.created_by || existing[0].created_by || session.id;

    await execute(
      `UPDATE customers SET name=?, product=?, email=?, phone=?, address=?, notes=?, status=?, visited=?, created_by=? WHERE id=? AND tenant_id=?`,
      [d.name, d.product, d.email, d.phone, d.address, d.notes, d.status, d.visited ? 1 : 0, createdBy, custId, tenantId]
    );

    const customer = await query("SELECT * FROM customers WHERE id = ? AND tenant_id = ?", [custId, tenantId]);
    return NextResponse.json(customer[0]);
  } catch (err: any) {
    console.error("Error updating customer:", err);
    return NextResponse.json({ error: err.message || "Failed to update customer" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await ensureActivityTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "customers"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;
    const { id } = await params;
    const custId = parseInt(id, 10);

    const body = await req.json().catch(() => null);
    const status = body?.status as CustomerStatus;

    if (!["lead", "progress", "active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await execute(
      "UPDATE customers SET status = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?",
      [status, custId, tenantId]
    );

    const updated = await queryOne("SELECT * FROM customers WHERE id = ? AND tenant_id = ?", [custId, tenantId]);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Error updating customer status:", err);
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await ensureActivityTables();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "customers"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;
    const { id } = await params;
    const custId = parseInt(id, 10);

    const existing = await query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [custId, tenantId]);
    if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await execute("DELETE FROM customers WHERE id = ? AND tenant_id = ?", [custId, tenantId]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error deleting customer:", err);
    return NextResponse.json({ error: err.message || "Failed to delete customer" }, { status: 500 });
  }
}
