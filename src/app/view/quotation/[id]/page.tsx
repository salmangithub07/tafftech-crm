"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import type { Quotation } from "@/lib/types";

function PublicQuotationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const autoShare = searchParams?.get("share") === "1";

  const [data, setData] = React.useState<{ quotation: Quotation; settings: any } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  const sharedRef = React.useRef(false);

  React.useEffect(() => {
    if (!id) return;
    fetch(`/api/public/quotations/${id}`)
      .then((res) => { if (!res.ok) throw new Error("Quotation not found"); return res.json(); })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || "Failed to load quotation."))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-trigger native PDF share when ?share=1 and on mobile
  React.useEffect(() => {
    if (!autoShare || !data || !invoiceRef.current || sharedRef.current) return;
    sharedRef.current = true;
    setTimeout(() => triggerNativePdfShare(), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShare, data]);

  // Build PDF blob using html2canvas + jsPDF
  async function generatePdfBlob(): Promise<Blob | null> {
    const el = document.getElementById("bill-print-root");
    if (!el) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const html2canvasMod = await import("html2canvas");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const jsPDFMod = await import("jspdf");
      // Handle both default and named exports
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
      const pdfW = 210, pageH = 297;
      const imgH = (canvas.height * pdfW) / canvas.width;
      let left = imgH, pos = 0;
      pdf.addImage(imgData, "JPEG", 0, pos, pdfW, imgH, undefined, "FAST");
      left -= pageH;
      while (left > 0) {
        pos = left - imgH; pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pos, pdfW, imgH, undefined, "FAST");
        left -= pageH;
      }
      return pdf.output("blob");
    } catch (err) {
      console.error("html2canvas PDF error:", err);
      return null;
    }
  }

  // Fallback: open print window with invoice HTML so browser can Save as PDF
  function openPrintWindow(fileName: string) {
    const el = document.getElementById("bill-print-root");
    if (!el) return;
    // Collect all page stylesheets
    let css = "";
    try {
      Array.from(document.styleSheets).forEach((s) => {
        try {
          Array.from(s.cssRules || []).forEach((r) => { css += r.cssText + "\n"; });
        } catch { /* cross-origin sheet */ }
      });
    } catch { /* ignore */ }
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
    setTimeout(() => { win.focus(); win.print(); }, 600);
  }

  async function triggerNativePdfShare() {
    if (!data) return;
    const docNumber = data.quotation.quotation_number || `QT-${data.quotation.id}`;
    const customerName = data.quotation.customer_name || "";
    const fileName = `${customerName ? customerName + " - " : ""}${docNumber}.pdf`;
    const blob = await generatePdfBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "application/pdf", lastModified: Date.now() });
    if ((navigator as any).canShare?.({ files: [file] })) {
      try { await (navigator as any).share({ files: [file] }); }
      catch (e: any) { if (e?.name !== "AbortError") console.error("Share:", e); }
    }
  }

  async function handleDownload() {
    if (!data || downloading) return;
    setDownloading(true);

    const docNumber = data.quotation.quotation_number || `QT-${data.quotation.id}`;
    const customerName = data.quotation.customer_name || "";
    const fileName = `${customerName ? customerName + " - " : ""}${docNumber}.pdf`;

    // Try html2canvas first
    const blob = await generatePdfBlob();
    setDownloading(false);

    if (blob) {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      // Reliable fallback: open in print window → Save as PDF
      openPrintWindow(fileName);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Loader2 className="size-8 animate-spin text-primary mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Loading quotation details...</p>
    </div>
  );

  if (error || !data?.quotation) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="max-w-md bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <span className="text-4xl">📄</span>
        <h1 className="text-xl font-bold text-gray-900">Quotation Not Found</h1>
        <p className="text-sm text-gray-500">The requested quotation is unavailable or the link is invalid.</p>
      </div>
    </div>
  );

  const { quotation, settings } = data;
  const docNumber = quotation.quotation_number || `QT-${quotation.id}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm sm:text-base text-gray-900">
            {settings?.site_name || "Quotation Details"}
          </span>
          <span className="text-xs bg-orange-100 text-orange-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            {docNumber}
          </span>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          variant="default"
          size="sm"
          className="gap-1.5 shadow-sm min-w-[140px]"
        >
          {downloading
            ? <><Loader2 className="size-4 animate-spin" /> Generating...</>
            : <><Download className="size-4" /> Download PDF</>
          }
        </Button>
      </header>

      <main className="flex-1 w-full overflow-x-auto p-2 sm:p-8">
        <div className="min-w-fit flex justify-center py-2">
          <div
            ref={invoiceRef}
            className="w-full max-w-[850px] min-w-[700px] bg-white text-black shadow-xl rounded-md border"
            style={{ color: "#000", backgroundColor: "#fff" }}
          >
            <PrintableInvoice
              bill={quotation}
              siteName={settings?.site_name}
              settings={settings}
              documentType="PROFORMA INVOICE"
            />
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        Powered by <span className="font-bold text-orange-600">Taff Desk CRM</span>
      </footer>
    </div>
  );
}

export default function PublicQuotationPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <PublicQuotationContent />
    </React.Suspense>
  );
}
