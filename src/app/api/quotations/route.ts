import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { buildDateFilter, paginationParams } from "@/lib/query-helpers";
import { logActivity, ensureActivityTables } from "@/lib/activity";
import { z } from "zod";

const quotationItemSchema = z.object({
  product_id: z.coerce.number().int().optional().nullable(),
  product_name: z.string().min(1, "Product name is required"),
  hsn_code: z.string().optional().or(z.literal("")).default(""),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Unit price must be >= 0"),
});

const createQuotationSchema = z.object({
  appointment_id: z.coerce.number().int().optional().nullable(),
  customer_id: z.coerce.number().int().optional().nullable(),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional().or(z.literal("")).default(""),
  customer_address: z.string().optional().or(z.literal("")).default(""),
  customer_gst_number: z.string().optional().or(z.literal("")).default(""),
  tax_type: z.enum(["cgst_sgst", "igst", "none"]).optional().default("igst"),
  quotation_date: z.string().default(() => new Date().toISOString().slice(0, 10)),
  book_to: z.string().optional().or(z.literal("")).default(""),
  transport: z.string().optional().or(z.literal("")).default(""),
  gr_no: z.string().optional().or(z.literal("")).default(""),
  vehicle_no: z.string().optional().or(z.literal("")).default(""),
  dispute_note: z.string().optional().or(z.literal("")).default(""),
  items: z.array(quotationItemSchema).min(1, "At least one product item is required"),
  discount_amount: z.coerce.number().min(0).default(0),
  tax_percent: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")).default(""),
  quotation_status: z.enum(["pending", "accepted", "rejected"]).default("pending"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "quotations"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;

    await ensureActivityTables();

    const status = req.nextUrl.searchParams.get("status");
    const period = req.nextUrl.searchParams.get("period");
    const date = req.nextUrl.searchParams.get("date");
    const { page, limit, offset } = paginationParams(req, 10);

    const dateFilter = buildDateFilter("q.quotation_date", period, date);
    const baseWhere = " WHERE q.tenant_id = ?" + dateFilter.clause;
    const baseParams = [tenantId, ...dateFilter.params];

    let where = baseWhere;
    const params = [...baseParams];

    if (status === "trash") {
      where += " AND COALESCE(q.is_trashed, 0) = 1";
    } else {
      where += " AND COALESCE(q.is_trashed, 0) = 0";
      if (status && ["pending", "accepted", "rejected"].includes(status)) {
        where += " AND q.quotation_status = ?";
        params.push(status);
      }
    }

    const [quotations, totalRow, counts] = await Promise.all([
      query(
        `SELECT q.*, COALESCE(q.customer_name, c.name) AS customer_name, a.name AS created_by_name
         FROM quotations q
         LEFT JOIN customers c ON c.id = q.customer_id
         LEFT JOIN admins a ON a.id = q.created_by
         ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM quotations q ${where}`, params),
      queryOne<Record<string, number>>(
        `SELECT 
           SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 0 THEN 1 ELSE 0 END) AS all_count,
           SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 0 AND q.quotation_status='pending' THEN 1 ELSE 0 END) AS pending_count,
           SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 0 AND q.quotation_status='accepted' THEN 1 ELSE 0 END) AS accepted_count,
           SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 0 AND q.quotation_status='rejected' THEN 1 ELSE 0 END) AS rejected_count,
           SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 1 THEN 1 ELSE 0 END) AS trash_count,
           COALESCE(SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 0 THEN COALESCE(q.total_amount, q.quotation_amount, 0) ELSE 0 END), 0) AS total_value,
           COALESCE(SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 0 AND q.quotation_status='accepted' THEN COALESCE(q.total_amount, q.quotation_amount, 0) ELSE 0 END), 0) AS accepted_value,
           COALESCE(SUM(CASE WHEN COALESCE(q.is_trashed, 0) = 0 AND q.quotation_status='pending' THEN COALESCE(q.total_amount, q.quotation_amount, 0) ELSE 0 END), 0) AS pending_value
         FROM quotations q ${baseWhere}`,
        baseParams
      ),
    ]);

    return NextResponse.json({
      data: quotations,
      total: totalRow?.c ?? 0,
      page,
      limit,
      counts: {
        all: counts?.all_count ?? 0,
        pending: counts?.pending_count ?? 0,
        accepted: counts?.accepted_count ?? 0,
        rejected: counts?.rejected_count ?? 0,
        trash: counts?.trash_count ?? 0,
      },
      stats: {
        totalValue: Number(counts?.total_value ?? 0),
        acceptedValue: Number(counts?.accepted_value ?? 0),
        pendingValue: Number(counts?.pending_value ?? 0),
      },
    });
  } catch (err: any) {
    console.error("Error fetching quotations:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(session, "quotations"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = tenantOf(session)!;

    await ensureActivityTables();

    const body = await req.json().catch(() => null);
    const parsed = createQuotationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid quotation data" },
        { status: 400 }
      );
    }
    const d = parsed.data;

    // Auto-generate quotation_number e.g. QT-2026-0001
    const currentYear = new Date(d.quotation_date).getFullYear() || new Date().getFullYear();
    const maxQuote = await query<{ max_num: number }>(
      `SELECT COALESCE(MAX(id), 0) + 1 AS max_num FROM quotations WHERE tenant_id = ?`,
      [tenantId]
    );
    const nextSeq = maxQuote[0]?.max_num || 1;
    const quotationNumber = `QT-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

    // Calculate totals
    const subtotal = d.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const totalAmount = Math.max(0, subtotal + d.tax_amount - d.discount_amount);

    const result = await execute(
      `INSERT INTO quotations (
        tenant_id, quotation_number, appointment_id, customer_id, customer_name, customer_phone, customer_address, customer_gst_number, tax_type,
        quotation_date, book_to, transport, gr_no, vehicle_no, dispute_note,
        subtotal, tax_percent, tax_amount, discount_amount, quotation_amount, total_amount,
        quotation_status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        quotationNumber,
        d.appointment_id || null,
        d.customer_id || null,
        d.customer_name,
        d.customer_phone,
        d.customer_address,
        d.customer_gst_number || null,
        d.tax_type || "igst",
        d.quotation_date,
        d.book_to,
        d.transport,
        d.gr_no,
        d.vehicle_no,
        d.dispute_note,
        subtotal,
        d.tax_percent,
        d.tax_amount,
        d.discount_amount,
        totalAmount,
        totalAmount,
        d.quotation_status,
        d.notes,
        session.id,
      ]
    );

    const quotationId = result.insertId;

    // Insert quotation items
    for (const item of d.items) {
      const itemTotal = item.quantity * item.unit_price;
      await execute(
        `INSERT INTO quotation_items (
          tenant_id, quotation_id, product_id, product_name, hsn_code, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          quotationId,
          item.product_id || null,
          item.product_name,
          item.hsn_code || "",
          item.quantity,
          item.unit_price,
          itemTotal,
        ]
      );
    }

    // If created from an appointment, mark appointment as completed
    if (d.appointment_id) {
      await execute("UPDATE appointments SET status = 'completed' WHERE id = ? AND tenant_id = ?", [
        d.appointment_id,
        tenantId,
      ]);
    }

    const quotationRows = await query(`SELECT * FROM quotations WHERE id = ?`, [quotationId]);
    const itemRows = await query(`SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id ASC`, [quotationId]);

    const createdQuotation = {
      ...quotationRows[0],
      items: itemRows,
    };

    logActivity({
      tenantId,
      actorId: session.id,
      actorName: session.name,
      action: "Created Quotation",
      entityType: "quotation",
      entityId: quotationId,
      entityLabel: `${d.customer_name} (${quotationNumber} — ₹${totalAmount.toLocaleString("en-IN")})`,
    });

    return NextResponse.json(createdQuotation, { status: 201 });
  } catch (err: any) {
    console.error("Error creating quotation:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create quotation due to server error." },
      { status: 500 }
    );
  }
}
