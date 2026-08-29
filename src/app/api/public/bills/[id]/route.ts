import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid bill ID." }, { status: 400 });
    }

    const bills = await query(
      `SELECT b.*, COALESCE(b.customer_name, c.name) AS customer_name, a.name AS created_by_name
       FROM bills b
       LEFT JOIN customers c ON c.id = b.customer_id
       LEFT JOIN admins a ON a.id = b.created_by
       WHERE b.id = ?`,
      [id]
    );

    if (!bills.length) {
      return NextResponse.json({ error: "Bill / Invoice not found." }, { status: 404 });
    }

    const bill = bills[0] as any;
    bill.items = await query(
      "SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC",
      [id]
    );

    // Get tenant settings
    const settings = await getSettings(bill.tenant_id);

    return NextResponse.json({
      bill,
      settings: {
        site_name: settings.site_name,
        company_phone: settings.company_phone,
        bank_name: settings.bank_name,
        bank_account_no: settings.bank_account_no,
        bank_ifsc: settings.bank_ifsc,
        bank_upi_id: settings.bank_upi_id,
        bank_details: settings.bank_details,
        invoice_terms: settings.invoice_terms,
        invoice_template: settings.invoice_template,
      },
    });
  } catch (error) {
    console.error("Error fetching public bill:", error);
    return NextResponse.json({ error: "Failed to load bill." }, { status: 500 });
  }
}
