"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export type ShareDocumentOptions = {
  elementId?: string;
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
    throw new Error(`Printable element #${elementId} not found.`);
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
 * - Mobile / Tablets: Uses Native Web Share API to attach the actual .pdf file directly in WhatsApp!
 * - Desktop / PC: Automatically downloads the PDF and opens WhatsApp Web with pre-formatted invoice summary text.
 */
export async function shareDocumentOnWhatsApp(opts: ShareDocumentOptions): Promise<void> {
  const {
    elementId = "bill-print-root",
    docType,
    docNumber,
    customerName,
    customerPhone,
    totalAmount,
    siteName,
    date,
  } = opts;

  const pdfFileName = `${customerName ? customerName.trim() + " - " : ""}${docNumber}`;
  const formattedAmount = totalAmount ? `₹${Number(totalAmount).toLocaleString("en-IN")}` : "—";
  const businessTitle = siteName?.trim() || "Our Company";

  // Professional WhatsApp Message Summary
  const waMessage = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 *${docType.toUpperCase()}: ${docNumber}*`,
    `🏢 *${businessTitle}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    customerName ? `Dear *${customerName.trim()}*,` : `Hello,`,
    ``,
    `Please find your official *${docType}* document attached.`,
    date ? `📅 *Date:* ${date}` : ``,
    `💰 *Total Amount:* *${formattedAmount}*`,
    ``,
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

  // Check if Mobile or Tablet supporting native file share
  const isMobileOrTablet =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  try {
    toast.loading("Generating PDF for WhatsApp...", { id: "wa-share" });
    const pdfBlob = await generatePdfBlob(elementId);

    if (!pdfBlob) {
      throw new Error("Could not generate PDF file.");
    }

    const pdfFile = new File([pdfBlob], `${pdfFileName}.pdf`, {
      type: "application/pdf",
      lastModified: Date.now(),
    });

    // Try Mobile Native Share (WhatsApp with PDF attached)
    if (isMobileOrTablet && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      toast.dismiss("wa-share");
      await navigator.share({
        files: [pdfFile],
        title: `${docType} - ${docNumber}`,
        text: waMessage,
      });
      toast.success("Shared to WhatsApp successfully!");
      return;
    }

    // Desktop / Fallback Flow: Download PDF + Open WhatsApp Web
    toast.dismiss("wa-share");

    // 1. Instant Download PDF
    const fileUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `${pdfFileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(fileUrl), 2000);

    // 2. Open WhatsApp Web
    window.open(waUrl, "_blank");

    toast.success("PDF saved! Drag and attach it in the opened WhatsApp chat.", {
      duration: 6000,
    });
  } catch (err: any) {
    toast.dismiss("wa-share");
    if (err?.name === "AbortError") {
      // User cancelled share dialog
      return;
    }
    console.error("WhatsApp share error:", err);
    // If PDF generation failed, open WhatsApp with text message
    window.open(waUrl, "_blank");
    toast.info("Opened WhatsApp with invoice summary.");
  }
}
