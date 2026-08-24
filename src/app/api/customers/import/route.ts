import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getPlanLimits } from "@/lib/subscription";
import { z } from "zod";

const rowSchema = z.object({
  name: z.string().min(1),
  product: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: z.string().optional().default("lead"),
  visited: z.any().optional().default(0),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const rows = Array.isArray(body?.customers)
    ? body.customers
    : Array.isArray(body?.rows)
    ? body.rows
    : Array.isArray(body)
    ? body
    : [];

  // Check customer limits before importing
  const superAdminSettings = await getSettings(0);
  const tenantAdmin = await queryOne<{ plan_type: string }>("SELECT plan_type FROM admins WHERE id = ?", [tenantId]);
  const limits = getPlanLimits(tenantAdmin?.plan_type, superAdminSettings);

  if (limits.maxCustomers !== -1) {
    const custCountRow = await queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM customers WHERE tenant_id = ? AND COALESCE(is_trashed, 0) = 0",
      [tenantId]
    );
    const currentCustomers = Number(custCountRow?.count || 0);
    if (currentCustomers + rows.length > limits.maxCustomers) {
      return NextResponse.json(
        {
          error: `Importing ${rows.length} customers will exceed your plan's customer limit of ${limits.maxCustomers} (Current: ${currentCustomers}). Please upgrade your subscription plan.`,
        },
        { status: 403 }
      );
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const d = parsed.data;
    const rawStatus = String(d.status || "").toLowerCase().trim();
    let normStatus = rawStatus;
    if (rawStatus === "inactive" || rawStatus === "complete") normStatus = "completed";
    if (rawStatus === "order soon" || rawStatus === "order_soon") normStatus = "order_soon";

    const statusVal = ["lead", "progress", "active", "completed", "order_soon"].includes(normStatus)
      ? normStatus
      : "lead";
    const visitedVal = d.visited === true || d.visited === 1 || d.visited === "1" || String(d.visited).toLowerCase() === "true" ? 1 : 0;

    await execute(
      `INSERT INTO customers (tenant_id, name, product, phone, email, address, notes, status, visited, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, d.name, d.product, d.phone, d.email, d.address, d.notes, statusVal, visitedVal, session.id]
    );
    inserted++;
  }

  return NextResponse.json({
    inserted,
    skipped,
    importedCount: inserted,
    skippedCount: skipped,
  });
}
