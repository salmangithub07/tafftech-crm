"use client";

import * as React from "react";
import type { Bill, Quotation } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";

function quantityToWords(qty: number): string {
  const words = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"
  ];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    if (n < 20) return words[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + convertLessThanThousand(n % 10);
    return words[Math.floor(n / 100)] + " HUNDRED " + convertLessThanThousand(n % 100);
  }

  if (!qty || qty <= 0) return "ZERO UNITS ONLY";
  let num = Math.floor(qty);
  let result = "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

  if (crore > 0) result += convertLessThanThousand(crore) + "CRORE ";
  if (lakh > 0) result += convertLessThanThousand(lakh) + "LAKH ";
  if (thousand > 0) result += convertLessThanThousand(thousand) + "THOUSAND ";
  if (num > 0) result += convertLessThanThousand(num);

  return (result.trim() + (qty === 1 ? " UNIT ONLY" : " UNITS ONLY")).toUpperCase();
}

export function PrintableDispatchSlip({
  doc,
  siteName,
  settings,
  documentTitle = "DELIVERY CHALLAN",
}: {
  doc: Bill | Quotation;
  siteName?: string;
  settings?: AppSettings;
  documentTitle?: string;
}) {
  const d = doc as any;
  const rawCompanyName = siteName || settings?.site_name || "Taff Tech";
  const companyName = rawCompanyName.replace(/\bCRM\b/gi, "").replace(/\s+/g, " ").trim() || "Taff Tech";
  
  const docDate = d.bill_date || d.quotation_date || d.created_at || new Date().toISOString();
  const formattedDate = new Date(docDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const docNumber = d.bill_number || d.quotation_number || `DOC-${d.id}`;
  const gstin = settings?.gstin || "—";
  const panNo = settings?.pan_no || "—";
  const companyPhone = settings?.company_phone || "—";
  const businessLogo = settings?.business_logo || "";
  const businessAddress = settings?.business_address || "";
  const disputeNote = d.dispute_note || settings?.dispute_note || "ALL DISPUTES SUBJECT TO LOCAL JURISDICTION";

  // Determine Challan Title
  let challanTitle = (documentTitle || d.document_title || "DELIVERY CHALLAN").toUpperCase().trim();
  if (challanTitle === "TAX INVOICE") {
    challanTitle = "TAX INVOICE - DELIVERY CHALLAN";
  } else if (challanTitle === "PROFORMA INVOICE") {
    challanTitle = "PROFORMA INVOICE - DELIVERY CHALLAN";
  } else if (!challanTitle.includes("CHALLAN") && !challanTitle.includes("DISPATCH")) {
    challanTitle = `${challanTitle} - DELIVERY CHALLAN`;
  }

  const items = d.items || [];
  const totalQuantity = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);

  return (
    <div
      id="dispatch-print-root"
      className="printable-dispatch printable-invoice w-full p-4 sm:p-6 bg-white text-black font-sans border-2 border-black rounded-none shadow-none text-xs leading-tight select-text"
      style={{
        color: "#000",
        backgroundColor: "#fff",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header Metadata */}
      <div className="flex justify-between items-start text-[11px] font-bold font-mono tracking-tight pb-1 border-b border-black">
        <div>
          <p>GSTIN : {gstin}</p>
          <p>PAN NO : {panNo}</p>
        </div>
        <div className="text-right">
          <p>PH : {companyPhone}</p>
          <p>DATE : {formattedDate}</p>
        </div>
      </div>

      {/* Main Logo & Yellow Tagline Banner */}
      <div className="text-center my-2">
        <div className="flex justify-center items-center py-1">
          {businessLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={businessLogo}
              alt={`${companyName} Logo`}
              className="h-10 sm:h-14 w-auto object-contain max-w-[320px]"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest uppercase text-slate-900">
              {companyName}
            </h1>
          )}
        </div>
        <div className="bg-[#facc15] bg-yellow-banner text-black font-mono font-black text-sm sm:text-base tracking-[0.25em] uppercase py-1 border-y-2 border-black my-1">
          {challanTitle}
        </div>
        <div className="text-[10px] font-bold text-gray-700 tracking-wider uppercase my-0.5">
          (DELIVERY / DISPATCH CHALLAN - GOODS FOR TRANSPORTATION ONLY)
        </div>
        <div className="text-[11px] font-bold mt-1.5 space-y-0.5 leading-snug whitespace-pre-line">
          {businessAddress}
        </div>
      </div>

      {/* Order / Customer & Transport Details Box — 2 Horizontal Columns */}
      <div className="border-2 border-black grid grid-cols-2 my-2 text-xs">
        <div className="p-2 border-r-2 border-black space-y-1">
          <p className="font-sans font-semibold text-[13px] uppercase">
            REF DOC NO : {docNumber}
          </p>
          <p className="font-sans font-semibold text-[13px] uppercase">
            NAME : <span className="uppercase font-bold">{d.customer_name || "—"}</span>
          </p>
          <p className="font-sans font-semibold">ADDRESS : {d.customer_address || "—"}</p>
          <p className="font-sans font-semibold">MOB NO : {d.customer_phone || "N/A"}</p>
          {d.customer_gst_number && (
            <p className="font-sans font-semibold text-black uppercase font-mono">
              GSTIN : {d.customer_gst_number}
            </p>
          )}
          <p className="font-sans font-semibold">BOOK TO : {d.book_to || "—"}</p>
        </div>
        <div className="p-2 space-y-1">
          <p className="font-sans font-semibold text-[13px] uppercase">
            GR.NO . {d.gr_no || docNumber}
          </p>
          <p className="font-sans font-semibold text-black">
            DISPATCH DATE : {formattedDate}
          </p>
          <p className="font-sans font-semibold text-black">
            DISPATCHED FROM: {d.dispatched_from || "------------------------------------------"}
          </p>
          <p className="font-sans font-semibold text-black">
            VEHICLE NO. {d.vehicle_no || "------------------------------------------"}
          </p>
          <p className="font-sans font-semibold text-black">
            TRANSPORT. ----{d.transport || "------------------------------------------"}----
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse border-2 border-black text-xs my-2">
        <thead>
          <tr className="border-b-2 border-black font-bold uppercase text-center bg-gray-100">
            <th
              className="border-r border-black p-2 w-14 align-bottom whitespace-nowrap"
              style={{ width: "56px", whiteSpace: "nowrap" }}
            >
              S.NO
            </th>
            <th className="border-r border-black p-2 text-left align-bottom">
              PARTICULAR / PRODUCT DESCRIPTION
            </th>
            <th className="border-r border-black p-2 w-32 align-bottom">
              HSN CODE
            </th>
            <th className="p-2 w-36 text-center align-bottom">
              QUANTITY (PCS/UNITS)
            </th>
          </tr>
        </thead>
        <tbody className="align-top">
          {items && items.length > 0 ? (
            items.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-black text-center font-medium">
                <td className="border-r border-black p-2.5 font-bold">{idx + 1}</td>
                <td className="border-r border-black p-2.5 text-left font-bold uppercase">
                  {item.product_name}
                </td>
                <td className="border-r border-black p-2.5 font-mono uppercase">
                  {item.hsn_code || item.product_id || "—"}
                </td>
                <td className="p-2.5 font-bold text-center font-mono text-[13px]">
                  {item.quantity}
                </td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-black text-center font-medium">
              <td className="border-r border-black p-2.5 font-bold">1</td>
              <td className="border-r border-black p-2.5 text-left font-bold uppercase">
                PRODUCT ITEM
              </td>
              <td className="border-r border-black p-2.5 font-mono">—</td>
              <td className="p-2.5 font-bold text-center font-mono text-[13px]">1</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total Quantity Bar — Matches Grand Total bar format of Bills */}
      <div className="border-2 border-black grid grid-cols-[68%_32%] my-2 text-xs font-bold bg-gray-50">
        <div className="p-2 border-r-2 border-black flex items-center">
          <span>
            Total Units in word.{" "}
            <span
              className="text-[14px] uppercase"
              style={{ fontFamily: "'Roboto', Roboto, sans-serif", fontWeight: 800, letterSpacing: "0.5px" }}
            >
              {quantityToWords(totalQuantity)}
            </span>
          </span>
        </div>
        <div
          className="p-2 flex items-center justify-between text-[14px]"
          style={{ fontFamily: "'Roboto', Roboto, sans-serif", fontWeight: 800, letterSpacing: "0.5px" }}
        >
          <span>TOTAL QUANTITY</span>
          <span className="font-mono text-base">
            {totalQuantity} {totalQuantity === 1 ? "UNIT" : "UNITS"}
          </span>
        </div>
      </div>

      {/* Terms & Transport Note */}
      <div className="border-2 border-black p-2.5 my-2 bg-gray-50 text-xs leading-relaxed font-medium">
        <p className="font-bold uppercase tracking-wide text-[11px] mb-0.5">
          Delivery &amp; Dispatch Terms:
        </p>
        <p className="text-gray-800 text-[11px]">
          1. Received the above mentioned goods in good condition &amp; intact packaging.
          <br />
          2. Physical count and verification completed prior to departure / receipt.
          <br />
          3. This challan is valid for transportation of goods only and carries no commercial credit value.
        </p>
      </div>

      {/* 3 Signature Blocks with Guaranteed Vertical Spacing */}
      <div
        className="border-2 border-black grid grid-cols-3 text-center my-3 text-xs"
        style={{
          border: "2px solid #000000",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          margin: "12px 0",
        }}
      >
        {/* Column 1: Dispatched By */}
        <div
          className="p-2.5 border-r-2 border-black flex flex-col justify-between"
          style={{
            borderRight: "2px solid #000000",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "95px",
          }}
        >
          <p className="font-bold text-[12px] uppercase tracking-wider" style={{ margin: 0, fontWeight: 800 }}>
            FOR {companyName.toUpperCase()}
          </p>
          <div style={{ height: "48px", minHeight: "48px" }} className="h-12" />
          <div className="border-t border-black pt-1" style={{ borderTop: "1px solid #000000", paddingTop: "4px" }}>
            <p className="font-bold text-[11px] uppercase text-gray-800" style={{ margin: 0, fontWeight: 700 }}>
              AUTHORISED SIGNATORY
            </p>
          </div>
        </div>

        {/* Column 2: Transporter / Driver */}
        <div
          className="p-2.5 border-r-2 border-black flex flex-col justify-between"
          style={{
            borderRight: "2px solid #000000",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "95px",
          }}
        >
          <p className="font-bold text-[12px] uppercase tracking-wider" style={{ margin: 0, fontWeight: 800 }}>
            TRANSPORTER / DRIVER
          </p>
          <div style={{ height: "48px", minHeight: "48px" }} className="h-12" />
          <div className="border-t border-black pt-1" style={{ borderTop: "1px solid #000000", paddingTop: "4px" }}>
            <p className="font-bold text-[11px] uppercase text-gray-800" style={{ margin: 0, fontWeight: 700 }}>
              DRIVER SIGNATURE &amp; DATE
            </p>
          </div>
        </div>

        {/* Column 3: Receiver's Confirmation */}
        <div
          className="p-2.5 flex flex-col justify-between"
          style={{
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "95px",
          }}
        >
          <p className="font-bold text-[12px] uppercase tracking-wider" style={{ margin: 0, fontWeight: 800 }}>
            RECEIVER&apos;S CONFIRMATION
          </p>
          <div style={{ height: "48px", minHeight: "48px" }} className="h-12" />
          <div className="border-t border-black pt-1" style={{ borderTop: "1px solid #000000", paddingTop: "4px" }}>
            <p className="font-bold text-[11px] uppercase text-gray-800" style={{ margin: 0, fontWeight: 700 }}>
              STAMP &amp; SIGNATURE
            </p>
          </div>
        </div>
      </div>

      {/* Dispute Jurisdiction Footer Note — Exact match with bills */}
      <div className="border-t border-black pt-1.5 text-[10px] font-bold uppercase tracking-tight text-gray-800">
        ATTACHEMENT: 1) {disputeNote}
      </div>
    </div>
  );
}
