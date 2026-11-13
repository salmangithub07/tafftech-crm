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
      className="printable-dispatch printable-invoice w-full max-w-[480px] mx-auto p-4 sm:p-5 bg-white text-black font-sans border-2 border-black rounded-none shadow-none text-xs leading-tight select-text"
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
        <div className="flex justify-center items-center py-0.5">
          {businessLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={businessLogo}
              alt={`${companyName} Logo`}
              className="h-9 sm:h-11 w-auto object-contain max-w-[240px]"
            />
          ) : (
            <h1 className="text-xl sm:text-2xl font-black font-mono tracking-widest uppercase text-slate-900">
              {companyName}
            </h1>
          )}
        </div>
        <div className="bg-[#facc15] bg-yellow-banner text-black font-mono font-black text-xs sm:text-sm tracking-[0.2em] uppercase py-1.5 border-y-2 border-black my-1">
          {challanTitle}
        </div>
      </div>

      {/* Order / Customer & Transport Details Box — Stacked Vertically for a Tall Slip Appearance */}
      <div className="border-2 border-black my-2 text-xs divide-y-2 divide-black">
        {/* Customer Information Section */}
        <div className="p-2.5 space-y-1.5 bg-gray-50/50">
          <p className="font-sans font-semibold text-[12.5px] uppercase">
            NAME : <span className="uppercase font-bold">{d.customer_name || "—"}</span>
          </p>
          <p className="font-sans font-semibold text-[11.5px]">ADDRESS : {d.customer_address || "—"}</p>
          <p className="font-sans font-semibold text-[11.5px]">MOB NO : {d.customer_phone || "N/A"}</p>
          {d.customer_gst_number && (
            <p className="font-sans font-semibold text-black uppercase font-mono text-[11.5px]">
              GSTIN : {d.customer_gst_number}
            </p>
          )}
          <p className="font-sans font-semibold text-[11.5px]">BOOK TO : {d.book_to || "—"}</p>
        </div>

        {/* Transport & Logistics Section */}
        <div className="p-2.5 space-y-1.5 bg-white">
          <p className="font-sans font-semibold text-[12.5px] uppercase">
            GR.NO . <span className="font-mono font-bold">{d.gr_no || docNumber}</span>
          </p>
          <p className="font-sans font-semibold text-black text-[11.5px]">
            DISPATCH DATE : {formattedDate}
          </p>
          <p className="font-sans font-semibold text-black text-[11.5px]">
            DISPATCHED FROM: {d.dispatched_from || "------------------------------------------"}
          </p>
          <p className="font-sans font-semibold text-black text-[11.5px]">
            VEHICLE NO. {d.vehicle_no || "------------------------------------------"}
          </p>
          <p className="font-sans font-semibold text-black text-[11.5px]">
            TRANSPORT. ----{d.transport || "------------------------------------------"}----
          </p>
        </div>
      </div>

      {/* Items Table with Embedded Quantity Summary */}
      <table className="w-full border-collapse border-2 border-black text-xs my-2">
        <thead>
          <tr className="border-b-2 border-black font-bold uppercase text-center bg-gray-100">
            <th
              className="border-r border-black p-2 w-12 align-bottom whitespace-nowrap"
              style={{ width: "44px", whiteSpace: "nowrap" }}
            >
              S.NO
            </th>
            <th className="border-r border-black p-2 text-left align-bottom">
              PARTICULAR / PRODUCT DESCRIPTION
            </th>
            <th className="border-r border-black p-2 w-28 align-bottom">
              HSN CODE
            </th>
            <th className="p-2 w-28 text-center align-bottom">
              QUANTITY (PCS/UNITS)
            </th>
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
                <td className="p-2 font-bold text-center font-mono text-[12.5px]">
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
              <td className="p-2 font-bold text-center font-mono text-[12.5px]">1</td>
            </tr>
          )}

          {/* Clean Total Quantity Row inside the Table */}
          <tr className="border-t-2 border-black font-bold bg-gray-100">
            <td colSpan={3} className="border-r border-black p-2 text-right uppercase tracking-wider text-[11px]">
              TOTAL QUANTITY :
            </td>
            <td className="p-2 text-center font-mono font-black text-xs text-black">
              {totalQuantity} {totalQuantity === 1 ? "UNIT" : "UNITS"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
