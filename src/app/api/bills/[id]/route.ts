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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid bill data." }, { status: 400 });

  const items = Array.isArray(body.items) ? body.items : [];
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );
  const taxAmount = Number(body.tax_amount) || 0;
  const discountAmount = Number(body.discount_amount) || 0;
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

  let paidAmount = Number(body.paid_amount) || 0;
  if (body.payment_status === "paid") {
    paidAmount = totalAmount;
  } else if (body.payment_status === "unpaid") {
    paidAmount = 0;
  }

  let computedStatus: "paid" | "partial" | "unpaid" = "unpaid";
  if (paidAmount >= totalAmount - 0.01) {
    computedStatus = "paid";
  } else if (paidAmount > 0) {
    computedStatus = "partial";
  } else {
    computedStatus = "unpaid";
  }

  const res = await execute(
    `UPDATE bills SET
      customer_id = ?, customer_name = ?, customer_phone = ?, customer_email = ?, customer_address = ?, customer_gst_number = ?, tax_type = ?,
      bill_date = ?, subtotal = ?, tax_amount = ?, discount_amount = ?, total_amount = ?, paid_amount = ?, payment_status = ?, payment_method = ?,
      notes = ?, document_title = ?, dispatched_from = ?, book_to = ?, transport = ?, gr_no = ?, vehicle_no = ?, dispute_note = ?
     WHERE id = ? AND tenant_id = ?`,
    [
      body.customer_id || null,
      body.customer_name || "",
      body.customer_phone || "",
      body.customer_email || "",
      body.customer_address || "",
      body.customer_gst_number || null,
      body.tax_type || "igst",
      body.bill_date || new Date().toISOString().slice(0, 10),
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount,
      computedStatus,
      body.payment_method || "cash",
      body.notes || "",
      body.document_title || "TAX INVOICE",
      body.dispatched_from || "",
      body.book_to || "",
      body.transport || "",
      body.gr_no || "",
      body.vehicle_no || "",
      body.dispute_note || "",
      id,
      tenantId,
    ]
  );

  if (res.affectedRows === 0) {
    return NextResponse.json({ error: "Bill not found or permission denied." }, { status: 404 });
  }

  // Delete existing bill items and reinsert
  await execute("DELETE FROM bill_items WHERE bill_id = ?", [id]);

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    await execute(
      `INSERT INTO bill_items (bill_id, product_id, product_name, hsn_code, quantity, unit_price, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.product_id || null,
        item.product_name || "",
        item.hsn_code || null,
        qty,
        price,
        qty * price,
      ]
    );
  }

  return NextResponse.json({ ok: true, id });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid data." }, { status: 400 });

  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = [
    "document_title",
    "dispatched_from",
    "book_to",
    "transport",
    "gr_no",
    "vehicle_no",
    "dispute_note",
  ];

  for (const f of allowedFields) {
    if (f in body) {
      fields.push(`${f} = ?`);
      values.push(body[f] || "");
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ ok: true, message: "No fields to update." });
  }

  values.push(id, tenantId);
  const res = await execute(
    `UPDATE bills SET ${fields.join(", ")} WHERE id = ? AND tenant_id = ?`,
    values
  );

  if (res.affectedRows === 0) {
    return NextResponse.json({ error: "Bill not found or permission denied." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id });
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
