"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PrintableInvoice } from "@/components/bills/printable-invoice";
import type { Bill } from "@/lib/types";

export function BillDetailsDialog({
  open,
  onOpenChange,
  bill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
}) {
  const [siteName, setSiteName] = React.useState<string>("");

  // Fetch CRM name from settings — isolated per tenant
  React.useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.site_name) setSiteName(data.site_name);
      })
      .catch(() => {});
  }, [open]);

  if (!bill) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wide enough to show invoice without horizontal scroll; no overflow-x */}
      <DialogContent className="max-w-full w-full p-0 gap-0 overflow-visible">
        {/* Header — hidden on print via .no-print */}
        <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4 space-y-0">
          <DialogTitle className="text-lg font-semibold">
            Bill Details - {bill.bill_number}
          </DialogTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="size-4 no-print" /> Print / Save PDF
          </Button>
        </DialogHeader>

        {/* Invoice content — no hidden overflow */}
        <div className="p-6">
          <PrintableInvoice bill={bill} siteName={siteName} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
