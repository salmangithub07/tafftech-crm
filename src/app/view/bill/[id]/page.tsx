"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import type { Bill } from "@/lib/types";

export default function PublicBillPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = React.useState<{ bill: Bill; settings: any } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!id) return;
    fetch(`/api/public/bills/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Bill / Invoice not found");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || "Failed to load bill."))
      .finally(() => setLoading(false));
  }, [id]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !data?.bill) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
        <div className="max-w-md bg-white dark:bg-card p-8 rounded-2xl border border-border shadow-sm space-y-4">
          <span className="text-4xl">🧾</span>
          <h1 className="text-xl font-bold text-foreground">Invoice Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The requested invoice document is either expired, removed, or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const { bill, settings } = data;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-md border-b border-border px-4 py-3 sm:px-8 flex items-center justify-between no-print shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm sm:text-base text-foreground">
            {settings?.site_name || "Invoice Details"}
          </span>
          <span className="text-xs bg-primary/10 text-primary font-mono font-semibold px-2 py-0.5 rounded-full">
            {bill.bill_number}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="default" size="sm" className="gap-1.5 shadow-xs">
            <Download className="size-4" /> Download / Print PDF
          </Button>
        </div>
      </header>

      {/* Invoice Container */}
      <main className="flex-1 flex justify-center p-3 sm:p-8 overflow-x-auto">
        <div className="w-[620px] sm:w-full max-w-[850px] bg-white text-black shadow-xl rounded-md overflow-hidden shrink-0 my-auto">
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
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground no-print border-t border-border bg-white dark:bg-card">
        Powered by <span className="font-bold text-primary">Taff Desk CRM</span>
      </footer>
    </div>
  );
}
