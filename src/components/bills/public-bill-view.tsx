"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import { PinchZoomContainer } from "@/components/ui/pinch-zoom-container";
import type { Bill } from "@/lib/types";

export function PublicBillView({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const autoShare = searchParams?.get("share") === "1";

  const [data, setData] = React.useState<{ bill: Bill; settings: any } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  const sharedRef = React.useRef(false);

  React.useEffect(() => {
    if (!id) return;
    fetch(`/api/public/bills/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invoice not found");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || "Failed to load bill."))
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => {
    if (!autoShare || !data || !invoiceRef.current || sharedRef.current) return;
    sharedRef.current = true;
    setTimeout(() => triggerNativePdfShare(), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShare, data]);

  async function generatePdfBlob(): Promise<Blob | null> {
    const el = document.getElementById("bill-print-root");
    if (!el) return null;
    try {
      const html2canvasMod = await import("html2canvas");
      const jsPDFMod = await import("jspdf");
      const h2c = (html2canvasMod as any).default ?? (html2canvasMod as any);
      const JSPDF = (jsPDFMod as any).default ?? (jsPDFMod as any).jsPDF ?? (jsPDFMod as any);

      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await h2c(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 8000,
        removeContainer: true,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new JSPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210,
        pageH = 297;
      const imgH = (canvas.height * pdfW) / canvas.width;
      let left = imgH,
        pos = 0;
      pdf.addImage(imgData, "JPEG", 0, pos, pdfW, imgH, undefined, "FAST");
      left -= pageH;
      while (left > 0) {
        pos = left - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pos, pdfW, imgH, undefined, "FAST");
        left -= pageH;
      }
      return pdf.output("blob");
    } catch (err) {
      console.error("html2canvas PDF error:", err);
      return null;
    }
  }

  function openPrintWindow(fileName: string) {
    const el = document.getElementById("bill-print-root");
    if (!el) return;
    let css = "";
    try {
      Array.from(document.styleSheets).forEach((s) => {
        try {
          Array.from(s.cssRules || []).forEach((r) => {
            css += r.cssText + "\n";
          });
        } catch {
          /* cross-origin */
        }
      });
    } catch {
      /* ignore */
    }
    const win = window.open("", "_blank", "width=900,height=750");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${fileName}</title>
      <style>
        ${css}
        body { margin: 0; padding: 16px; background: #fff; font-family: sans-serif; }
        @page { size: A4 portrait; margin: 6mm; }
      </style>
    </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 600);
  }

  async function triggerNativePdfShare() {
    if (!data) return;
    const customerName = data.bill.customer_name || "";
    const fileName = `${customerName ? customerName + " - " : ""}${data.bill.bill_number}.pdf`;
    const blob = await generatePdfBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "application/pdf", lastModified: Date.now() });
    if ((navigator as any).canShare?.({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file] });
      } catch (e: any) {
        if (e?.name !== "AbortError") console.error("Share:", e);
      }
    }
  }

  async function handleDownload() {
    if (!data || downloading) return;
    setDownloading(true);

    const customerName = data.bill.customer_name || "";
    const fileName = `${customerName ? customerName + " - " : ""}${data.bill.bill_number}.pdf`;

    const blob = await generatePdfBlob();
    setDownloading(false);

    if (blob) {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      openPrintWindow(fileName);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Loading invoice details...</p>
      </div>
    );

  if (error || !data?.bill)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <span className="text-4xl">🧾</span>
          <h1 className="text-xl font-bold text-gray-900">Invoice Not Found</h1>
          <p className="text-sm text-gray-500">The requested invoice is unavailable or the link is invalid.</p>
        </div>
      </div>
    );

  const { bill, settings } = data;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-3 py-2.5 sm:px-8 sm:py-3 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <span className="font-bold text-xs sm:text-base text-gray-900 truncate">
            {settings?.site_name || "Invoice Details"}
          </span>
          <span className="text-[11px] sm:text-xs bg-orange-100 text-orange-700 font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
            {bill.bill_number}
          </span>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          variant="default"
          size="sm"
          className="gap-1.5 shadow-sm h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-4 shrink-0 font-medium"
        >
          {downloading ? (
            <>
              <Loader2 className="size-3.5 sm:size-4 animate-spin" />
              <span className="hidden sm:inline">Generating...</span>
              <span className="sm:hidden">Saving...</span>
            </>
          ) : (
            <>
              <Download className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </>
          )}
        </Button>
      </header>

      <main className="flex-1 w-full p-2 sm:p-8">
        <PinchZoomContainer>
          <div
            ref={invoiceRef}
            className="w-[750px] bg-white text-black shadow-xl rounded-md border"
            style={{ color: "#000", backgroundColor: "#fff" }}
          >
            <PrintableInvoice
              bill={bill}
              siteName={settings?.site_name}
              settings={settings}
              template={settings?.invoice_template || "modern"}
              customTerms={settings?.invoice_terms}
              bankDetails={settings?.bank_details}
              documentType="TAX INVOICE"
            />
          </div>
        </PinchZoomContainer>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        Powered by <span className="font-bold text-orange-600">Taff Desk CRM</span>
      </footer>
    </div>
  );
}
