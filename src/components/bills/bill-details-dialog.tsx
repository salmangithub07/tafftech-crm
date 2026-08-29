"use client";

import * as React from "react";
import { Printer, LayoutTemplate, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import { shareDocumentOnWhatsApp } from "@/lib/pdf-share";
import type { Bill } from "@/lib/types";
import type { InvoiceTemplateType } from "@/lib/settings";

export function BillDetailsDialog({
  open,
  onOpenChange,
  bill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
}) {
  const [siteName, setSiteName] = React.useState<string>("");
  const [template, setTemplate] = React.useState<InvoiceTemplateType>("modern");
  const [terms, setTerms] = React.useState<string>("");
  const [bankDetails, setBankDetails] = React.useState<string>("");
  const [settingsData, setSettingsData] = React.useState<any>(null);

  // Fetch CRM settings & invoice defaults — isolated per tenant
  React.useEffect(() => {
    if (!open || !bill) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) setSettingsData(data);
        if (data?.site_name) setSiteName(data.site_name);
        if (data?.invoice_template) setTemplate(data.invoice_template);
        if (data?.invoice_terms) setTerms(data.invoice_terms);
        if (data?.bank_details) setBankDetails(data.bank_details);
      })
      .catch(() => {});
  }, [open, bill]);

  if (!bill) return null;

  function handlePrint() {
    const printElement = document.getElementById("bill-print-root");
    const pdfFileName = bill
      ? `${bill.customer_name ? bill.customer_name.trim() + " - " : ""}${bill.bill_number}`
      : "Invoice";

    const originalTitle = document.title;
    document.title = pdfFileName;

    const resetTitle = () => {
      setTimeout(() => {
        document.title = originalTitle;
      }, 3000);
    };

    if (!printElement) {
      window.print();
      resetTitle();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      resetTitle();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${typeof window !== "undefined" ? window.location.origin : ""}/" />
          <title>${pdfFileName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 8px;
              font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .font-heading {
              font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif !important;
            }
            .bg-yellow-banner {
              background-color: #facc15 !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          ${printElement.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  if (window.frameElement) window.frameElement.remove();
                }, 1000);
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
    resetTitle();
  }

  function handleWhatsAppShare() {
    if (!bill) return;
    shareDocumentOnWhatsApp({
      elementId: "bill-print-root",
      docType: "Bill",
      docNumber: bill.bill_number,
      customerName: bill.customer_name,
      customerPhone: bill.customer_phone,
      totalAmount: Number(bill.total_amount || 0),
      siteName,
      date: bill.bill_date,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header — hidden on print via .no-print */}
        <DialogHeader className="flex flex-col gap-3 border-b px-6 py-4 space-y-0 sm:flex-row sm:items-center sm:justify-between no-print">
          <DialogTitle className="text-lg font-semibold">
            Bill Details - {bill.bill_number}
          </DialogTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="gap-1.5 border-emerald-500/50 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold"
            >
              <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" /> Share on WhatsApp
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="size-4 no-print" /> Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Invoice content */}
        <div className="p-3 sm:p-6 bg-slate-100 dark:bg-slate-900 overflow-x-auto sm:flex sm:justify-center">
          <div className="w-[620px] sm:w-full max-w-[850px] bg-white text-black shadow-lg rounded-sm overflow-hidden shrink-0">
            <PrintableInvoice
              bill={bill}
              siteName={siteName}
              template={template}
              customTerms={terms}
              bankDetails={bankDetails}
              settings={settingsData}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
