"use client";

import * as React from "react";
import type { Bill } from "@/lib/types";
import type { InvoiceTemplateType } from "@/lib/settings";

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function numberToWords(amount: number): string {
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

  if (!amount || amount <= 0) return "ZERO RUPEES ONLY/-";
  let num = Math.floor(amount);
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

  return (result.trim() + " RUPEES ONLY/-").toUpperCase();
}

export function PrintableInvoice({
  bill,
  siteName,
  template = "modern",
  customTerms,
  bankDetails,
}: {
  bill: Bill;
  siteName?: string;
  template?: InvoiceTemplateType;
  customTerms?: string;
  bankDetails?: string;
}) {
  const companyName = siteName || "CRM Enterprise";
  const termsText =
    customTerms ||
    bill.notes ||
    "1. Goods once sold will not be taken back.\n2. Payment due within 15 days of invoice date.\n3. Subject to local jurisdiction.";
  const bankText =
    bankDetails ||
    "Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234 | UPI: merchant@upi";

  const formattedDate = new Date(bill.bill_date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const balanceDue = Math.max(0, Number(bill.total_amount) - Number(bill.paid_amount));

  // ------------------------- TAFF TECH CUSTOM FORMAT (TENANT ID #4) -------------------------
  if (bill.tenant_id === 4 || (template as string) === "tafftech_custom") {
    const subtotalAmt = Number(bill.subtotal || bill.total_amount || 0);
    const taxAmt = Number(bill.tax_amount || 0);
    const grandTotal = Number(bill.total_amount || 0);

    return (
      <div
        id="bill-print-root"
        className="printable-invoice w-full p-4 sm:p-6 bg-white text-black font-sans border-2 border-black rounded-none shadow-none text-xs leading-tight select-text"
        style={{ color: "#000", backgroundColor: "#fff" }}
      >
        {/* Header Metadata */}
        <div className="flex justify-between items-start text-[11px] font-bold font-mono tracking-tight pb-1 border-b border-black">
          <div>
            <p>GSTIN : 27CENPA9070D1ZI</p>
            <p>PAN NO : CENPA9070D</p>
          </div>
          <div className="text-right">
            <p>PH : 9607086390 / 8788099744</p>
            <p>DATE : {formattedDate}</p>
          </div>
        </div>

        {/* Main Logo & Yellow Industrial Banner */}
        <div className="text-center my-2">
          <div className="flex justify-center items-center py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tafftech-logo.png"
              alt="TAFF TECH Logo"
              className="h-10 sm:h-12 w-auto object-contain max-w-[320px]"
            />
          </div>
          <div className="bg-[#facc15] bg-yellow-banner text-black font-mono font-black text-sm sm:text-base tracking-[0.25em] uppercase py-1 border-y-2 border-black my-1">
            INDUSTRIAL SOLUTIONS
          </div>
          <div className="text-[11px] font-bold mt-1.5 space-y-0.5 leading-snug">
            <p>PLOT NO 4, NIZAMUDDIN COLONY, NAGPUR</p>
            <p>NAGPUR , MAHARASHTRA , INDIA – 440001</p>
            <p>Mobile No - 9607086390/8788099744</p>
          </div>
        </div>

        {/* Order / Customer & Transport Details Box — 2 Horizontal Columns with Border Divider */}
        <div className="border-2 border-black grid grid-cols-2 my-2 text-xs">
          <div className="p-2 border-r-2 border-black space-y-1">
            <p className="font-extrabold uppercase text-sm">PROFORMA INVOICE : {bill.bill_number}</p>
            <p className="font-bold">NAME : <span className="uppercase">{bill.customer_name}</span></p>
            <p className="font-semibold">ADDRESS : {bill.customer_address || "MANGOLDOI DARRANG ASSAM 784147"}</p>
            <p className="font-semibold">MOB NO : {bill.customer_phone || "N/A"}</p>
            <p className="font-semibold">BOOK TO : GUWAHATI CITY (GWTCTY-6818)</p>
          </div>
          <div className="p-2 space-y-1">
            <p className="font-bold">GR.NO . {bill.bill_number}</p>
            <p className="font-semibold text-gray-800">VEHICLE NO. ------------------------------------------</p>
            <p className="font-semibold text-gray-800">TRANSPORT. ----VRL GUWAHATI CITY (GWTCTY-6818)--</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border-2 border-black text-xs my-2">
          <thead>
            <tr className="border-b-2 border-black font-bold uppercase text-center bg-gray-100">
              <th className="border-r border-black p-1.5 w-12 align-bottom">S.NO</th>
              <th className="border-r border-black p-1.5 text-left align-bottom">PARTICULAR</th>
              <th className="border-r border-black p-1.5 w-28 align-bottom">HSN CODE</th>
              <th className="border-r border-black p-1.5 w-20 align-bottom">QUANTITY</th>
              <th className="border-r border-black p-1.5 w-28 text-center leading-snug align-bottom">
                <div>RATE/Unit</div>
                <div className="text-[10px]">(RS)</div>
              </th>
              <th className="p-1.5 w-36 leading-snug align-bottom">
                <div>AMOUNT</div>
                <div className="flex justify-between px-2 text-[10px] font-bold">
                  <span>RS</span>
                  <span>P.</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="align-top">
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item, idx) => (
                <tr key={idx} className="border-b border-black text-center font-medium">
                  <td className="border-r border-black p-2 font-bold">{idx + 1}</td>
                  <td className="border-r border-black p-2 text-left font-bold uppercase">{item.product_name}</td>
                  <td className="border-r border-black p-2 font-mono">{item.product_id || "87341000"}</td>
                  <td className="border-r border-black p-2 font-bold">{item.quantity}</td>
                  <td className="border-r border-black p-2 text-right font-mono font-semibold">
                    {Number(item.unit_price).toLocaleString("en-IN")}/-
                  </td>
                  <td className="p-2 text-right font-mono font-bold">
                    {Number(item.total_price).toLocaleString("en-IN")}/-
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-black text-center font-medium">
                <td className="border-r border-black p-2 font-bold">1</td>
                <td className="border-r border-black p-2 text-left font-bold uppercase">BANDSEALER MACHINE</td>
                <td className="border-r border-black p-2 font-mono">87341000</td>
                <td className="border-r border-black p-2 font-bold">1</td>
                <td className="border-r border-black p-2 text-right font-mono font-semibold">11,500/-</td>
                <td className="p-2 text-right font-mono font-bold">11,500/-</td>
              </tr>
            )}
            <tr className="border-b-2 border-black font-bold">
              <td colSpan={5} className="border-r border-black p-2 text-right uppercase">TOTAL .</td>
              <td className="p-2 text-right font-mono font-bold">{grandTotal.toLocaleString("en-IN")}/-</td>
            </tr>
          </tbody>
        </table>

        {/* Financials & Bank Info Footer Grid — 2 Horizontal Columns with Border Divider */}
        <div className="border-2 border-black grid grid-cols-2 text-xs my-2">
          <div className="p-2 border-r-2 border-black space-y-1 font-semibold">
            <p><strong className="font-bold">Bank Name :</strong> ICICI BANK .</p>
            <p><strong className="font-bold">Branch :</strong> Rani Khothi, Police Lane,GN Road-441002 Maharashtra</p>
            <p><strong className="font-bold">A/C :</strong> 146205002969</p>
            <p><strong className="font-bold">RTGS/NEFT IFS Code :</strong> ICIC0001462</p>
          </div>
          <div className="p-2 space-y-1 font-semibold text-right">
            <div className="flex justify-between">
              <span>Freight other charge</span>
              <span className="font-mono">00</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1">
              <span>TAXABLE AMOUNT</span>
              <span className="font-mono font-bold">{subtotalAmt.toLocaleString("en-IN")}/-</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1">
              <span>IGST(18%)</span>
              <span className="font-mono font-bold">{taxAmt > 0 ? taxAmt.toLocaleString("en-IN") : "00"}/-</span>
            </div>
          </div>
        </div>

        {/* Grand Total Bar — 2 Columns with Vertical Border Divider */}
        <div className="border-2 border-black grid grid-cols-[68%_32%] my-2 text-xs font-bold bg-gray-50">
          <div className="p-2 border-r-2 border-black flex items-center">
            <span>Rupees in word. <span className="font-extrabold uppercase">{numberToWords(grandTotal)}</span></span>
          </div>
          <div className="p-2 flex items-center justify-between font-black text-sm">
            <span>GRAND TOTAL</span>
            <span className="font-mono">{grandTotal.toLocaleString("en-IN")}/-</span>
          </div>
        </div>

        {/* Authorization & Signature Block */}
        <div className="pt-8 pb-4 flex flex-col items-end text-right">
          <p className="font-extrabold text-xs uppercase">FOR TAFFTECH</p>
          <div className="h-12"></div>
          <p className="font-bold text-xs uppercase border-t border-black pt-1 px-4">AUTHORISED SIGNATURE</p>
        </div>

        {/* Dispute Jurisdiction Footer Note */}
        <div className="border-t border-black pt-1.5 text-[10px] font-bold uppercase tracking-tight text-gray-800">
          ATTACHEMENT: 1) ALL DISPUTES SUBJECT TO NAGPUR JURISDICTION
        </div>
      </div>
    );
  }

  // ------------------------- CLASSIC TEMPLATE -------------------------
  if (template === "classic") {
    return (
      <div
        id="bill-print-root"
        className="printable-invoice w-full p-6 bg-card text-card-foreground font-sans border border-border rounded-md shadow-xs text-xs"
      >
        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between mb-6 rounded-xs">
          <div>
            <h1 className="text-xl font-bold tracking-wider uppercase">TAX INVOICE</h1>
            <p className="text-xs text-slate-300 mt-0.5">Invoice #: {bill.bill_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">{companyName}</h2>
            <p className="text-xs text-slate-300">Date: {formattedDate}</p>
          </div>
        </div>

        {/* Billed To & Payment Details */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-border p-3.5 bg-muted/30 rounded-xs">
            <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
              Billed To
            </p>
            <p className="font-bold text-sm text-foreground">{bill.customer_name}</p>
            {bill.customer_phone && <p className="text-xs text-muted-foreground">Phone: {bill.customer_phone}</p>}
            {bill.customer_email && <p className="text-xs text-muted-foreground">Email: {bill.customer_email}</p>}
            {bill.customer_address && <p className="text-xs text-muted-foreground mt-1">{bill.customer_address}</p>}
          </div>

          <div className="border border-border p-3.5 bg-muted/30 rounded-xs flex flex-col justify-between">
            <div>
              <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-2">
                Payment Details
              </p>
              <div className="flex justify-between items-center mb-1 text-muted-foreground">
                <span>Status:</span>
                <span className="font-bold uppercase tracking-wider text-xs text-foreground">{bill.payment_status}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Method:</span>
                <span className="font-bold uppercase text-xs text-foreground">{bill.payment_method}</span>
              </div>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground">
              <span>Paid Amount:</span>
              <span>{formatCurrency(bill.paid_amount)}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-border mb-6">
          <thead>
            <tr className="bg-muted/60 text-foreground font-bold border-b border-border">
              <th className="border border-border px-3 py-2 text-left w-10">#</th>
              <th className="border border-border px-3 py-2 text-left">Item Description</th>
              <th className="border border-border px-3 py-2 text-right w-16">Qty</th>
              <th className="border border-border px-3 py-2 text-right w-24">Rate</th>
              <th className="border border-border px-3 py-2 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items?.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? "bg-muted/20" : "bg-card"}>
                <td className="border border-border px-3 py-2 text-center text-muted-foreground">{idx + 1}</td>
                <td className="border border-border px-3 py-2 font-medium text-foreground">{item.product_name}</td>
                <td className="border border-border px-3 py-2 text-right text-foreground">{item.quantity}</td>
                <td className="border border-border px-3 py-2 text-right text-foreground">{formatCurrency(item.unit_price)}</td>
                <td className="border border-border px-3 py-2 text-right font-bold text-foreground">
                  {formatCurrency(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div className="flex justify-end mb-6">
          <div className="w-72 border border-border p-3.5 space-y-1.5 bg-muted/30 rounded-xs text-muted-foreground">
            <div className="flex justify-between text-xs">
              <span>Subtotal:</span>
              <span className="font-semibold text-foreground">{formatCurrency(bill.subtotal)}</span>
            </div>
            {Number(bill.tax_amount) > 0 && (
              <div className="flex justify-between text-xs">
                <span>Tax (GST):</span>
                <span className="text-foreground">+{formatCurrency(bill.tax_amount)}</span>
              </div>
            )}
            {Number(bill.discount_amount) > 0 && (
              <div className="flex justify-between text-xs text-emerald-500 font-medium">
                <span>Discount:</span>
                <span>-{formatCurrency(bill.discount_amount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm text-foreground">
              <span>Grand Total:</span>
              <span>{formatCurrency(bill.total_amount)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-xs font-bold text-destructive pt-0.5">
                <span>Balance Due:</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms & Bank Info & Signatory */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border text-[11px]">
          <div>
            <p className="font-bold uppercase tracking-wider text-foreground mb-1">Bank &amp; Payment Details</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{bankText}</p>

            <p className="font-bold uppercase tracking-wider text-foreground mt-3 mb-1">Terms &amp; Conditions</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{termsText}</p>
          </div>

          <div className="flex flex-col justify-end text-right">
            <p className="font-bold text-xs text-foreground">For {companyName}</p>
            <div className="h-10" />
            <p className="text-xs border-t border-border inline-block pt-1 ml-auto font-medium text-foreground">
              Authorized Signatory
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------- MINIMAL TEMPLATE -------------------------
  if (template === "minimal") {
    return (
      <div
        id="bill-print-root"
        className="printable-invoice w-full p-6 bg-card text-card-foreground font-sans text-xs border border-border rounded-md shadow-xs"
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-6 mb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-foreground">{companyName}</h1>
            <p className="text-xs text-muted-foreground mt-1">Invoice #{bill.bill_number}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Date</span>
            <p className="text-sm font-semibold text-foreground">{formattedDate}</p>
          </div>
        </div>

        {/* Billed To & Status */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Billed To</p>
            <p className="text-sm font-medium text-foreground">{bill.customer_name}</p>
            {bill.customer_phone && <p className="text-xs text-muted-foreground">{bill.customer_phone}</p>}
            {bill.customer_email && <p className="text-xs text-muted-foreground">{bill.customer_email}</p>}
            {bill.customer_address && <p className="text-xs text-muted-foreground mt-1">{bill.customer_address}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Payment Status</p>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">{bill.payment_status}</p>
            <p className="text-xs text-muted-foreground mt-1">Method: {bill.payment_method.toUpperCase()}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase font-semibold text-muted-foreground">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {bill.items?.map((item, idx) => (
              <tr key={idx}>
                <td className="py-3 font-medium text-foreground">{item.product_name}</td>
                <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                <td className="py-3 text-right text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                <td className="py-3 text-right font-semibold text-foreground">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-foreground font-medium">{formatCurrency(bill.subtotal)}</span>
            </div>
            {Number(bill.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>+{formatCurrency(bill.tax_amount)}</span>
              </div>
            )}
            {Number(bill.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-500">
                <span>Discount</span>
                <span>-{formatCurrency(bill.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-border text-foreground">
              <span>Total</span>
              <span>{formatCurrency(bill.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-border grid grid-cols-2 gap-6 text-[11px] text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-1">Terms &amp; Conditions</p>
            <p className="whitespace-pre-wrap">{termsText}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-foreground mb-1">Bank Details</p>
            <p className="whitespace-pre-wrap">{bankText}</p>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------- COMPACT TEMPLATE -------------------------
  if (template === "compact") {
    return (
      <div
        id="bill-print-root"
        className="printable-invoice w-full p-5 bg-card text-card-foreground font-sans text-[11px] leading-tight border border-border rounded-md shadow-xs"
      >
        {/* Compact Header */}
        <div className="flex justify-between items-center border-b border-border pb-2 mb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">{companyName}</h2>
            <p className="text-[10px] text-muted-foreground">Invoice #: {bill.bill_number} | Date: {formattedDate}</p>
          </div>
          <div className="text-right">
            <span className="font-bold text-[10px] uppercase px-2 py-0.5 border border-border rounded bg-muted/40 text-foreground">
              {bill.payment_status}
            </span>
          </div>
        </div>

        {/* Billed To */}
        <div className="mb-3 bg-muted/30 p-2 rounded border border-border text-foreground">
          <span className="font-bold text-[10px] uppercase text-muted-foreground">Customer: </span>
          <span className="font-bold text-xs text-foreground">{bill.customer_name}</span>
          {bill.customer_phone && <span className="ml-2 text-muted-foreground">({bill.customer_phone})</span>}
        </div>

        {/* Compact Table */}
        <table className="w-full border-collapse border border-border mb-3 text-[11px] text-foreground">
          <thead>
            <tr className="bg-muted/60 font-bold border-b border-border text-muted-foreground">
              <th className="p-1.5 text-left">Item</th>
              <th className="p-1.5 text-right w-12">Qty</th>
              <th className="p-1.5 text-right w-20">Rate</th>
              <th className="p-1.5 text-right w-20">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bill.items?.map((item, idx) => (
              <tr key={idx}>
                <td className="p-1.5 font-medium text-foreground">{item.product_name}</td>
                <td className="p-1.5 text-right text-muted-foreground">{item.quantity}</td>
                <td className="p-1.5 text-right text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                <td className="p-1.5 text-right font-bold text-foreground">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Compact Totals */}
        <div className="flex justify-between items-start mb-3 pt-1 border-t border-border">
          <div className="text-[10px] text-muted-foreground max-w-[50%]">
            <p className="font-bold text-foreground">T&amp;C / Payment:</p>
            <p className="truncate text-muted-foreground">{bankText.replace(/\n/g, " | ")}</p>
          </div>
          <div className="text-right space-y-0.5 text-xs text-muted-foreground">
            <div className="flex gap-4 justify-end">
              <span>Subtotal:</span>
              <span className="font-semibold text-foreground">{formatCurrency(bill.subtotal)}</span>
            </div>
            <div className="flex gap-4 justify-end font-bold text-sm text-foreground border-t border-border pt-0.5">
              <span>Total:</span>
              <span>{formatCurrency(bill.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="text-center text-[9px] text-muted-foreground border-t border-border pt-1">
          Computer generated tax invoice • {companyName}
        </div>
      </div>
    );
  }

  // ------------------------- MODERN TEMPLATE (DEFAULT) -------------------------
  return (
    <div
      id="bill-print-root"
      className="printable-invoice w-full rounded-lg bg-card text-card-foreground font-sans text-xs shadow-xs border border-border p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border pb-5 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">TAX INVOICE</h2>
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">
            Invoice #: {bill.bill_number}
          </p>
          <p className="text-xs text-muted-foreground">
            Date: {formattedDate}
          </p>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-bold text-foreground">{companyName}</h3>
        </div>
      </div>

      {/* Billed To + Payment Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-md border border-border p-4 bg-muted/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Billed To
          </p>
          <p className="text-sm font-bold text-foreground">{bill.customer_name}</p>
          {bill.customer_phone && (
            <p className="text-xs text-muted-foreground">Phone: {bill.customer_phone}</p>
          )}
          {bill.customer_email && (
            <p className="text-xs text-muted-foreground">Email: {bill.customer_email}</p>
          )}
          {bill.customer_address && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {bill.customer_address}
            </p>
          )}
        </div>

        <div className="rounded-md border border-border p-4 bg-muted/30 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Payment Details
            </p>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                  bill.payment_status === "paid"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : bill.payment_status === "unpaid"
                    ? "bg-destructive/20 text-destructive border border-destructive/30"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                }`}
              >
                {bill.payment_status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Method:</span>
              <span className="font-bold uppercase text-foreground">{bill.payment_method}</span>
            </div>
          </div>
          <div className="border-t border-border mt-3 pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Amount Paid:</span>
            <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(bill.paid_amount)}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-md border border-border mb-6 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="text-xs font-bold uppercase text-muted-foreground bg-muted/50 border-b border-border">
            <tr>
              <th className="px-3 py-2.5 text-left w-8">#</th>
              <th className="px-3 py-2.5 text-left">Item &amp; Description</th>
              <th className="px-3 py-2.5 text-right w-16">QTY</th>
              <th className="px-3 py-2.5 text-right w-28">RATE</th>
              <th className="px-3 py-2.5 text-right w-28">AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-foreground">{item.product_name}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="px-3 py-3 text-right font-mono text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(item.total_price)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-xs text-muted-foreground">
                  No item lines found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-72 rounded-md border border-border p-4 flex flex-col gap-1.5 bg-muted/30">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold text-foreground">
              {formatCurrency(bill.subtotal)}
            </span>
          </div>
          {Number(bill.tax_amount) > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax (GST):</span>
              <span className="font-mono text-foreground">+{formatCurrency(bill.tax_amount)}</span>
            </div>
          )}
          {Number(bill.discount_amount) > 0 && (
            <div className="flex justify-between text-xs text-emerald-500 font-medium">
              <span>Discount:</span>
              <span className="font-mono">-{formatCurrency(bill.discount_amount)}</span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
            <span className="text-foreground">Total:</span>
            <span className="font-mono text-primary text-base">
              {formatCurrency(bill.total_amount)}
            </span>
          </div>
          {balanceDue > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Balance Due:</span>
              <span className="font-mono font-bold text-primary">
                {formatCurrency(balanceDue)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bank Details & Terms & Conditions */}
      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border text-[11px] mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Bank / Payment Info
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{bankText}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Terms &amp; Conditions
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{termsText}</p>
        </div>
      </div>

      {/* Footer / Signatory */}
      <div className="border-t border-border pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <div>Thank you for your business! Computer-generated tax invoice.</div>
        <div className="text-right font-semibold text-foreground pt-4 border-t border-border min-w-[140px]">
          Authorized Signatory
        </div>
      </div>
    </div>
  );
}
