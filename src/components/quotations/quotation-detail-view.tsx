"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Printer,
  MessageSquare,
  Copy,
  Check,
  Pencil,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import { shareDocumentOnWhatsApp } from "@/lib/pdf-share";
import type { Quotation, QuotationStatus } from "@/lib/types";

const statusVariant: Record<QuotationStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  accepted: "success",
  rejected: "destructive",
};

export function QuotationDetailView({ quotationId }: { quotationId: number | string }) {
  const router = useRouter();
  const [quotation, setQuotation] = React.useState<Quotation | null>(null);
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [statusUpdating, setStatusUpdating] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const fetchQuotation = React.useCallback(async () => {
    try {
      setLoading(true);
      const [qRes, sRes] = await Promise.all([
        fetch(`/api/quotations/${quotationId}`),
        fetch("/api/settings"),
      ]);

      if (!qRes.ok) {
        throw new Error("Quotation not found");
      }

      const qData = await qRes.json();
      const sData = sRes.ok ? await sRes.json() : null;

      setQuotation(qData);
      if (sData) setSettings(sData);
    } catch (err: any) {
      setError(err?.message || "Failed to load quotation.");
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  React.useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  async function updateStatus(newStatus: QuotationStatus) {
    if (!quotation || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotation_status: newStatus }),
      });
      if (res.ok) {
        setQuotation((prev) => (prev ? { ...prev, quotation_status: newStatus } : null));
        toast.success(`Quotation marked as ${newStatus}`);
      } else {
        toast.error("Failed to update quotation status.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setStatusUpdating(false);
    }
  }

  function handlePrint() {
    const printElement = document.getElementById("bill-print-root");
    const docNumber = quotation?.quotation_number || `QT-${quotation?.id}`;
    const pdfFileName = quotation
      ? `${quotation.customer_name ? quotation.customer_name.trim() + " - " : ""}${docNumber}`
      : "Quotation";

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

  async function handleDownloadPDF() {
    if (!quotation || downloading) return;
    setDownloading(true);
    try {
      const el = document.getElementById("bill-print-root");
      if (!el) {
        handlePrint();
        return;
      }
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
        removeContainer: true,
      });

      const docNumber = quotation.quotation_number || `QT-${quotation.id}`;
      const customerName = quotation.customer_name || "";
      const fileName = `${customerName ? customerName + " - " : ""}${docNumber}.pdf`;

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
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
      toast.success("PDF downloaded successfully.");
    } catch (err) {
      console.warn("Direct PDF generation failed, falling back to print dialog:", err);
      handlePrint();
    } finally {
      setDownloading(false);
    }
  }

  function handleWhatsAppShare() {
    if (!quotation) return;
    const docNumber = quotation.quotation_number || `QT-${quotation.id}`;
    shareDocumentOnWhatsApp({
      elementId: "bill-print-root",
      docId: quotation.id,
      docType: "Quotation",
      docNumber,
      customerName: quotation.customer_name,
      customerPhone: quotation.customer_phone,
      totalAmount: Number(quotation.total_amount || quotation.quotation_amount || 0),
      siteName: settings?.site_name,
      date: quotation.quotation_date,
    });
  }

  function handleCopyPublicLink() {
    if (!quotation) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/view/quotation/${quotation.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Customer invoice link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <div className="p-6 sm:p-10 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading quotation details...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="p-6 sm:p-10 max-w-xl mx-auto text-center space-y-4">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold">Quotation Not Found</h2>
        <p className="text-sm text-muted-foreground">{error || "This quotation does not exist or was deleted."}</p>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/quotations">
            <ArrowLeft className="size-4" /> Back to Quotations
          </Link>
        </Button>
      </div>
    );
  }

  const docNumber = quotation.quotation_number || `QT-${quotation.id}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-1.5 h-9">
            <Link href="/quotations">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back to Quotations</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">{docNumber}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={statusUpdating}
                  className="inline-flex items-center cursor-pointer transition-opacity hover:opacity-80"
                >
                  <Badge variant={statusVariant[quotation.quotation_status]} className="capitalize gap-1 text-xs">
                    {statusUpdating ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : quotation.quotation_status === "accepted" ? (
                      <CheckCircle2 className="size-3" />
                    ) : quotation.quotation_status === "rejected" ? (
                      <XCircle className="size-3" />
                    ) : (
                      <Clock className="size-3" />
                    )}
                    {quotation.quotation_status}
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => updateStatus("accepted")} className="gap-2 text-xs">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Mark Accepted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus("pending")} className="gap-2 text-xs">
                  <Clock className="size-3.5 text-amber-600" /> Mark Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus("rejected")} className="gap-2 text-xs">
                  <XCircle className="size-3.5 text-rose-600" /> Mark Rejected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPublicLink}
            className="gap-1.5 text-xs h-9"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            <span className="hidden sm:inline">Copy Link</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-9"
          >
            <Printer className="size-3.5" />
            <span>Print</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={downloading}
            onClick={handleDownloadPDF}
            className="gap-1.5 text-xs h-9"
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="gap-1.5 text-xs h-9 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <MessageSquare className="size-3.5" />
            <span>WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/quotations/${quotation.id}/edit`)}
            className="gap-1.5 text-xs h-9 text-primary border-primary/30 hover:bg-primary/10"
          >
            <Pencil className="size-3.5" />
            <span>Edit</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/bills/new?quotation_id=${quotation.id}`)}
            className="gap-1.5 text-xs h-9 bg-primary shadow-sm"
          >
            <Receipt className="size-3.5" />
            <span>Convert to Bill</span>
          </Button>
        </div>
      </div>

      {/* Invoice Document Wrapper */}
      <div className="flex justify-center">
        <Card className="w-full max-w-[880px] bg-white text-black shadow-md border rounded-xl overflow-hidden p-0">
          <PrintableInvoice
            bill={quotation}
            siteName={settings?.site_name}
            settings={settings}
            documentType="PROFORMA INVOICE"
          />
        </Card>
      </div>
    </div>
  );
}
