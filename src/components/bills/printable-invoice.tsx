"use client";

import * as React from "react";
import type { Bill } from "@/lib/types";

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PrintableInvoice({ bill }: { bill: Bill }) {
  return (
    <div className="printable-invoice w-full max-w-3xl rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">TAX INVOICE</h2>
          <p className="text-sm font-semibold text-muted-foreground">Invoice #: {bill.bill_number}</p>
          <p className="text-xs text-muted-foreground">
            Date: {new Date(bill.bill_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="sm:text-right">
          <h3 className="text-lg font-semibold text-foreground">Nova CRM Enterprise</h3>
          <p className="text-xs text-muted-foreground">GST / Tax ID: 27AAAAA0000A1Z5</p>
          <p className="text-xs text-muted-foreground">Support: contact@novacrm.com</p>
        </div>
      </div>

      {/* Bill To & Payment Info */}
      <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
        <div className="rounded-md border p-4 bg-muted/20">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Billed To</p>
          <p className="mt-1 text-base font-medium">{bill.customer_name}</p>
          {bill.customer_phone && <p className="text-xs text-muted-foreground">Phone: {bill.customer_phone}</p>}
          {bill.customer_email && <p className="text-xs text-muted-foreground">Email: {bill.customer_email}</p>}
          {bill.customer_address && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{bill.customer_address}</p>}
        </div>

        <div className="rounded-md border p-4 bg-muted/20 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Payment Details</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-semibold uppercase px-2 py-0.5 rounded text-[10px] ${
                bill.payment_status === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                bill.payment_status === "unpaid" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" :
                "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}>
                {bill.payment_status}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Method:</span>
              <span className="font-medium uppercase">{bill.payment_method}</span>
            </div>
          </div>
          <div className="mt-3 border-t pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Amount Paid:</span>
            <span className="font-mono text-sm font-bold">{formatCurrency(bill.paid_amount)}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Item &amp; Description</th>
              <th className="px-4 py-2.5 text-right">Qty</th>
              <th className="px-4 py-2.5 text-right">Rate</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/10">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(item.total_price)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-xs text-muted-foreground">No item lines found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Totals */}
      <div className="mt-6 flex flex-col justify-end gap-2 sm:flex-row">
        <div className="w-full sm:w-72 flex flex-col gap-1.5 rounded-md border p-4 bg-muted/10">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal:</span>
            <span className="font-mono font-medium text-foreground">{formatCurrency(bill.subtotal)}</span>
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
              <span className="font-mono text-emerald-600 dark:text-emerald-400">-{formatCurrency(bill.discount_amount)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-sm font-bold text-foreground">
            <span>Total:</span>
            <span className="font-mono text-primary text-base">{formatCurrency(bill.total_amount)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Balance Due:</span>
            <span className="font-mono font-semibold text-destructive">
              {formatCurrency(Math.max(0, Number(bill.total_amount) - Number(bill.paid_amount)))}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {bill.notes && (
        <div className="mt-6 border-t pt-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Notes / Terms</p>
          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{bill.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t pt-4 text-center text-[11px] text-muted-foreground">
        Thank you for your business! This is a computer-generated tax invoice.
      </div>
    </div>
  );
}
