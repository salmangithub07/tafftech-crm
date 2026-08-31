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
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import { PinchZoomContainer } from "@/components/ui/pinch-zoom-container";
import { RecordPaymentDialog } from "@/components/bills/record-payment-dialog";
import { shareDocumentOnWhatsApp } from "@/lib/pdf-share";
import type { Bill } from "@/lib/types";

const paymentStatusVariant: Record<string, "success" | "destructive" | "warning"> = {
  paid: "success",
  unpaid: "destructive",
  partial: "warning",
};

export function BillDetailView({ billId }: { billId: number | string }) {
  const router = useRouter();
  const [bill, setBill] = React.useState<Bill | null>(null);
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Dialog state
  const [paymentOpen, setPaymentOpen] = React.useState(false);

  const fetchBill = React.useCallback(async () => {
    try {
      setLoading(true);
      const [bRes, sRes] = await Promise.all([
        fetch(`/api/bills/${billId}`),
        fetch("/api/settings"),
      ]);

      if (!bRes.ok) {
        throw new Error("Bill not found");
      }

      const bData = await bRes.json();
      const sData = sRes.ok ? await sRes.json() : null;

      setBill(bData);
      if (sData) setSettings(sData);
    } catch (err: any) {
      setError(err?.message || "Failed to load bill.");
    } finally {
      setLoading(false);
    }
  }, [billId]);

  React.useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  function handlePrint() {
    const printElement = document.getElementById("bill-print-root");
    const pdfFileName = bill
      ? `${bill.customer_name ? bill.customer_name.trim() + " - " : ""}${bill.bill_number}`
      : "Invoice";

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
    if (!bill || downloading) return;
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

      const customerName = bill.customer_name || "";
      const fileName = `${customerName ? customerName + " - " : ""}${bill.bill_number}.pdf`;

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
    if (!bill) return;
    shareDocumentOnWhatsApp({
      elementId: "bill-print-root",
      docId: bill.id,
      docType: "Bill",
      docNumber: bill.bill_number,
      customerName: bill.customer_name,
      customerPhone: bill.customer_phone,
      totalAmount: Number(bill.total_amount || 0),
      siteName: settings?.site_name,
      date: bill.bill_date,
    });
  }

  function handleCopyPublicLink() {
    if (!bill) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/view/bill/${bill.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Customer invoice link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <div className="p-6 sm:p-10 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="p-6 sm:p-10 max-w-xl mx-auto text-center space-y-4">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold">Bill Not Found</h2>
        <p className="text-sm text-muted-foreground">{error || "This bill does not exist or was deleted."}</p>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/bills">
            <ArrowLeft className="size-4" /> Back to Bills
          </Link>
        </Button>
      </div>
    );
  }

  const isPaid = bill.payment_status === "paid";
  const remainingDue = Math.max(0, Number(bill.total_amount || 0) - Number(bill.paid_amount || 0));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-1.5 h-9">
            <Link href="/bills">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back to Bills</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">{bill.bill_number}</h1>
            <Badge
              variant={paymentStatusVariant[bill.payment_status] || "secondary"}
              className="capitalize gap-1 text-xs"
            >
              {bill.payment_status === "paid" ? (
                <CheckCircle2 className="size-3" />
              ) : bill.payment_status === "partial" ? (
                <Clock className="size-3" />
              ) : (
                <AlertCircle className="size-3" />
              )}
              {bill.payment_status}
            </Badge>
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

          {!isPaid && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setPaymentOpen(true)}
              className="gap-1.5 text-xs h-9 bg-primary shadow-sm"
            >
              <CreditCard className="size-3.5" />
              <span>Record Payment</span>
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Document Wrapper */}
      <div className="w-full pb-4">
        <PinchZoomContainer>
          <Card className="w-[750px] bg-white text-black shadow-md border rounded-xl overflow-hidden p-0">
            <PrintableInvoice
              bill={bill}
              siteName={settings?.site_name}
              settings={settings}
              template={settings?.invoice_template || "modern"}
              customTerms={settings?.invoice_terms}
              bankDetails={settings?.bank_details}
              documentType="TAX INVOICE"
            />
          </Card>
        </PinchZoomContainer>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        bill={bill}
        onSaved={() => {
          fetchBill();
          router.refresh();
        }}
      />
    </div>
  );
}
