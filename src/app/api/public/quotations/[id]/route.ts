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
      return NextResponse.json({ error: "Invalid quotation ID." }, { status: 400 });
    }

    const quotations = await query(
      `SELECT q.*, COALESCE(q.customer_name, c.name) AS customer_name, a.name AS created_by_name
       FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN admins a ON a.id = q.created_by
       WHERE q.id = ?`,
      [id]
    );

    if (!quotations.length) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    const quotation = quotations[0] as any;
    quotation.items = await query(
      "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id ASC",
      [id]
    );

    // Get tenant settings
    const settings = await getSettings(quotation.tenant_id);

    return NextResponse.json({
      quotation,
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
    console.error("Error fetching public quotation:", error);
    return NextResponse.json({ error: "Failed to load quotation." }, { status: 500 });
  }
}
