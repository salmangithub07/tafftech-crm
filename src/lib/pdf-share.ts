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
 * Returns null (does NOT throw) if element not found.
 */
export async function generatePdfBlob(elementId: string = "bill-print-root"): Promise<Blob | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth || 850,
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
  } catch (err) {
    console.error("generatePdfBlob error:", err);
    return null;
  }
}

/**
 * Smart WhatsApp & PDF Sharing:
 *
 * MOBILE:
 *   Case A — Modal is open (#bill-print-root exists):
 *     → Generate PDF client-side → Native Share Sheet (files only) → WhatsApp PDF attachment
 *   Case B — Sharing from table row (modal closed, no DOM element):
 *     → Open /view/[type]/[id]?share=1 in a new tab
 *     → That page auto-generates PDF from its own rendered invoice and triggers Native Share
 *
 * DESKTOP:
 *   → Download PDF + Open WhatsApp Web with 1-Click View & Download link
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

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const supportsFileShare =
    typeof navigator !== "undefined" &&
    typeof (navigator as any).share === "function" &&
    typeof (navigator as any).canShare === "function";

  // ─────────────────────────────────────────────────────
  // MOBILE PATH
  // ─────────────────────────────────────────────────────
  if (isMobile && supportsFileShare) {
    // Try generating PDF from already-open modal first
    const existingElement = document.getElementById(elementId);

    if (existingElement) {
      // Modal is open → generate & share directly
      toast.loading("Generating PDF...", { id: "wa-share" });
      const blob = await generatePdfBlob(elementId);
      toast.dismiss("wa-share");

      if (blob) {
        const pdfFile = new File([blob], `${pdfFileName}.pdf`, {
          type: "application/pdf",
          lastModified: Date.now(),
        });
        if ((navigator as any).canShare({ files: [pdfFile] })) {
          try {
            await (navigator as any).share({ files: [pdfFile] });
            toast.success("PDF shared successfully!");
            return;
          } catch (e: any) {
            if (e?.name === "AbortError") return;
            console.warn("Native file share failed, falling back:", e);
          }
        }
      }

      // Share failed → open WhatsApp
      window.open(waUrl, "_blank");
      return;
    }

    // Modal NOT open → open public page with ?share=1 which auto-triggers native share
    if (docId && publicViewUrl) {
      toast.info("Opening PDF share...", { duration: 3000 });
      window.open(`${publicViewUrl}?share=1`, "_blank");
      return;
    }

    // Fallback if no docId
    window.open(waUrl, "_blank");
    return;
  }

  // ─────────────────────────────────────────────────────
  // DESKTOP PATH — Download PDF + Open WhatsApp Web
  // ─────────────────────────────────────────────────────
  toast.loading("Preparing PDF...", { id: "wa-share" });
  try {
    const blob = await generatePdfBlob(elementId);

    if (blob) {
      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `${pdfFileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(fileUrl), 3000);
    }

    toast.dismiss("wa-share");
    window.open(waUrl, "_blank");
    toast.success(
      blob ? "PDF saved! WhatsApp is opening..." : "Opening WhatsApp...",
      { duration: 5000 }
    );
  } catch (err: any) {
    toast.dismiss("wa-share");
    if (err?.name === "AbortError") return;
    console.error("Desktop share error:", err);
    window.open(waUrl, "_blank");
    toast.info("Opened WhatsApp with invoice summary.");
  }
}
