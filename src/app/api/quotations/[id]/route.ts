import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "quotations")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const quotations = await query(
    `SELECT q.*, COALESCE(q.customer_name, c.name) AS customer_name, a.name AS created_by_name
     FROM quotations q
     LEFT JOIN customers c ON c.id = q.customer_id
     LEFT JOIN admins a ON a.id = q.created_by
     WHERE q.id = ? AND q.tenant_id = ?`,
    [id, tenantId]
  );
  if (!quotations.length) return NextResponse.json({ error: "Quotation not found." }, { status: 404 });

  const quotation = quotations[0] as any;
  quotation.items = await query("SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id ASC", [id]);

  return NextResponse.json(quotation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "quotations")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const body = await req.json().catch(() => null);
  const status = body?.quotation_status;
  if (!status || !["pending", "accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid quotation status." }, { status: 400 });
  }

  const res = await execute("UPDATE quotations SET quotation_status = ? WHERE id = ? AND tenant_id = ?", [
    status,
    id,
    tenantId,
  ]);
  if (res.affectedRows === 0) {
    return NextResponse.json({ error: "Quotation not found or permission denied." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, quotation_status: status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "quotations")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid quotation data." }, { status: 400 });

  const items = Array.isArray(body.items) ? body.items : [];
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );
  const taxAmount = Number(body.tax_amount) || 0;
  const discountAmount = Number(body.discount_amount) || 0;
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

  const res = await execute(
    `UPDATE quotations SET
      customer_id = ?, customer_name = ?, customer_phone = ?, customer_address = ?, customer_gst_number = ?, tax_type = ?,
      quotation_date = ?, book_to = ?, transport = ?, gr_no = ?, vehicle_no = ?, dispute_note = ?,
      subtotal = ?, tax_percent = ?, tax_amount = ?, discount_amount = ?, quotation_amount = ?, total_amount = ?,
      notes = ?
     WHERE id = ? AND tenant_id = ?`,
    [
      body.customer_id || null,
      body.customer_name || "",
      body.customer_phone || "",
      body.customer_address || "",
      body.customer_gst_number || null,
      body.tax_type || "igst",
      body.quotation_date || new Date().toISOString().slice(0, 10),
      body.book_to || "",
      body.transport || "",
      body.gr_no || "",
      body.vehicle_no || "",
      body.dispute_note || "",
      subtotal,
      body.tax_percent || 0,
      taxAmount,
      discountAmount,
      totalAmount,
      totalAmount,
      body.notes || "",
      id,
      tenantId,
    ]
  );

  if (res.affectedRows === 0) {
    return NextResponse.json({ error: "Quotation not found or permission denied." }, { status: 404 });
  }

  // Delete existing items and insert updated items
  await execute("DELETE FROM quotation_items WHERE quotation_id = ?", [id]);

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    await execute(
      `INSERT INTO quotation_items (
        tenant_id, quotation_id, product_id, product_name, hsn_code, quantity, unit_price, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        id,
        item.product_id || null,
        item.product_name || "",
        item.hsn_code || "",
        qty,
        price,
        qty * price,
      ]
    );
  }

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "quotations")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const isPermanent = req.nextUrl.searchParams.get("permanent") === "true";

  if (isPermanent) {
    const res = await execute("DELETE FROM quotations WHERE id = ? AND tenant_id = ?", [id, tenantId]);
    if (res.affectedRows === 0) {
      return NextResponse.json({ error: "Quotation not found or permission denied." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, permanent: true });
  }

  // Soft delete / Move to trash
  const res = await execute("UPDATE quotations SET is_trashed = 1 WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (res.affectedRows === 0) {
    return NextResponse.json({ error: "Quotation not found or permission denied." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, trashed: true });
}
