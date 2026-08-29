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
  if (!element) {
    return null;
  }

  // Render element to canvas with high resolution scale
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: 1024,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
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
 * Smart WhatsApp & PDF Sharing:
 * - Mobile / Tablet: Generates PDF and shares direct .pdf document file via Native Share.
 * - Desktop / PC: Downloads PDF file and opens WhatsApp Web with 1-Click PDF Link.
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

  // Professional WhatsApp Message Summary with 1-Click PDF Link
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
    publicViewUrl
      ? `👉 *View & Download PDF Invoice:*\n${publicViewUrl}\n`
      : ``,
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

  // Check if Mobile / Tablet device
  const isMobileOrTablet =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  try {
    toast.loading("Preparing PDF for WhatsApp...", { id: "wa-share" });

    let pdfBlob: Blob | null = null;
    try {
      pdfBlob = await generatePdfBlob(elementId);
    } catch {
      pdfBlob = null;
    }

    // On Mobile/Tablet: If PDF blob is ready and navigator supports file sharing
    if (pdfBlob) {
      const pdfFile = new File([pdfBlob], `${pdfFileName}.pdf`, {
        type: "application/pdf",
        lastModified: Date.now(),
      });

      if (isMobileOrTablet && typeof navigator.share === "function" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        toast.dismiss("wa-share");
        try {
          // Native file share with ONLY files array ensures WhatsApp attaches the actual PDF document
          await navigator.share({
            files: [pdfFile],
            title: `${docNumber}.pdf`,
          });
          toast.success("PDF shared successfully!");
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === "AbortError") return; // User closed share drawer
          console.warn("Native share failed, falling back to WhatsApp link:", shareErr);
        }
      }

      // Desktop / Fallback: Instant Download PDF to browser bar
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
    // Open WhatsApp Web/App
    window.open(waUrl, "_blank");
    toast.success(
      isMobileOrTablet
        ? "Opening WhatsApp..."
        : "PDF saved! Drag and attach it in the opened WhatsApp chat.",
      { duration: 5000 }
    );
  } catch (err: any) {
    toast.dismiss("wa-share");
    if (err?.name === "AbortError") return;
    console.error("WhatsApp share error:", err);
    window.open(waUrl, "_blank");
    toast.info("Opened WhatsApp with invoice summary.");
  }
}
