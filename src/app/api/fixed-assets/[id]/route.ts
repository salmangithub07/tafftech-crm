import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { z } from "zod";

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.coerce.number().int().min(1).default(1),
  unit_value: z.coerce.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")).default(""),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM fixed_assets WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  await execute(
    "UPDATE fixed_assets SET name = ?, quantity = ?, unit_value = ?, notes = ? WHERE id = ? AND tenant_id = ?",
    [d.name, d.quantity, d.unit_value, d.notes, id, tenantId]
  );
  const asset = await query("SELECT * FROM fixed_assets WHERE id = ?", [id]);
  return NextResponse.json(asset[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM fixed_assets WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM fixed_assets WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return NextResponse.json({ ok: true });
}
