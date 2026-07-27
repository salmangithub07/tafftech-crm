"use client";

import * as React from "react";
import type { Bill } from "@/lib/types";

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PrintableInvoice({
  bill,
  siteName,
}: {
  bill: Bill;
  siteName?: string;
}) {
  const companyName = siteName || "CRM Enterprise";

  return (
    <div id="bill-print-root" className="printable-invoice w-full rounded-lg  ">

      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b pb-5 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">TAX INVOICE</h2>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">
            Invoice #: {bill.bill_number}
          </p>
          <p className="text-xs text-muted-foreground">
            Date:{" "}
            {new Date(bill.bill_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-bold text-foreground">{companyName}</h3>
        </div>
      </div>

      {/* ── Billed To + Payment Details ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Billed To */}
        <div className="rounded-md border p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Billed To
          </p>
          <p className="text-sm font-semibold">{bill.customer_name}</p>
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

        {/* Payment Details */}
        <div className="rounded-md border p-4  flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Payment Details
            </p>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`font-semibold uppercase px-2 py-0.5 rounded text-[10px] ${
                  bill.payment_status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : bill.payment_status === "unpaid"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {bill.payment_status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Method:</span>
              <span className="font-semibold uppercase">{bill.payment_method}</span>
            </div>
          </div>
          <div className="border-t mt-3 pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Amount Paid:</span>
            <span className="font-mono text-sm font-bold">{formatCurrency(bill.paid_amount)}</span>
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="rounded-md border mb-6 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left w-8">#</th>
              <th className="px-3 py-2.5 text-left">Item &amp; Description</th>
              <th className="px-3 py-2.5 text-right w-16">QTY</th>
              <th className="px-3 py-2.5 text-right w-28">RATE</th>
              <th className="px-3 py-2.5 text-right w-28">AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-3 font-medium">{item.product_name}</td>
                  <td className="px-3 py-3 text-right">{item.quantity}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold">
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

      {/* ── Summary Totals (right-aligned) ── */}
      <div className="flex justify-end mb-6">
        <div className="w-72 rounded-md border p-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal:</span>
            <span className="font-mono font-medium text-foreground">
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Discount:</span>
              <span className="font-mono text-emerald-600">-{formatCurrency(bill.discount_amount)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-sm font-bold">
            <span>Total:</span>
            <span className="font-mono text-primary text-base">
              {formatCurrency(bill.total_amount)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Balance Due:</span>
            <span className="font-mono font-semibold text-red-500">
              {formatCurrency(
                Math.max(0, Number(bill.total_amount) - Number(bill.paid_amount))
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Notes / Terms ── */}
      {bill.notes && (
        <div className="border-t pt-4 mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Notes / Terms
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{bill.notes}</p>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="border-t pt-4 text-center text-[11px] text-muted-foreground">
        Thank you for your business! This is a computer-generated tax invoice.
      </div>
    </div>
  );
}
