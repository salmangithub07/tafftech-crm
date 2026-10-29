"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Printer,
  MessageSquare,
  Save,
  Truck,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PinchZoomContainer } from "@/components/ui/pinch-zoom-container";
import { PrintableDispatchSlip } from "@/components/dispatch/printable-dispatch-slip";
import type { Bill, Quotation } from "@/lib/types";

interface DispatchDetailViewProps {
  type: "bill" | "quotation";
  docId: string | number;
}

export function DispatchDetailView({ type, docId }: DispatchDetailViewProps) {
  const router = useRouter();
  const [doc, setDoc] = React.useState<Bill | Quotation | null>(null);
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  // Form states for dispatch logistics
  const [documentTitle, setDocumentTitle] = React.useState<string>("TAX INVOICE");
  const [dispatchedFrom, setDispatchedFrom] = React.useState("");
  const [bookTo, setBookTo] = React.useState("");
  const [transport, setTransport] = React.useState("");
  const [vehicleNo, setVehicleNo] = React.useState("");
  const [grNo, setGrNo] = React.useState("");
  const [disputeNote, setDisputeNote] = React.useState("");

  const apiPath = type === "bill" ? `/api/bills/${docId}` : `/api/quotations/${docId}`;
  const backUrl = type === "bill" ? `/bills/${docId}` : `/quotations/${docId}`;

  const fetchDocument = React.useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, sRes] = await Promise.all([
        fetch(apiPath),
        fetch("/api/settings"),
      ]);

      if (!dRes.ok) {
        throw new Error(`${type === "bill" ? "Bill" : "Quotation"} not found`);
      }

      const dData = await dRes.json();
      const sData = sRes.ok ? await sRes.json() : null;

      setDoc(dData);
      if (sData) setSettings(sData);

      // Initialize form fields
      setDocumentTitle(dData.document_title || (type === "bill" ? "TAX INVOICE" : "PROFORMA INVOICE"));
      setDispatchedFrom(dData.dispatched_from || "");
      setBookTo(dData.book_to || "");
      setTransport(dData.transport || "");
      setVehicleNo(dData.vehicle_no || "");
      setGrNo(dData.gr_no || "");
      setDisputeNote(dData.dispute_note || sData?.dispute_note || "");
    } catch (err: any) {
      toast.error(err?.message || "Failed to load document.");
    } finally {
      setLoading(false);
    }
  }, [apiPath, type]);

  React.useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  async function handleSaveDispatchDetails() {
    if (!doc) return;
    setSaving(true);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_title: documentTitle,
          dispatched_from: dispatchedFrom,
          book_to: bookTo,
          transport,
          vehicle_no: vehicleNo,
          gr_no: grNo,
          dispute_note: disputeNote,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save dispatch details");
      }

      // Update local doc state
      setDoc((prev: any) =>
        prev
          ? {
              ...prev,
              document_title: documentTitle,
              dispatched_from: dispatchedFrom,
              book_to: bookTo,
              transport,
              vehicle_no: vehicleNo,
              gr_no: grNo,
              dispute_note: disputeNote,
            }
          : null
      );

      toast.success("Dispatch details updated successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Error saving dispatch details.");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    const printElement = document.getElementById("dispatch-print-root");
    const docNumber = (doc as any)?.bill_number || (doc as any)?.quotation_number || `DOC-${docId}`;
    const pdfFileName = `${doc?.customer_name ? doc.customer_name.trim() + " - " : ""}Dispatch Challan ${docNumber}`;

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

    // Collect all stylesheets and style tags from current document
    const headStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentWindow?.document;
    if (!iDoc) {
      window.print();
      resetTitle();
      return;
    }

    iDoc.open();
    iDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${typeof window !== "undefined" ? window.location.origin : ""}/" />
          <title>${pdfFileName}</title>
          ${headStyles}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif !important;
            }
            #dispatch-print-root {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              border: 2px solid #000000 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
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
          <div style="padding: 0; margin: 0;">
            ${printElement.outerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  if (window.frameElement) window.frameElement.remove();
                }, 1000);
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    iDoc.close();
    resetTitle();
  }

  async function handleDownloadPDF() {
    if (!doc) return;
    const el = document.getElementById("dispatch-print-root");
    if (!el) {
      toast.error("Dispatch element not found for export.");
      return;
    }

    setDownloading(true);
    try {
      const html2canvasMod = await import("html2canvas");
      const jsPDFMod = await import("jspdf");
      const h2c = (html2canvasMod as any).default ?? (html2canvasMod as any);
      const JSPDF = (jsPDFMod as any).default ?? (jsPDFMod as any).jsPDF ?? (jsPDFMod as any);

      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 150));

      const canvas = await h2c(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 8000,
      });

      const docNumber = (doc as any).bill_number || (doc as any).quotation_number || `DOC-${docId}`;
      const customerName = doc.customer_name || "";
      const fileName = `${customerName ? customerName + " - " : ""}Dispatch Challan ${docNumber}.pdf`;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new JSPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210, pageH = 297;
      const imgH = (canvas.height * pdfW) / canvas.width;
      let left = imgH, pos = 0;
      pdf.addImage(imgData, "JPEG", 0, pos, pdfW, imgH, undefined, "FAST");
      left -= pageH;
      while (left > 0) {
        pos = left - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pos, pdfW, imgH, undefined, "FAST");
        left -= pageH;
      }

      pdf.save(fileName);
      toast.success("Dispatch Challan PDF downloaded successfully.");
    } catch (err) {
      console.warn("Direct PDF generation failed, falling back to print dialog:", err);
      handlePrint();
    } finally {
      setDownloading(false);
    }
  }

  function handleWhatsAppShare() {
    if (!doc) return;
    const d = doc as any;
    const docNumber = d.bill_number || d.quotation_number || `DOC-${docId}`;
    const businessTitle = settings?.site_name?.replace(/\bCRM\b/gi, "").trim() || "Our Company";
    const totalQty = (d.items || []).reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
    const docDate = new Date(d.bill_date || d.quotation_date || d.created_at || Date.now()).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    // Pure dispatch details - NO PRICING OR TAXES
    const waMessage = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *DELIVERY / DISPATCH CHALLAN*`,
      `🏢 *${businessTitle}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      d.customer_name ? `Dear *${d.customer_name.trim()}*,` : `Hello,`,
      ``,
      `Your shipment has been prepared for dispatch. Details:`,
      `📄 *Ref Document:* ${documentTitle.toUpperCase()} (${docNumber})`,
      `📅 *Date:* ${docDate}`,
      `📦 *Total Quantity:* *${totalQty} Units*`,
      dispatchedFrom ? `📍 *Dispatched From:* ${dispatchedFrom}` : ``,
      bookTo ? `🎯 *Destination (Book To):* ${bookTo}` : ``,
      transport ? `🚚 *Transport / Carrier:* ${transport}` : ``,
      vehicleNo ? `🚛 *Vehicle No:* ${vehicleNo}` : ``,
      grNo ? `📑 *GR / LR No:* ${grNo}` : ``,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Goods dispatched in intact condition.`,
      `Thank you for doing business with us!`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ]
      .filter(Boolean)
      .join("\n");

    const cleanPhone = d.customer_phone ? d.customer_phone.replace(/[^0-9]/g, "") : "";
    const phoneParam = cleanPhone && cleanPhone.length >= 10 ? `91${cleanPhone.slice(-10)}` : "";
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(waMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

    window.open(waUrl, "_blank");
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading Dispatch Slip...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Document Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested document could not be located.</p>
        <Button variant="outline" asChild>
          <Link href={type === "bill" ? "/bills" : "/quotations"}>Go Back</Link>
        </Button>
      </div>
    );
  }

  const docNumber = (doc as any).bill_number || (doc as any).quotation_number || `DOC-${docId}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none print:pb-0">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={backUrl} className="gap-1.5 text-xs">
              <ArrowLeft className="size-3.5" />
              <span>Back to {type === "bill" ? "Bill" : "Quotation"}</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Create &amp; Print Dispatch Slip</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Reference: <span className="font-semibold text-foreground font-mono">{docNumber}</span> ({doc.customer_name})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-9"
          >
            <Printer className="size-3.5" />
            <span>Print Challan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-1.5 text-xs h-9"
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>{downloading ? "Generating..." : "Download PDF"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="gap-1.5 text-xs h-9 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800"
          >
            <MessageSquare className="size-3.5" />
            <span>WhatsApp Share</span>
          </Button>
        </div>
      </div>

      {/* Grid: Logistics Edit Panel (Left/Top) & Live Preview (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block print:p-0 print:m-0">
        {/* Logistics Edit Panel */}
        <div className="lg:col-span-4 space-y-4 print:hidden">
          <Card className="shadow-sm border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Dispatch Options &amp; Logistics</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configure document title and transport information. Pricing and tax amounts are completely omitted from this challan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              {/* Document Title Header Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="doc-title" className="text-xs font-semibold">
                  Challan Header Title
                </Label>
                <Select
                  value={documentTitle}
                  onValueChange={(val) => setDocumentTitle(val)}
                >
                  <SelectTrigger id="doc-title" className="h-9 text-xs">
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TAX INVOICE">TAX INVOICE</SelectItem>
                    <SelectItem value="PROFORMA INVOICE">PROFORMA INVOICE</SelectItem>
                    <SelectItem value="DELIVERY CHALLAN">DELIVERY CHALLAN</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Displays as &ldquo;{documentTitle.toUpperCase()} - DELIVERY CHALLAN&rdquo;
                </p>
              </div>

              {/* Dispatched From */}
              <div className="space-y-1.5">
                <Label htmlFor="dispatched-from" className="text-xs font-semibold">
                  Dispatched From
                </Label>
                <Input
                  id="dispatched-from"
                  placeholder="e.g. Warehouse / Factory / City"
                  value={dispatchedFrom}
                  onChange={(e) => setDispatchedFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Book To */}
              <div className="space-y-1.5">
                <Label htmlFor="book-to" className="text-xs font-semibold">
                  Book To (Destination)
                </Label>
                <Input
                  id="book-to"
                  placeholder="e.g. Destination City / Depot"
                  value={bookTo}
                  onChange={(e) => setBookTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Transport / Carrier */}
              <div className="space-y-1.5">
                <Label htmlFor="transport" className="text-xs font-semibold">
                  Transport / Carrier Name
                </Label>
                <Input
                  id="transport"
                  placeholder="e.g. VRL Logistics / TCI Express"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Vehicle No */}
              <div className="space-y-1.5">
                <Label htmlFor="vehicle-no" className="text-xs font-semibold">
                  Vehicle No.
                </Label>
                <Input
                  id="vehicle-no"
                  placeholder="e.g. UP 32 AB 1234"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* GR / LR No */}
              <div className="space-y-1.5">
                <Label htmlFor="gr-no" className="text-xs font-semibold">
                  GR / LR No.
                </Label>
                <Input
                  id="gr-no"
                  placeholder="e.g. GR-987456"
                  value={grNo}
                  onChange={(e) => setGrNo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Dispute Note */}
              <div className="space-y-1.5">
                <Label htmlFor="dispute-note" className="text-xs font-semibold">
                  Jurisdiction / Dispute Note
                </Label>
                <Input
                  id="dispute-note"
                  placeholder="e.g. ALL DISPUTES SUBJECT TO LOCAL JURISDICTION"
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveDispatchDetails}
                  disabled={saving}
                  className="w-full gap-1.5 text-xs h-9"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  <span>{saving ? "Saving..." : "Save Dispatch Details"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Strict Isolation Notice Card */}
          <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-3 flex items-start gap-2.5">
              <ShieldCheck className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-snug">
                <p className="font-semibold">Pure Dispatch Mode Active</p>
                <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                  This document only displays customer, logistics, and product quantities. Rates, tax calculations, and total prices are completely excluded.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Container (Right/Bottom) */}
        <div className="lg:col-span-8 flex flex-col items-center print:w-full print:block print:p-0 print:m-0">
          <PinchZoomContainer>
            <div className="w-[750px] print:w-full bg-white text-black shadow-md border print:border-none print:shadow-none rounded-none overflow-hidden p-0">
              <PrintableDispatchSlip
                doc={{
                  ...doc,
                  document_title: documentTitle,
                  dispatched_from: dispatchedFrom,
                  book_to: bookTo,
                  transport,
                  vehicle_no: vehicleNo,
                  gr_no: grNo,
                  dispute_note: disputeNote,
                }}
                siteName={settings?.site_name}
                settings={settings}
                documentTitle={documentTitle}
              />
            </div>
          </PinchZoomContainer>
        </div>
      </div>
    </div>
  );
}
