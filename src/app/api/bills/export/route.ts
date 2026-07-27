import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { query } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const url = req.nextUrl;
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const customerId = url.searchParams.get("customer_id") || "";
  const fromDate = url.searchParams.get("from") || "";
  const toDate = url.searchParams.get("to") || "";
  const year = url.searchParams.get("year") || "";

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

  if (fromDate) {
    whereSql += " AND b.bill_date >= ?";
    params.push(fromDate);
  }

  if (toDate) {
    whereSql += " AND b.bill_date <= ?";
    params.push(toDate);
  }

  if (year && year !== "all") {
    whereSql += " AND EXTRACT(YEAR FROM b.bill_date) = ?";
    params.push(parseInt(year, 10));
  }

  const bills = await query<any>(
    `SELECT b.bill_number, b.bill_date, b.customer_name, b.customer_phone, b.subtotal, b.tax_amount,
            b.discount_amount, b.total_amount, b.paid_amount, b.payment_status, b.payment_method,
            b.notes, a.name AS created_by_name, b.created_at
     FROM bills b
     LEFT JOIN admins a ON a.id = b.created_by
     ${whereSql}
     ORDER BY b.bill_date DESC, b.id DESC`,
    params
  );

  const rows = bills.map((b) => ({
    "Bill Number": b.bill_number,
    "Date": b.bill_date,
    "Customer": b.customer_name,
    "Phone": b.customer_phone || "",
    "Subtotal (₹)": b.subtotal,
    "Tax (₹)": b.tax_amount,
    "Discount (₹)": b.discount_amount,
    "Total (₹)": b.total_amount,
    "Paid Amount (₹)": b.paid_amount,
    "Payment Status": b.payment_status.toUpperCase(),
    "Payment Method": b.payment_method.toUpperCase(),
    "Notes": b.notes || "",
    "Created By": b.created_by_name || "",
    "Created At": b.created_at,
  }));

  const csv = Papa.unparse(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bills_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
