import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  payment_date: z.string().min(1, "Payment date required"),
  payment_method: z.enum(["cash", "bank", "credit", "other"]).default("cash"),
  account_id: z.number().optional().nullable(),
  notes: z.string().optional().or(z.literal("")).default(""),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "bills")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = tenantOf(session)!;
  const { id } = await params;
  const billId = parseInt(id, 10);
  if (isNaN(billId)) return NextResponse.json({ error: "Invalid bill ID" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = recordPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payment data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Fetch bill
  const bills = await query<any>(
    "SELECT * FROM bills WHERE id = ? AND tenant_id = ?",
    [billId, tenantId]
  );
  if (!bills.length) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  const bill = bills[0];

  const currentPaid = Number(bill.paid_amount || 0);
  const totalAmount = Number(bill.total_amount || 0);
  const remainingDue = Math.max(0, totalAmount - currentPaid);

  if (remainingDue <= 0) {
    return NextResponse.json({ error: "This bill is already fully paid." }, { status: 400 });
  }

  const newPaidAmount = currentPaid + d.amount;
  let newPaymentStatus: "paid" | "partial" | "unpaid" = "partial";
  if (newPaidAmount >= totalAmount - 0.01) {
    newPaymentStatus = "paid";
  } else if (newPaidAmount > 0) {
    newPaymentStatus = "partial";
  }

  // Update bill
  await execute(
    `UPDATE bills SET paid_amount = ?, payment_status = ?, payment_method = ? WHERE id = ? AND tenant_id = ?`,
    [newPaidAmount, newPaymentStatus, d.payment_method, billId, tenantId]
  );

  // If ledger account_id is provided, deposit into Balance Sheet Cash/Bank account
  if (d.account_id) {
    const account = await query(
      "SELECT id, name FROM ledger_accounts WHERE id = ? AND tenant_id = ?",
      [d.account_id, tenantId]
    );
    if (account.length > 0) {
      const notesStr = d.notes ? ` (${d.notes})` : "";
      await execute(
        `INSERT INTO ledger_transactions (tenant_id, account_id, entry_date, direction, amount, description, created_by)
         VALUES (?, ?, ?, 'increase', ?, ?, ?)`,
        [
          tenantId,
          d.account_id,
          d.payment_date,
          d.amount,
          `Payment collected for Bill ${bill.bill_number} (${bill.customer_name})${notesStr}`,
          session.id,
        ]
      );
    }
  }

  logActivity({
    tenantId,
    actorId: session.id,
    actorName: session.name,
    action: `Recorded Payment of ₹${d.amount} for Bill ${bill.bill_number}`,
    entityType: "bill",
    entityId: billId,
    entityLabel: `${bill.bill_number} - ${bill.customer_name}`,
  });

  const updated = await query("SELECT * FROM bills WHERE id = ?", [billId]);
  return NextResponse.json(updated[0]);
}
