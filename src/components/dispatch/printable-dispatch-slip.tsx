"use client";

import * as React from "react";
import type { Bill, Quotation } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";

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
  let challanTitle = (documentTitle || d.document_title || "DELIVERY CHALLAN").toUpperCase();
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
      className="printable-dispatch w-full p-4 sm:p-6 bg-white text-black font-sans border-2 border-black rounded-none shadow-none text-xs leading-tight select-text"
      style={{
        color: "#000",
        backgroundColor: "#fff",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Metadata Header */}
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

      {/* Main Logo & Title Banner */}
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

        {/* Highlighted Yellow Banner with Document Title */}
        <div className="bg-[#facc15] bg-yellow-banner text-black font-mono font-black text-sm sm:text-base tracking-[0.2em] uppercase py-1.5 border-y-2 border-black my-1">
          {challanTitle}
        </div>

        <div className="text-[10px] font-bold text-gray-700 tracking-wider uppercase mb-1">
          (DELIVERY / DISPATCH CHALLAN - GOODS FOR TRANSPORTATION ONLY)
        </div>

        <div className="text-[11px] font-bold mt-1 space-y-0.5 leading-snug whitespace-pre-line">
          {businessAddress}
        </div>
      </div>

      {/* Customer & Dispatch Logistics Grid — 2 Columns */}
      <div className="border-2 border-black grid grid-cols-2 my-2 text-xs">
        {/* Left Column: Customer Details */}
        <div className="p-2 border-r-2 border-black space-y-1">
          <p className="font-sans font-bold text-[13px] uppercase">
            REF DOC NO : <span className="font-mono">{docNumber}</span>
          </p>
          <p className="font-sans font-semibold text-[13px] uppercase">
            CUSTOMER NAME : <span className="font-bold">{d.customer_name || "—"}</span>
          </p>
          <p className="font-sans font-semibold">
            DELIVERY ADDRESS : <span className="font-normal">{d.customer_address || "—"}</span>
          </p>
          <p className="font-sans font-semibold">
            MOBILE NO : <span className="font-mono">{d.customer_phone || "N/A"}</span>
          </p>
          {d.customer_gst_number && (
            <p className="font-sans font-semibold uppercase font-mono">
              GSTIN : {d.customer_gst_number}
            </p>
          )}
          <p className="font-sans font-semibold">
            BOOK TO (DESTINATION) : <span className="font-bold">{d.book_to || "—"}</span>
          </p>
        </div>

        {/* Right Column: Dispatch Logistics */}
        <div className="p-2 space-y-1">
          <p className="font-sans font-semibold text-[13px] uppercase">
            GR / LR NO : <span className="font-mono font-bold">{d.gr_no || "—"}</span>
          </p>
          <p className="font-sans font-semibold">
            DISPATCH DATE : <span className="font-mono">{formattedDate}</span>
          </p>
          <p className="font-sans font-semibold">
            DISPATCHED FROM :{" "}
            <span className="font-bold uppercase">
              {d.dispatched_from || "------------------------------------------"}
            </span>
          </p>
          <p className="font-sans font-semibold">
            TRANSPORT / CARRIER :{" "}
            <span className="font-bold uppercase">
              {d.transport || "------------------------------------------"}
            </span>
          </p>
          <p className="font-sans font-semibold">
            VEHICLE NO :{" "}
            <span className="font-mono font-bold uppercase">
              {d.vehicle_no || "------------------------------------------"}
            </span>
          </p>
        </div>
      </div>

      {/* Items Table - Strict: Product & Quantity ONLY (NO Pricing/Taxes) */}
      <table className="w-full border-collapse border-2 border-black text-xs my-2">
        <thead>
          <tr className="border-b-2 border-black font-bold uppercase text-center bg-gray-100">
            <th className="border-r border-black p-2 w-14">S.NO</th>
            <th className="border-r border-black p-2 text-left">ITEM NAME / PRODUCT DESCRIPTION</th>
            <th className="border-r border-black p-2 w-36">HSN / SAC CODE</th>
            <th className="p-2 w-36 text-center">QUANTITY (PCS/UNITS)</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {items && items.length > 0 ? (
            items.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-black text-center font-medium">
                <td className="border-r border-black p-2 font-bold">{idx + 1}</td>
                <td className="border-r border-black p-2 text-left font-bold uppercase">
                  {item.product_name}
                </td>
                <td className="border-r border-black p-2 font-mono uppercase">
                  {item.hsn_code || item.product_id || "—"}
                </td>
                <td className="p-2 font-bold text-center font-mono text-[13px]">
                  {item.quantity}
                </td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-black text-center font-medium">
              <td className="border-r border-black p-2 font-bold">1</td>
              <td className="border-r border-black p-2 text-left font-bold uppercase">
                PRODUCT ITEM
              </td>
              <td className="border-r border-black p-2 font-mono">—</td>
              <td className="p-2 font-bold text-center font-mono">1</td>
            </tr>
          )}

          {/* Quantity Summary Row */}
          <tr className="border-b-2 border-black font-bold bg-gray-50">
            <td colSpan={3} className="border-r border-black p-2 text-right uppercase tracking-wider text-[12px]">
              TOTAL QUANTITY DISPATCHED :
            </td>
            <td className="p-2 text-center font-mono font-black text-sm text-black">
              {totalQuantity} {totalQuantity === 1 ? "UNIT" : "UNITS"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Dispatch Declarations & Signatures */}
      <div className="border-2 border-black p-2 my-2 bg-slate-50 text-[11px] leading-tight">
        <p className="font-bold uppercase tracking-wide">Delivery & Dispatch Terms:</p>
        <p className="text-[10px] text-gray-800 mt-0.5">
          1. Received the above mentioned goods in good condition & intact packaging.
          <br />
          2. Physical count and verification completed prior to departure / receipt.
          <br />
          3. This challan is valid for transportation of goods only and carries no commercial credit value.
        </p>
      </div>

      {/* Signature Blocks - 3 Equal Columns */}
      <div className="border-2 border-black grid grid-cols-3 text-center text-xs mt-3">
        <div className="p-2 border-r-2 border-black flex flex-col justify-between h-24">
          <p className="font-bold text-[11px] uppercase tracking-wider">Dispatched By</p>
          <div className="border-t border-dashed border-black pt-1">
            <p className="text-[10px] text-gray-700">Authorised Signatory</p>
          </div>
        </div>
        <div className="p-2 border-r-2 border-black flex flex-col justify-between h-24">
          <p className="font-bold text-[11px] uppercase tracking-wider">Transporter / Driver</p>
          <div className="border-t border-dashed border-black pt-1">
            <p className="text-[10px] text-gray-700">Driver Signature & Date</p>
          </div>
        </div>
        <div className="p-2 flex flex-col justify-between h-24">
          <p className="font-bold text-[11px] uppercase tracking-wider">Receiver&apos;s Confirmation</p>
          <div className="border-t border-dashed border-black pt-1">
            <p className="text-[10px] text-gray-700">Stamp & Signature</p>
          </div>
        </div>
      </div>

      {/* Dispute Footer */}
      <div className="flex justify-between items-center text-[10px] font-bold font-mono tracking-tight pt-2">
        <p className="uppercase">{disputeNote}</p>
        <p className="text-gray-500">GENERATED VIA TAFF TECH CRM</p>
      </div>
    </div>
  );
}
