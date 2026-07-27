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
import type { Product } from "@/lib/types";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  type: "in" | "out";
  onSaved: () => void;
  onGenerateBill?: (product: Product, quantity: number) => void;
}) {
  const [askBillPrompt, setAskBillPrompt] = React.useState<{ product: Product; quantity: number } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantity: 1, note: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ quantity: 1, note: "" });
      setAskBillPrompt(null);
    }
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    if (!product) return;
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, type, ...values }),
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
      toast.success("Stock removed.");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {askBillPrompt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <Receipt className="size-5" /> Generate Bill / Invoice?
              </DialogTitle>
              <DialogDescription>
                You reduced {askBillPrompt.quantity} unit(s) of <strong>{askBillPrompt.product.name}</strong>.
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
              <DialogTitle>{type === "in" ? "Add Stock" : "Remove Stock"}</DialogTitle>
              <DialogDescription>{product?.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" type="number" min={1} {...register("quantity", { valueAsNumber: true })} />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">{type === "in" ? "Note" : "Reason"}</Label>
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
