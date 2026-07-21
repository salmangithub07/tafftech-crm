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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const assets = await query(
    "SELECT * FROM fixed_assets WHERE tenant_id = ? ORDER BY created_at ASC",
    [tenantId]
  );
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const result = await execute(
    "INSERT INTO fixed_assets (tenant_id, name, quantity, unit_value, notes) VALUES (?, ?, ?, ?, ?)",
    [tenantId, d.name, d.quantity, d.unit_value, d.notes]
  );
  const asset = await query("SELECT * FROM fixed_assets WHERE id = ?", [result.insertId]);
  return NextResponse.json(asset[0], { status: 201 });
}
