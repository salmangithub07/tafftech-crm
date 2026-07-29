import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureActivityTables } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "customers"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = tenantOf(session)!;
  const { id } = await params;
  const customerId = Number(id);

  if (isNaN(customerId)) {
    return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
  }

  await ensureActivityTables();

  const [customerRows, appointments, bills, quotations, activityLogs] = await Promise.all([
    query(
      `SELECT c.*, a.name AS created_by_name
       FROM customers c
       LEFT JOIN admins a ON a.id = c.created_by
       WHERE c.id = ? AND c.tenant_id = ?`,
      [customerId, tenantId]
    ),
    query(
      `SELECT ap.*, a.name AS created_by_name
       FROM appointments ap
       LEFT JOIN admins a ON a.id = ap.created_by
       WHERE ap.customer_id = ? AND ap.tenant_id = ?
       ORDER BY ap.appointment_date DESC, ap.created_at DESC`,
      [customerId, tenantId]
    ),
    query(
      `SELECT b.*, a.name AS created_by_name
       FROM bills b
       LEFT JOIN admins a ON a.id = b.created_by
       WHERE b.customer_id = ? AND b.tenant_id = ?
       ORDER BY b.bill_date DESC, b.id DESC`,
      [customerId, tenantId]
    ),
    query(
      `SELECT q.*, ap.appointment_date, a.name AS created_by_name
       FROM quotations q
       LEFT JOIN appointments ap ON ap.id = q.appointment_id
       LEFT JOIN admins a ON a.id = q.created_by
       WHERE q.customer_id = ? AND q.tenant_id = ?
       ORDER BY q.quotation_date DESC, q.id DESC`,
      [customerId, tenantId]
    ),
    query(
      `SELECT * FROM activity_log
       WHERE tenant_id = ? AND entity_type = 'customer' AND entity_id = ?
       ORDER BY created_at DESC`,
      [tenantId, customerId]
    ),
  ]);

  if (!customerRows || customerRows.length === 0) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const customer = customerRows[0];

  // Financial summary
  const totalRevenue = bills.reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
  const totalPaid = bills.reduce((sum: number, b: any) => sum + Number(b.paid_amount || 0), 0);
  const outstandingBalance = totalRevenue - totalPaid;

  // Unified Timeline construction
  const timeline: Array<{
    id: string;
    type: "appointment" | "bill" | "quotation" | "activity";
    title: string;
    date: string;
    timestamp: string;
    status?: string;
    amount?: number;
    paidAmount?: number;
    actorName?: string;
    details?: string | null;
    entityId?: number;
  }> = [];

  appointments.forEach((ap: any) => {
    timeline.push({
      id: `appointment-${ap.id}`,
      type: "appointment",
      title: ap.title || "Scheduled Appointment",
      date: ap.appointment_date,
      timestamp: ap.created_at || ap.appointment_date,
      status: ap.status,
      actorName: ap.created_by_name || undefined,
      details: ap.remarks,
      entityId: ap.id,
    });
  });

  bills.forEach((b: any) => {
    timeline.push({
      id: `bill-${b.id}`,
      type: "bill",
      title: `Generated Bill #${b.bill_number}`,
      date: b.bill_date,
      timestamp: b.created_at || b.bill_date,
      amount: Number(b.total_amount),
      paidAmount: Number(b.paid_amount),
      status: b.payment_status,
      actorName: b.created_by_name || undefined,
      details: b.notes,
      entityId: b.id,
    });
  });

  quotations.forEach((q: any) => {
    timeline.push({
      id: `quotation-${q.id}`,
      type: "quotation",
      title: `Issued Quotation #${q.id}`,
      date: q.quotation_date,
      timestamp: q.created_at || q.quotation_date,
      amount: Number(q.quotation_amount),
      status: q.quotation_status,
      actorName: q.created_by_name || undefined,
      details: q.notes,
      entityId: q.id,
    });
  });

  activityLogs.forEach((act: any) => {
    timeline.push({
      id: `activity-${act.id}`,
      type: "activity",
      title: act.action,
      date: act.created_at,
      timestamp: act.created_at,
      actorName: act.actor_name,
      entityId: act.id,
    });
  });

  // Sort unified timeline by timestamp descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    customer,
    summary: {
      totalRevenue,
      totalPaid,
      outstandingBalance,
      appointmentCount: appointments.length,
      billCount: bills.length,
      quotationCount: quotations.length,
    },
    appointments,
    bills,
    quotations,
    timeline,
  });
}
