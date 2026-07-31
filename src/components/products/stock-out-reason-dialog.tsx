"use client";

import * as React from "react";
import { AlertTriangle, Loader2, ShieldAlert, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/types";

export function StockOutReasonDialog({
  open,
  product,
  quantity = 1,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  quantity?: number;
  onSaved: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [reverting, setReverting] = React.useState(false);
  const [error, setError] = React.useState("");
  const revertedRef = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setError("");
      revertedRef.current = false;
    }
  }, [open]);

  if (!open || !product) return null;

  const unitStr = product.unit || "Pcs";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please enter a reason OR click 'Cancel & Revert Stock'.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/stock/update-reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product!.id,
          quantity,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update audit reason");

      toast.success("Stock reduction audit reason recorded.");
      revertedRef.current = true;
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Could not save reason.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevertStock() {
    if (revertedRef.current) return;
    revertedRef.current = true;
    setReverting(true);
    try {
      const res = await fetch("/api/stock/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product!.id,
          quantity,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revert stock");

      toast.info(`Stock reduction cancelled. ${quantity} ${unitStr} of ${product!.name} restored to stock.`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Could not revert stock.");
      revertedRef.current = false;
    } finally {
      setReverting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && !revertedRef.current) {
        handleRevertStock();
      }
    }}>
      <DialogContent className="max-w-md border-amber-500/40 shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-lg font-bold">
            <ShieldAlert className="size-5" /> Stock Audit / Revert Option
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            You reduced <strong className="text-foreground font-mono">{quantity} {unitStr}</strong> of{" "}
            <strong className="text-foreground">{product.name}</strong>, but closed bill generation without issuing an invoice.
            Enter an audit reason OR cancel to restore stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit_reason" className="text-xs font-semibold text-foreground">
              Reason for Stock Reduction (No Bill Issued)
            </Label>
            <Textarea
              id="audit_reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setError("");
              }}
              placeholder="e.g. Given as demo sample / Item damaged in office..."
              className="text-xs font-medium"
            />
            {error && <p className="text-xs font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="size-3.5" /> {error}</p>}
          </div>

          <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting || reverting}
              onClick={handleRevertStock}
              className="gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
            >
              {reverting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Cancel &amp; Revert Stock (+{quantity})
            </Button>

            <Button
              type="submit"
              disabled={submitting || reverting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Confirm Reason
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
