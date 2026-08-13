"use client";

import * as React from "react";
import { Printer, LayoutTemplate } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
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

  // Fetch CRM settings & invoice defaults — isolated per tenant
  React.useEffect(() => {
    if (!open || !bill) return;
    if (bill.tenant_id === 4) {
      setTemplate("tafftech_custom" as any);
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.site_name) setSiteName(data.site_name);
        if (bill.tenant_id !== 4 && data?.invoice_template) setTemplate(data.invoice_template);
        if (data?.invoice_terms) setTerms(data.invoice_terms);
        if (data?.bank_details) setBankDetails(data.bank_details);
      })
      .catch(() => {});
  }, [open, bill]);

  if (!bill) return null;

  function handlePrint() {
    const printElement = document.getElementById("bill-print-root");
    if (!printElement) {
      window.print();
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
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${typeof window !== "undefined" ? window.location.origin : ""}/" />
          <title>Invoice - ${bill?.bill_number || "Print"}</title>
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
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #ffffff !important;
              color: #000000 !important;
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
            {/* Template Switcher — hidden for Tenant ID #4 */}
            {bill.tenant_id !== 4 && (
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border text-xs">
                <LayoutTemplate className="size-3.5 text-muted-foreground ml-1.5" />
                {(["modern", "classic", "minimal", "compact"] as const).map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setTemplate(tpl)}
                    className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${
                      template === tpl
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="size-4 no-print" /> Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Invoice content */}
        <div className="p-6">
          <PrintableInvoice
            bill={bill}
            siteName={siteName}
            template={template}
            customTerms={terms}
            bankDetails={bankDetails}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
