import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { logActivity, checkAndLogLowStock } from "@/lib/activity";
import { z } from "zod";

const billItemSchema = z.object({
  product_id: z.number().optional().nullable(),
  product_name: z.string().min(1, "Product name required"),
  hsn_code: z.string().optional().or(z.literal("")).default(""),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unit_price: z.coerce.number().min(0, "Unit price must be >= 0"),
  total_price: z.coerce.number().optional(),
});

const createBillSchema = z.object({
  customer_id: z.number().optional().nullable(),
  customer_name: z.string().min(1, "Customer name required"),
  customer_phone: z.string().optional().or(z.literal("")).default(""),
  customer_email: z.string().optional().or(z.literal("")).default(""),
  customer_address: z.string().optional().or(z.literal("")).default(""),
  customer_gst_number: z.string().optional().or(z.literal("")).default(""),
  tax_type: z.enum(["cgst_sgst", "igst", "none"]).optional().default("igst"),
  bill_date: z.string().min(1, "Bill date required"),
  items: z.array(billItemSchema).min(1, "At least one product item required"),
  tax_amount: z.coerce.number().min(0).optional().default(0),
  discount_amount: z.coerce.number().min(0).optional().default(0),
  paid_amount: z.coerce.number().min(0).optional().default(0),
  payment_status: z.enum(["paid", "unpaid", "partial"]).default("paid"),
  payment_method: z.enum(["cash", "bank", "credit", "other"]).default("cash"),
  notes: z.string().optional().or(z.literal("")).default(""),
  book_to: z.string().optional().or(z.literal("")).default(""),
  transport: z.string().optional().or(z.literal("")).default(""),
  gr_no: z.string().optional().or(z.literal("")).default(""),
  vehicle_no: z.string().optional().or(z.literal("")).default(""),
  dispute_note: z.string().optional().or(z.literal("")).default(""),
  // Optional integration flags
  account_id: z.number().optional().nullable(), // Balance Sheet ledger account to record payment
  record_stock_out: z.boolean().optional().default(true), // Auto reduce stock for items (defaults to true)
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  // Auto-heal payment_status for bills where paid_amount >= total_amount
  try {
    await execute(
      "UPDATE bills SET payment_status = 'paid' WHERE tenant_id = ? AND paid_amount >= (total_amount - 0.01) AND payment_status != 'paid'",
      [tenantId]
    );
    await execute(
      "UPDATE bills SET payment_status = 'partial' WHERE tenant_id = ? AND paid_amount > 0 AND paid_amount < (total_amount - 0.01) AND payment_status != 'partial'",
      [tenantId]
    );
    await execute(
      "UPDATE bills SET payment_status = 'unpaid' WHERE tenant_id = ? AND paid_amount = 0 AND payment_status != 'unpaid'",
      [tenantId]
    );
  } catch (err) {
    console.error("Auto-heal payment_status error:", err);
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
  const offset = (page - 1) * limit;

  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const customerId = url.searchParams.get("customer_id") || "";
  const fromDate = url.searchParams.get("from") || "";
  const toDate = url.searchParams.get("to") || "";
  const year = url.searchParams.get("year") || "";
  // DateFilter component sends period + date params
  const period = url.searchParams.get("period") || "";
  const date = url.searchParams.get("date") || "";

  let whereSql = "WHERE b.tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (search) {
    whereSql += " AND (b.bill_number ILIKE ? OR b.customer_name ILIKE ? OR b.customer_phone ILIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status && status !== "all") {
    whereSql += " AND b.payment_status = ?";
    params.push(status);
  }

  if (customerId) {
    whereSql += " AND b.customer_id = ?";
    params.push(parseInt(customerId, 10));
  }

  // Legacy from/to range params
  if (fromDate) {
    whereSql += " AND b.bill_date >= ?";
    params.push(fromDate);
  }
  if (toDate) {
    whereSql += " AND b.bill_date <= ?";
    params.push(toDate);
  }

  // Legacy year param
  if (year && year !== "all") {
    whereSql += " AND EXTRACT(YEAR FROM b.bill_date) = ?";
    params.push(parseInt(year, 10));
  }

  // DateFilter period+date params (takes precedence over legacy params when present)
  if (period && period !== "all" && date) {
    if (period === "day") {
      whereSql += " AND b.bill_date::date = ?::date";
      params.push(date);
    } else if (period === "month") {
      whereSql += " AND TO_CHAR(b.bill_date, 'YYYY-MM') = ?";
      params.push(date);
    } else if (period === "year") {
      whereSql += " AND TO_CHAR(b.bill_date, 'YYYY') = ?";
      params.push(date);
    }
  }

  // Count query
  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM bills b ${whereSql}`,
    params
  );
  const total = parseInt(countRes[0]?.count || "0", 10);

  // Totals summary query
  const summaryRes = await query<{ total_invoiced: number; total_collected: number }>(
    `SELECT 
       COALESCE(SUM(b.total_amount), 0) AS total_invoiced,
       COALESCE(SUM(b.paid_amount), 0) AS total_collected
     FROM bills b ${whereSql}`,
    params
  );
  const totalInvoiced = Number(summaryRes[0]?.total_invoiced || 0);
  const totalCollected = Number(summaryRes[0]?.total_collected || 0);
  const totalPending = totalInvoiced - totalCollected;

  // Data query
  const dataSql = `
    SELECT b.*, a.name AS created_by_name
    FROM bills b
    LEFT JOIN admins a ON a.id = b.created_by
    ${whereSql}
    ORDER BY b.bill_date DESC, b.id DESC
    LIMIT ? OFFSET ?
  `;
  const dataParams = [...params, limit, offset];
  const bills = await query(dataSql, dataParams);

  // Fetch items for these bills if any
  if (bills.length > 0) {
    const billIds = bills.map((b: any) => b.id);
    const placeholders = billIds.map(() => "?").join(",");
    const items = await query(
      `SELECT * FROM bill_items WHERE bill_id IN (${placeholders}) ORDER BY id ASC`,
      billIds
    );
    const itemsMap = new Map<number, any[]>();
    for (const item of items) {
      const bId = (item as any).bill_id;
      if (!itemsMap.has(bId)) itemsMap.set(bId, []);
      itemsMap.get(bId)!.push(item);
    }
    for (const b of bills as any[]) {
      b.items = itemsMap.get(b.id) || [];
    }
  }

  return NextResponse.json({
    data: bills,
    total,
    page,
    limit,
    stats: {
      totalInvoiced,
      totalCollected,
      totalPending,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = createBillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid bill data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Auto-generate bill_number e.g. INV-2026-0001
  const currentYear = new Date(d.bill_date).getFullYear() || new Date().getFullYear();
  const maxBill = await query<{ max_num: number }>(
    `SELECT COALESCE(MAX(id), 0) + 1 AS max_num FROM bills WHERE tenant_id = ?`,
    [tenantId]
  );
  const nextSeq = maxBill[0]?.max_num || 1;
  const billNumber = `INV-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

  // Calculate totals & derive actual payment status
  const subtotal = d.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const totalAmount = subtotal + d.tax_amount - d.discount_amount;
  const paidAmount = d.payment_status === "paid" ? totalAmount : d.payment_status === "unpaid" ? 0 : d.paid_amount;
  let computedStatus: "paid" | "partial" | "unpaid" = "unpaid";
  if (paidAmount >= totalAmount - 0.01) {
    computedStatus = "paid";
  } else if (paidAmount > 0) {
    computedStatus = "partial";
  } else {
    computedStatus = "unpaid";
  }

  // Insert Bill
  const billRes = await execute(
    `INSERT INTO bills (
      tenant_id, bill_number, customer_id, customer_name, customer_phone, customer_email, customer_address, customer_gst_number, tax_type,
      bill_date, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, payment_method,
      notes, book_to, transport, gr_no, vehicle_no, dispute_note, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      billNumber,
      d.customer_id || null,
      d.customer_name,
      d.customer_phone,
      d.customer_email,
      d.customer_address,
      d.customer_gst_number || null,
      d.tax_type || "igst",
      d.bill_date,
      subtotal,
      d.tax_amount,
      d.discount_amount,
      totalAmount,
      paidAmount,
      computedStatus,
      d.payment_method,
      d.notes,
      d.book_to,
      d.transport,
      d.gr_no,
      d.vehicle_no,
      d.dispute_note,
      session.id,
    ]
  );
  const billId = billRes.insertId;

  // Insert Bill Items
  for (const item of d.items) {
    const itemTotal = item.quantity * item.unit_price;
    await execute(
      `INSERT INTO bill_items (bill_id, product_id, product_name, hsn_code, quantity, unit_price, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [billId, item.product_id || null, item.product_name, item.hsn_code || null, item.quantity, item.unit_price, itemTotal]
    );

    // If record_stock_out is true and product_id is valid, record stock out transaction
    if (d.record_stock_out && item.product_id) {
      await execute(
        `INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by)
         VALUES (?, ?, 'out', ?, ?, ?)`,
        [tenantId, item.product_id, item.quantity, `Sold via Bill ${billNumber}`, session.id]
      );
      await checkAndLogLowStock(tenantId, item.product_id, session.id, session.name);
    }
  }

  // If ledger account_id is provided and paid_amount > 0 or unpaid debtor, record in Balance Sheet
  if (d.account_id && session.role === "admin") {
    const account = await query("SELECT id, type FROM ledger_accounts WHERE id = ? AND tenant_id = ?", [
      d.account_id,
      tenantId,
    ]);
    if (account.length > 0) {
      const amountToRecord = paidAmount > 0 ? paidAmount : totalAmount;
      await execute(
        `INSERT INTO ledger_transactions (tenant_id, account_id, entry_date, direction, amount, description, created_by)
         VALUES (?, ?, ?, 'increase', ?, ?, ?)`,
        [
          tenantId,
          d.account_id,
          d.bill_date,
          amountToRecord,
          `Payment received for Bill ${billNumber} (${d.customer_name})`,
          session.id,
        ]
      );
    }
  }

  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: `Generated Bill ${billNumber}`,
    entityType: "bill",
    entityId: billId,
    entityLabel: `${billNumber} - ${d.customer_name}`,
  });

  return NextResponse.json({ id: billId, bill_number: billNumber }, { status: 201 });
}
