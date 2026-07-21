import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

const rowSchema = z.object({
  name: z.string().min(1),
  product: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const d = parsed.data;
    await execute(
      `INSERT INTO customers (tenant_id, name, product, phone, email, address, notes, status, visited, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'lead', 0, ?)`,
      [tenantId, d.name, d.product, d.phone, d.email, d.address, d.notes, session.id]
    );
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
