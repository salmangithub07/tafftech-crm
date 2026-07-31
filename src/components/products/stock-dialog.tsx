"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Receipt } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product, LedgerAccount } from "@/lib/types";

const formSchema = z.object({
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  note: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

export function StockDialog({
  open,
  onOpenChange,
  product,
  type,
  onSaved,
  onGenerateBill,
  onCloseWithoutBill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  type: "in" | "out";
  onSaved: () => void;
  onGenerateBill?: (product: Product, quantity: number) => void;
  onCloseWithoutBill?: (product: Product, quantity: number) => void;
}) {
  const [askBillPrompt, setAskBillPrompt] = React.useState<{ product: Product; quantity: number } | null>(null);
  const [creditors, setCreditors] = React.useState<LedgerAccount[]>([]);
  const [selectedCreditorId, setSelectedCreditorId] = React.useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantity: 1, note: "" },
  });

  const watchQty = watch("quantity") || 0;
  const unitStr = product?.unit || "Pcs";
  const unitPrice = Number(product?.price || 0);
  const totalPurchaseValue = watchQty * unitPrice;

  React.useEffect(() => {
    if (open) {
      reset({ quantity: 1, note: "" });
      setAskBillPrompt(null);
      setSelectedCreditorId("");

      if (type === "in") {
        fetch("/api/ledger-accounts")
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const creditorList = data.filter((a: LedgerAccount) => a.type === "creditor");
              setCreditors(creditorList);
            }
          })
          .catch(() => {});
      }
    }
  }, [open, reset, type]);

  async function onSubmit(values: FormValues) {
    if (!product) return;
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          type,
          ...values,
          creditor_account_id: type === "in" && selectedCreditorId ? Number(selectedCreditorId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      if (type === "out" && onGenerateBill) {
        setAskBillPrompt({ product, quantity: values.quantity });
        onSaved();
      } else {
        toast.success(type === "in" ? "Stock added." : "Stock removed.");
        onOpenChange(false);
        onSaved();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleBillChoice(generate: boolean) {
    if (generate && askBillPrompt && onGenerateBill) {
      const p = askBillPrompt.product;
      const q = askBillPrompt.quantity;
      onOpenChange(false);
      onGenerateBill(p, q);
    } else {
      const p = askBillPrompt?.product || product;
      const q = askBillPrompt?.quantity || 1;
      onOpenChange(false);
      if (p && onCloseWithoutBill) {
        onCloseWithoutBill(p, q);
      }
    }
  }

  function handleDialogClose(newOpen: boolean) {
    if (!newOpen && askBillPrompt) {
      handleBillChoice(false);
    } else {
      onOpenChange(newOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent>
        {askBillPrompt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <Receipt className="size-5" /> Generate Bill / Invoice?
              </DialogTitle>
              <DialogDescription>
                You reduced {askBillPrompt.quantity} {unitStr} of <strong>{askBillPrompt.product.name}</strong>.
                Do you want to generate a customer bill / invoice for this transaction?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4 sm:justify-between flex-row">
              <Button type="button" variant="outline" onClick={() => handleBillChoice(false)}>
                No, Skip Bill
              </Button>
              <Button type="button" variant="default" className="gap-1.5" onClick={() => handleBillChoice(true)}>
                <Receipt className="size-4" /> Yes, Generate Bill
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{type === "in" ? "Add Stock (+)" : "Remove Stock (-)"}</DialogTitle>
              <DialogDescription>{product?.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantity">Quantity ({unitStr}) *</Label>
                <div className="flex items-center gap-2">
                  <Input id="quantity" type="number" min={1} {...register("quantity", { valueAsNumber: true })} className="font-mono text-base font-bold" />
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-2 rounded-md border shrink-0">{unitStr}</span>
                </div>
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
              </div>

              {type === "in" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="creditor">Supplier / Creditor (Balance Sheet)</Label>
                  <select
                    id="creditor"
                    value={selectedCreditorId}
                    onChange={(e) => setSelectedCreditorId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="" className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                      None / Direct Purchase
                    </option>
                    {creditors.map((c) => (
                      <option key={c.id} value={c.id} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {selectedCreditorId && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      ₹{totalPurchaseValue.toLocaleString("en-IN")} will be logged to this Supplier in Balance Sheet Creditors.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">{type === "in" ? "Note / Batch Info" : "Reason"}</Label>
                <Textarea id="note" {...register("note")} placeholder="Optional" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant={type === "out" ? "destructive" : "default"} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {type === "in" ? "Add stock" : "Remove stock"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
