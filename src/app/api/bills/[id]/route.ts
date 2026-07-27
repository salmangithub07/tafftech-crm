import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const bills = await query(
    `SELECT b.*, a.name AS created_by_name
     FROM bills b
     LEFT JOIN admins a ON a.id = b.created_by
     WHERE b.id = ? AND b.tenant_id = ?`,
    [id, tenantId]
  );
  if (!bills.length) return NextResponse.json({ error: "Bill not found." }, { status: 404 });

  const bill = bills[0] as any;
  bill.items = await query("SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC", [id]);

  return NextResponse.json(bill);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const res = await execute("DELETE FROM bills WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (res.affectedRows === 0) {
    return NextResponse.json({ error: "Bill not found or permission denied." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
