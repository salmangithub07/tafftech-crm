import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = tenantOf(session);
  if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

  const timeframe = req.nextUrl.searchParams.get("timeframe") || "daily"; // daily | weekly | yearly
  const daysParam = Number(req.nextUrl.searchParams.get("days")) || 30; // 7, 14, 30
  const yearParam = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();

  let startDate: Date;
  let endDate: Date = new Date();
  let truncUnit: "day" | "week" | "month" = "day";

  if (timeframe === "weekly") {
    truncUnit = "week";
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 12 * 7); // 12 weeks ago
  } else if (timeframe === "yearly") {
    truncUnit = "month";
    startDate = new Date(yearParam, 0, 1);
    endDate = new Date(yearParam, 11, 31, 23, 59, 59);
  } else {
    // daily
    truncUnit = "day";
    startDate = new Date();
    startDate.setDate(startDate.getDate() - daysParam);
  }

  const startIso = startDate.toISOString().slice(0, 10);
  const endIso = endDate.toISOString().slice(0, 10);

  // Previous period for % comparison
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - durationMs);
  const prevStartIso = prevStartDate.toISOString().slice(0, 10);
  const prevEndIso = startIso;

  // 1. Fetch Bills Data for timeline
  const billsTimeline = await query<any>(
    `SELECT 
       DATE_TRUNC('${truncUnit}', bill_date::date) AS interval_date,
       COUNT(*)::int AS total_bills,
       COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS success_bills,
       COUNT(*) FILTER (WHERE payment_status = 'partial')::int AS partial_bills,
       COUNT(*) FILTER (WHERE payment_status = 'unpaid')::int AS unpaid_bills,
       COALESCE(SUM(total_amount), 0)::float AS invoiced_amount,
       COALESCE(SUM(paid_amount), 0)::float AS collected_amount,
       COALESCE(SUM(total_amount - paid_amount), 0)::float AS pending_amount
     FROM bills
     WHERE tenant_id = ? AND bill_date >= ? AND bill_date <= ?
     GROUP BY interval_date
     ORDER BY interval_date ASC`,
    [tenantId, startIso, endIso]
  );

  // 2. Fetch Customers Data for timeline (Customers with appointments are counted as contacted)
  const customersTimeline = await query<any>(
    `SELECT 
       DATE_TRUNC('${truncUnit}', c.created_at::date) AS interval_date,
       COUNT(DISTINCT c.id)::int AS total_customers,
       COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'lead' AND ap.id IS NULL)::int AS leads,
       COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'contacted' OR (c.status = 'lead' AND ap.id IS NOT NULL))::int AS contacted,
       COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'quote_sent')::int AS quote_sent,
       COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('completed', 'won'))::int AS won,
       COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'lost')::int AS lost
     FROM customers c
     LEFT JOIN appointments ap ON ap.customer_id = c.id AND (ap.is_trashed = 0 OR ap.is_trashed IS NULL)
     WHERE c.tenant_id = ? AND c.created_at::date >= ? AND c.created_at::date <= ?
     GROUP BY interval_date
     ORDER BY interval_date ASC`,
    [tenantId, startIso, endIso]
  );

  // 3. Fetch Appointments Data for timeline
  const appointmentsTimeline = await query<any>(
    `SELECT 
       DATE_TRUNC('${truncUnit}', appointment_date::date) AS interval_date,
       COUNT(*)::int AS total_appointments,
       COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
     FROM appointments
     WHERE tenant_id = ? AND appointment_date >= ? AND appointment_date <= ?
     GROUP BY interval_date
     ORDER BY interval_date ASC`,
    [tenantId, startIso, endIso]
  );

  // 4. Overall KPIs (Current vs Previous Period)
  const currentKPIs = await query<any>(
    `SELECT 
       (SELECT COALESCE(SUM(paid_amount), 0)::float FROM bills WHERE tenant_id = ? AND bill_date >= ? AND bill_date <= ?) AS revenue_collected,
       (SELECT COALESCE(SUM(total_amount), 0)::float FROM bills WHERE tenant_id = ? AND bill_date >= ? AND bill_date <= ?) AS total_invoiced,
       (SELECT COUNT(*)::int FROM bills WHERE tenant_id = ? AND payment_status = 'paid' AND bill_date >= ? AND bill_date <= ?) AS success_bills,
       (SELECT COUNT(*)::int FROM customers WHERE tenant_id = ? AND created_at::date >= ? AND created_at::date <= ?) AS new_customers,
       (SELECT COUNT(*)::int FROM appointments WHERE tenant_id = ? AND status = 'completed' AND appointment_date >= ? AND appointment_date <= ?) AS completed_appointments,
       (SELECT COUNT(*)::int FROM quotations WHERE tenant_id = ? AND quotation_date >= ? AND quotation_date <= ?) AS total_quotations
    `,
    [
      tenantId, startIso, endIso,
      tenantId, startIso, endIso,
      tenantId, startIso, endIso,
      tenantId, startIso, endIso,
      tenantId, startIso, endIso,
      tenantId, startIso, endIso,
    ]
  );

  const prevKPIs = await query<any>(
    `SELECT 
       (SELECT COALESCE(SUM(paid_amount), 0)::float FROM bills WHERE tenant_id = ? AND bill_date >= ? AND bill_date <= ?) AS revenue_collected,
       (SELECT COUNT(*)::int FROM bills WHERE tenant_id = ? AND payment_status = 'paid' AND bill_date >= ? AND bill_date <= ?) AS success_bills,
       (SELECT COUNT(*)::int FROM customers WHERE tenant_id = ? AND created_at::date >= ? AND created_at::date <= ?) AS new_customers,
       (SELECT COUNT(*)::int FROM appointments WHERE tenant_id = ? AND status = 'completed' AND appointment_date >= ? AND appointment_date <= ?) AS completed_appointments
    `,
    [
      tenantId, prevStartIso, prevEndIso,
      tenantId, prevStartIso, prevEndIso,
      tenantId, prevStartIso, prevEndIso,
      tenantId, prevStartIso, prevEndIso,
    ]
  );

  // 5. Top Products Sold in timeframe
  const topProducts = await query<any>(
    `SELECT 
       bi.product_name,
       COALESCE(SUM(bi.quantity), 0)::int AS total_qty,
       COALESCE(SUM(bi.total_price), 0)::float AS total_revenue
     FROM bill_items bi
     JOIN bills b ON b.id = bi.bill_id
     WHERE b.tenant_id = ? AND b.bill_date >= ? AND b.bill_date <= ?
     GROUP BY bi.product_name
     ORDER BY total_revenue DESC
     LIMIT 5`,
    [tenantId, startIso, endIso]
  );

  // 6. Executive Leaderboard
  const executiveLeaderboard = await query<any>(
    `SELECT 
       a.id,
       a.name,
       COUNT(DISTINCT b.id)::int AS bills_count,
       COALESCE(SUM(b.paid_amount), 0)::float AS revenue_generated,
       COUNT(DISTINCT ap.id) FILTER (WHERE ap.status = 'completed')::int AS appointments_completed
     FROM admins a
     LEFT JOIN bills b ON b.created_by = a.id AND b.bill_date >= ? AND b.bill_date <= ?
     LEFT JOIN appointments ap ON ap.created_by = a.id AND ap.appointment_date >= ? AND ap.appointment_date <= ?
     WHERE (a.id = ? OR a.tenant_id = ?)
     GROUP BY a.id, a.name
     ORDER BY revenue_generated DESC
     LIMIT 6`,
    [startIso, endIso, startIso, endIso, tenantId, tenantId]
  );

  // Merge timeline dates seamlessly
  const dateMap = new Map<string, any>();

  const getOrInit = (key: string, dateObj: Date) => {
    if (!dateMap.has(key)) {
      let label = key;
      if (truncUnit === "month") {
        label = dateObj.toLocaleDateString("en-US", { month: "short" });
      } else if (truncUnit === "week") {
        label = `Wk ${dateObj.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}`;
      } else {
        label = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      }

      dateMap.set(key, {
        dateKey: key,
        label,
        invoiced_amount: 0,
        collected_amount: 0,
        pending_amount: 0,
        total_bills: 0,
        success_bills: 0,
        partial_bills: 0,
        unpaid_bills: 0,
        total_customers: 0,
        leads: 0,
        contacted: 0,
        quote_sent: 0,
        won: 0,
        lost: 0,
        total_appointments: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
      });
    }
    return dateMap.get(key)!;
  };

  // Populate from bills
  billsTimeline.forEach((r) => {
    const raw = String(r.interval_date).slice(0, 10);
    const item = getOrInit(raw, new Date(r.interval_date));
    item.invoiced_amount = r.invoiced_amount;
    item.collected_amount = r.collected_amount;
    item.pending_amount = r.pending_amount;
    item.total_bills = r.total_bills;
    item.success_bills = r.success_bills;
    item.partial_bills = r.partial_bills;
    item.unpaid_bills = r.unpaid_bills;
  });

  // Populate from customers
  customersTimeline.forEach((r) => {
    const raw = String(r.interval_date).slice(0, 10);
    const item = getOrInit(raw, new Date(r.interval_date));
    item.total_customers = r.total_customers;
    item.leads = r.leads;
    item.contacted = r.contacted;
    item.quote_sent = r.quote_sent;
    item.won = r.won;
    item.lost = r.lost;
  });

  // Populate from appointments
  appointmentsTimeline.forEach((r) => {
    const raw = String(r.interval_date).slice(0, 10);
    const item = getOrInit(raw, new Date(r.interval_date));
    item.total_appointments = r.total_appointments;
    item.scheduled = r.scheduled;
    item.completed = r.completed;
    item.cancelled = r.cancelled;
  });

  // Sort timeline chronologically
  const timeline = Array.from(dateMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const cur = currentKPIs[0] || {};
  const prev = prevKPIs[0] || {};

  const calcGrowth = (cVal: number, pVal: number) => {
    if (!pVal || pVal === 0) return cVal > 0 ? 100 : 0;
    return Math.round(((cVal - pVal) / pVal) * 100);
  };

  return NextResponse.json({
    timeframe,
    startDate: startIso,
    endDate: endIso,
    kpis: {
      revenue_collected: cur.revenue_collected || 0,
      revenue_growth: calcGrowth(cur.revenue_collected || 0, prev.revenue_collected || 0),
      total_invoiced: cur.total_invoiced || 0,
      success_bills: cur.success_bills || 0,
      success_bills_growth: calcGrowth(cur.success_bills || 0, prev.success_bills || 0),
      new_customers: cur.new_customers || 0,
      new_customers_growth: calcGrowth(cur.new_customers || 0, prev.new_customers || 0),
      completed_appointments: cur.completed_appointments || 0,
      completed_appointments_growth: calcGrowth(cur.completed_appointments || 0, prev.completed_appointments || 0),
      total_quotations: cur.total_quotations || 0,
    },
    timeline,
    topProducts,
    executiveLeaderboard,
  });
}
