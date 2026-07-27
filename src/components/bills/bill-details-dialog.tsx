"use client";

import * as React from "react";
import { Printer, Download, X } from "lucide-react";
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
  if (!bill) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
          <DialogTitle className="text-lg font-semibold">Bill Details - {bill.bill_number}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="size-4" /> Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4 flex justify-center">
          <PrintableInvoice bill={bill} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
