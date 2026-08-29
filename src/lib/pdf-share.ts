"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export type ShareDocumentOptions = {
  elementId?: string;
  docId?: number | string | null;
  docType: "Quotation" | "Bill" | "Invoice" | "Proforma Invoice";
  docNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount?: number | null;
  siteName?: string | null;
  date?: string | null;
};

/**
 * Generates an A4 PDF Blob from a DOM element using html2canvas & jsPDF.
 */
export async function generatePdfBlob(elementId: string = "bill-print-root"): Promise<Blob | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

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
  return pdf.output("blob");
}

/**
 * Generates a PDF Blob by fetching public API data and rendering the invoice
 * into a hidden off-screen div. Works regardless of whether the modal is open.
 */
async function generatePdfFromPublicApi(
  docId: number | string,
  docType: "Quotation" | "Bill" | "Invoice" | "Proforma Invoice",
  pdfFileName: string
): Promise<Blob | null> {
  try {
    const routeSegment = docType.toLowerCase() === "bill" ? "bills" : "quotations";
    const res = await fetch(`/api/public/${routeSegment}/${docId}`);
    if (!res.ok) return null;
    const apiData = await res.json();
    const docData = apiData.quotation || apiData.bill;
    const settings = apiData.settings || {};

    if (!docData) return null;

    // Dynamically import PrintableInvoice renderer
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { PrintableInvoice } = await import("@/components/bills/printable-invoice");
    const React = await import("react");

    const html = renderToStaticMarkup(
      React.createElement(PrintableInvoice, {
        bill: docData,
        siteName: settings.site_name,
        settings: settings,
        template: settings.invoice_template || "modern",
        customTerms: settings.invoice_terms,
        bankDetails: settings.bank_details,
        documentType: docType === "Bill" ? "TAX INVOICE" : "PROFORMA INVOICE",
      } as any)
    );

    // Mount in a hidden off-screen container
    const container = document.createElement("div");
    container.style.cssText = [
      "position:fixed",
      "top:0",
      "left:-9999px",
      "width:850px",
      "background:#fff",
      "color:#000",
      "z-index:-9999",
      "overflow:visible",
    ].join(";");
    container.innerHTML = html;
    document.body.appendChild(container);

    // Wait a tick for styles to apply
    await new Promise((r) => setTimeout(r, 120));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 850,
    });

    document.body.removeChild(container);

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
    return pdf.output("blob");
  } catch (err) {
    console.error("generatePdfFromPublicApi error:", err);
    return null;
  }
}

/**
 * Smart WhatsApp & PDF Sharing:
 * - Mobile / Tablet: Generates actual PDF and opens Native Share Sheet with ONLY the .pdf file — WhatsApp attaches it directly.
 * - Desktop / PC: Downloads PDF file and opens WhatsApp Web with 1-Click View & Download link.
 */
export async function shareDocumentOnWhatsApp(opts: ShareDocumentOptions): Promise<void> {
  const {
    elementId = "bill-print-root",
    docId,
    docType,
    docNumber,
    customerName,
    customerPhone,
    totalAmount,
    siteName,
    date,
  } = opts;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const routeSegment = docType.toLowerCase() === "bill" ? "bill" : "quotation";
  const publicViewUrl = docId ? `${origin}/view/${routeSegment}/${docId}` : "";

  const pdfFileName = `${customerName ? customerName.trim() + " - " : ""}${docNumber}`;
  const formattedAmount = totalAmount ? `₹${Number(totalAmount).toLocaleString("en-IN")}` : "—";
  const businessTitle = siteName?.trim() || "Our Company";

  const waMessage = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 *${docType.toUpperCase()}: ${docNumber}*`,
    `🏢 *${businessTitle}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    customerName ? `Dear *${customerName.trim()}*,` : `Hello,`,
    ``,
    `Please find your official *${docType}* details below:`,
    date ? `📅 *Date:* ${date}` : ``,
    `💰 *Total Amount:* *${formattedAmount}*`,
    ``,
    publicViewUrl ? `👉 *View & Download PDF Invoice:*\n${publicViewUrl}\n` : ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Thank you for your business!`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ]
    .filter(Boolean)
    .join("\n");

  const cleanPhone = customerPhone ? customerPhone.replace(/[^0-9]/g, "") : "";
  const phoneParam = cleanPhone && cleanPhone.length >= 10 ? `91${cleanPhone.slice(-10)}` : "";
  const waUrl = phoneParam
    ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(waMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  const isMobileOrTablet =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // ──────────────────────────────────────────────────
  // MOBILE PATH: Generate actual PDF → Native Share → WhatsApp file attachment
  // ──────────────────────────────────────────────────
  if (isMobileOrTablet && typeof navigator.share === "function") {
    toast.loading("Generating PDF...", { id: "wa-share" });
    try {
      // Try from existing DOM element first (when modal is open)
      let pdfBlob = await generatePdfBlob(elementId);

      // If modal not open → generate from public API
      if (!pdfBlob && docId) {
        pdfBlob = await generatePdfFromPublicApi(docId, docType, pdfFileName);
      }

      if (pdfBlob) {
        const pdfFile = new File([pdfBlob], `${pdfFileName}.pdf`, {
          type: "application/pdf",
          lastModified: Date.now(),
        });

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          toast.dismiss("wa-share");
          try {
            // Pass ONLY files — no title/text — so WhatsApp doesn't drop the file
            await navigator.share({ files: [pdfFile] });
            toast.success("PDF shared successfully!");
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === "AbortError") {
              toast.dismiss("wa-share");
              return;
            }
            console.warn("Native file share failed:", shareErr);
          }
        }
      }

      // Native share not supported or failed → open WhatsApp text link
      toast.dismiss("wa-share");
      window.open(waUrl, "_blank");
      toast.info("Opened WhatsApp with invoice link.");
    } catch (err: any) {
      toast.dismiss("wa-share");
      if (err?.name === "AbortError") return;
      console.error("Mobile share error:", err);
      window.open(waUrl, "_blank");
    }
    return;
  }

  // ──────────────────────────────────────────────────
  // DESKTOP PATH: Download PDF + Open WhatsApp Web
  // ──────────────────────────────────────────────────
  toast.loading("Preparing PDF...", { id: "wa-share" });
  try {
    let pdfBlob = await generatePdfBlob(elementId);
    if (!pdfBlob && docId) {
      pdfBlob = await generatePdfFromPublicApi(docId, docType, pdfFileName);
    }

    if (pdfBlob) {
      const fileUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `${pdfFileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(fileUrl), 2000);
    }

    toast.dismiss("wa-share");
    window.open(waUrl, "_blank");
    toast.success("PDF saved! WhatsApp is opening...", { duration: 5000 });
  } catch (err: any) {
    toast.dismiss("wa-share");
    if (err?.name === "AbortError") return;
    console.error("Desktop share error:", err);
    window.open(waUrl, "_blank");
    toast.info("Opened WhatsApp with invoice summary.");
  }
}
