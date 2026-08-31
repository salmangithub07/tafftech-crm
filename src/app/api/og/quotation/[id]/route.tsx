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

    const quotations = await query(
      `SELECT q.*, COALESCE(q.customer_name, c.name) AS customer_name
       FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id
       WHERE q.id = ?`,
      [id]
    );

    if (!quotations.length) {
      return new Response("Quotation Not Found", { status: 404 });
    }

    const q = quotations[0] as any;
    const settings = await getSettings(q.tenant_id);

    const companyName = (settings.site_name || "TAFF TECH").replace(/\bCRM\b/gi, "").trim() || "TAFF TECH";
    const tagline = settings.business_tagline || "INDUSTRIAL SOLUTIONS";
    const address = settings.business_address || "";
    const gstin = settings.gstin || "";
    const pan = settings.pan_no || "";
    const phone = settings.company_phone || "";
    const docNo = q.quotation_number || `QT-${q.id}`;
    const customer = q.customer_name || "Valued Customer";
    const totalAmount = Number(q.total_amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    });
    const dateStr = q.quotation_date
      ? new Date(q.quotation_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-IN");

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            padding: "36px 48px",
            fontFamily: "sans-serif",
            border: "12px solid #f1f5f9",
          }}
        >
          {/* Top meta row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontSize: 16,
              color: "#334155",
              fontWeight: 600,
              paddingBottom: 12,
              borderBottom: "2px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              {gstin ? <span>GSTIN: {gstin}</span> : null}
              {pan ? <span>PAN: {pan}</span> : null}
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {phone ? <span>PH: {phone}</span> : null}
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
                fontSize: 48,
                fontWeight: 900,
                color: "#1e3a8a",
                letterSpacing: "0.1em",
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
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "0.15em",
              padding: "6px 0",
              marginTop: 10,
              width: "100%",
              textTransform: "uppercase",
            }}
          >
            {tagline}
          </div>

          {/* Address */}
          {address ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                textAlign: "center",
                fontSize: 14,
                color: "#475569",
                marginTop: 8,
              }}
            >
              {address}
            </div>
          ) : null}

          {/* Document Summary Card */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc",
              border: "2px solid #cbd5e1",
              borderRadius: 12,
              padding: "20px 28px",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                PROFORMA INVOICE / QUOTATION
              </span>
              <span style={{ fontSize: 26, color: "#0f172a", fontWeight: 800 }}>
                {docNo}
              </span>
              <span style={{ fontSize: 16, color: "#334155", fontWeight: 600 }}>
                Customer: {customer}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>
                TOTAL AMOUNT
              </span>
              <span style={{ fontSize: 32, color: "#d97706", fontWeight: 900 }}>
                ₹{totalAmount}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Error generating OG image for quotation:", error);
    return new Response("Failed to generate preview", { status: 500 });
  }
}
