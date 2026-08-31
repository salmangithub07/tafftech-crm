import { ImageResponse } from "next/og";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) return new Response("Invalid ID", { status: 400 });

    const bills = await query(
      `SELECT b.*, COALESCE(b.customer_name, c.name) AS customer_name
       FROM bills b
       LEFT JOIN customers c ON c.id = b.customer_id
       WHERE b.id = ?`,
      [id]
    );

    if (!bills.length) {
      return new Response("Bill Not Found", { status: 404 });
    }

    const b = bills[0] as any;
    const settings = await getSettings(b.tenant_id);

    const rawCompanyName = settings.site_name || "TAFF TECH";
    const companyName = rawCompanyName.replace(/\bCRM\b/gi, "").replace(/\s+/g, " ").trim() || "TAFF TECH";
    const tagline = settings.business_tagline || "INDUSTRIAL SOLUTIONS";
    const address = settings.business_address
      ? settings.business_address.replace(/\n+/g, ", ")
      : "PLOT NO 03 WANJRA BEHIND NAKA NO 02, KAMPTEE ROAD NAGPUR , MAHARASHTRA , INDIA – 440026 Mobile No - 9607086390/8788099744";
    const gstin = settings.gstin || "27CENPA9070D1Z1";
    const pan = settings.pan_no || "CENPA9070D";
    const phone = settings.company_phone || "+91 9607086390";
    const docNo = b.bill_number || `INV-${b.id}`;
    const customer = b.customer_name || "Valued Customer";
    const totalAmount = Number(b.total_amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    });
    const dateStr = b.bill_date
      ? new Date(b.bill_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            padding: "36px 44px",
            border: "12px solid #f1f5f9",
          }}
        >
          {/* Top metadata header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontSize: 16,
              color: "#334155",
              fontWeight: 700,
              paddingBottom: 14,
              borderBottom: "2px solid #cbd5e1",
            }}
          >
            <div style={{ display: "flex", gap: 24 }}>
              <span>GSTIN: {gstin}</span>
              <span>PAN: {pan}</span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <span>PH: {phone}</span>
              <span>DATE: {dateStr}</span>
            </div>
          </div>

          {/* Main Brand Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            <h1
              style={{
                fontSize: 50,
                fontWeight: 900,
                color: "#1e3a8a",
                letterSpacing: "0.12em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {companyName}
            </h1>
          </div>

          {/* Yellow Banner Tagline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f59e0b",
              color: "#000000",
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: "0.2em",
              padding: "8px 0",
              marginTop: 12,
              width: "100%",
              textTransform: "uppercase",
            }}
          >
            {tagline}
          </div>

          {/* Business Address */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color: "#475569",
              marginTop: 10,
            }}
          >
            {address}
          </div>

          {/* Document Summary Card */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc",
              border: "2px solid #cbd5e1",
              borderRadius: 14,
              padding: "20px 28px",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                TAX INVOICE
              </span>
              <span style={{ fontSize: 28, color: "#0f172a", fontWeight: 900 }}>
                {docNo}
              </span>
              <span style={{ fontSize: 16, color: "#334155", fontWeight: 700 }}>
                Customer: {customer}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>
                GRAND TOTAL
              </span>
              <span style={{ fontSize: 34, color: "#2563eb", fontWeight: 900 }}>
                ₹{totalAmount}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch (error) {
    console.error("Error generating OG image for bill:", error);
    return new Response("Failed to generate preview", { status: 500 });
  }
}
