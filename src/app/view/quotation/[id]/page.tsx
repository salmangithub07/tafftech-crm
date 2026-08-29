"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import type { Quotation } from "@/lib/types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function PublicQuotationPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = React.useState<{ quotation: Quotation; settings: any } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);
  const invoiceRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!id) return;
    fetch(`/api/public/quotations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Quotation not found");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || "Failed to load quotation."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownloadPDF() {
    if (!invoiceRef.current || !data) return;
    setDownloading(true);
    try {
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
      const docNumber = data.quotation.quotation_number || `QT-${data.quotation.id}`;
      const customerName = data.quotation.customer_name || "";
      pdf.save(`${customerName ? customerName + " - " : ""}${docNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Loading quotation details...</p>
      </div>
    );
  }

  if (error || !data?.quotation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <span className="text-4xl">📄</span>
          <h1 className="text-xl font-bold text-gray-900">Quotation Not Found</h1>
          <p className="text-sm text-gray-500">
            The requested quotation document is either expired, removed, or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const { quotation, settings } = data;
  const docNumber = quotation.quotation_number || `QT-${quotation.id}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
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
          onClick={handleDownloadPDF}
          disabled={downloading}
          variant="default"
          size="sm"
          className="gap-1.5 shadow-sm"
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {downloading ? "Generating..." : "Download / Print PDF"}
        </Button>
      </header>

      {/* Invoice Container */}
      <main className="flex-1 flex justify-center p-3 sm:p-8">
        <div
          ref={invoiceRef}
          className="w-full max-w-[850px] bg-white text-black shadow-xl rounded-md overflow-hidden"
          style={{ minWidth: 600 }}
        >
          <PrintableInvoice
            bill={quotation}
            siteName={settings?.site_name}
            settings={settings}
            documentType="PROFORMA INVOICE"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        Powered by <span className="font-bold text-orange-600">Taff Desk CRM</span>
      </footer>
    </div>
  );
}
