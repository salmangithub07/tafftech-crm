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
      `SELECT q.*, COALESCE(q.customer_name, c.name) AS customer_name,
              c.phone AS c_phone, c.address AS c_address
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

    const rawCompanyName = settings.site_name || "TAFF TECH";
    const companyName = rawCompanyName.replace(/\bCRM\b/gi, "").replace(/\s+/g, " ").trim() || "TAFF TECH";
    const tagline = settings.business_tagline || "INDUSTRIAL SOLUTIONS";
    const address = settings.business_address || "PLOT NO 03 WANJRA BEHIND NAKA NO 02, KAMPTEE ROAD\nNAGPUR , MAHARASHTRA , INDIA – 440026\nMobile No - 9607086390/8788099744";
    const gstin = settings.gstin || "27CENPA9070D1Z1";
    const pan = settings.pan_no || "CENPA9070D";
    const phone = settings.company_phone || "+91 9607086390";
    const docNo = q.quotation_number || `QT-${q.id}`;
    const customer = q.customer_name || "Valued Customer";
    const customerAddress = q.customer_address || q.c_address || "—";
    const customerPhone = q.customer_phone || q.c_phone || "N/A";
    const bookTo = q.book_to || "—";
    const grNo = q.gr_no || docNo;
    const vehicleNo = q.vehicle_no || "------------------------------------";
    const transport = q.transport ? `----${q.transport}----` : "----------------------------------------";

    const dateStr = q.quotation_date
      ? new Date(q.quotation_date).toLocaleDateString("en-IN", {
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
            padding: "16px 20px",
            fontFamily: "sans-serif",
          }}
        >
          {/* Main Invoice Box Border */}
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              border: "3px solid #000000",
              borderRadius: 14,
              padding: "16px 20px",
              backgroundColor: "#ffffff",
            }}
          >
            {/* Top metadata header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                fontSize: 16,
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#000000",
                paddingBottom: 6,
                borderBottom: "2px solid #000000",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div>GSTIN : {gstin}</div>
                <div>PAN NO : {pan}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <div>PH : {phone}</div>
                <div>DATE : {dateStr}</div>
              </div>
            </div>

            {/* Brand Title */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <h1
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  fontFamily: "serif",
                  letterSpacing: "0.08em",
                  color: "#1e3a8a",
                  margin: "0 0 4px 0",
                  textTransform: "uppercase",
                }}
              >
                {companyName}
              </h1>
            </div>

            {/* Yellow Tagline Ribbon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#facc15",
                color: "#000000",
                fontWeight: 900,
                fontFamily: "monospace",
                fontSize: 20,
                letterSpacing: "0.22em",
                padding: "6px 0",
                borderTop: "2px solid #000000",
                borderBottom: "2px solid #000000",
                width: "100%",
                textTransform: "uppercase",
              }}
            >
              {tagline}
            </div>

            {/* Business Address Lines */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#000000",
                textAlign: "center",
                marginTop: 6,
                lineHeight: 1.35,
              }}
            >
              {address.split("\n").map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>

            {/* 2-Column Details Box */}
            <div
              style={{
                display: "flex",
                width: "100%",
                border: "2px solid #000000",
                marginTop: "auto",
                backgroundColor: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                color: "#000000",
              }}
            >
              {/* Left Column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1.1,
                  padding: "10px 14px",
                  borderRight: "2px solid #000000",
                  gap: 4,
                }}
              >
                <div>PROFORMA INVOICE : {docNo}</div>
                <div>NAME : <span style={{ textTransform: "uppercase" }}>{customer}</span></div>
                <div>ADDRESS : {customerAddress}</div>
                <div>MOB NO : {customerPhone}</div>
                <div>BOOK TO : {bookTo}</div>
              </div>

              {/* Right Column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 0.9,
                  padding: "10px 14px",
                  gap: 6,
                }}
              >
                <div>GR.NO . {grNo}</div>
                <div>VEHICLE NO. {vehicleNo}</div>
                <div>TRANSPORT. {transport}</div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error generating OG image for quotation:", error);
    return new Response("Failed to generate preview", { status: 500 });
  }
}
