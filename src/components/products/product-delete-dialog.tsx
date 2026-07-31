"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LedgerAccount, Product } from "@/lib/types";

export function ProductDeleteDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (reason: string, creditorAccountId?: number | null) => Promise<void>;
}) {
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [creditors, setCreditors] = React.useState<LedgerAccount[]>([]);
  const [selectedCreditorId, setSelectedCreditorId] = React.useState<string>("");

  React.useEffect(() => {
    if (open && product) {
      setReason("");
      setSelectedCreditorId(product.supplier_id ? String(product.supplier_id) : "");

      fetch("/api/ledger-accounts")
        .then((r) => r.json())
        .then((data: unknown) => {
          if (Array.isArray(data)) {
            setCreditors((data as LedgerAccount[]).filter((a) => a.type === "creditor"));
          }
        })
        .catch(() => {});
    }
  }, [open, product]);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onConfirm(
        reason.trim(),
        selectedCreditorId ? Number(selectedCreditorId) : null
      );
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const currentStock = Math.max(product?.stock ?? 0, 0);
  const price = Number(product?.price ?? 0);
  const stockValue = currentStock * price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5" />
            Delete {product?.name}?
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete the product from the catalog.{" "}
            {currentStock > 0 && (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Current stock of {currentStock} {product?.unit || "Pcs"} (₹{stockValue.toLocaleString("en-IN")}) will be removed.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {/* Reason Field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              Reason for deletion <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="e.g. Discontinued product, Damaged goods, Wrong entry, Product merged..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />
            {reason.trim().length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                A deletion reason is required for inventory audit.
              </p>
            )}
          </div>

          {/* Balance Sheet Creditor Adjustment Option */}
          {currentStock > 0 && price > 0 && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <Label htmlFor="creditor-adjust" className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Supplier / Creditor (Balance Sheet Adjustment)
              </Label>
              <select
                id="creditor-adjust"
                value={selectedCreditorId}
                onChange={(e) => setSelectedCreditorId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None / Do not adjust Supplier liability</option>
                {creditors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {selectedCreditorId ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  <strong>₹{stockValue.toLocaleString("en-IN")}</strong> will be deducted from this Supplier's balance in Balance Sheet Creditors.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Select a supplier if this product's deleted stock value should reduce your Creditors balance.
                </p>
              )}
            </div>
          )}

          {reason.trim().length > 0 && (
            <p className="text-[11px] text-muted-foreground italic">
              * A deletion record will be kept in the Stock Report for historical tracking.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || reason.trim().length === 0}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Delete Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
