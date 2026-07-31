"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import type { LedgerAccount, Product } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string(),
  price: z.number().min(0),
  min_stock_level: z.number().int().min(0),
  quantity: z.number().int().min(0).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [creditors, setCreditors] = React.useState<LedgerAccount[]>([]);
  const [supplierId, setSupplierId] = React.useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", unit: "Pcs", price: 0, min_stock_level: 5, quantity: 0 },
  });

  const watchPrice = watch("price") || 0;
  const watchQty = watch("quantity") || 0;
  const supplierCost = watchPrice * watchQty;

  React.useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              name: product.name,
              unit: product.unit ?? "Pcs",
              price: Number(product.price),
              min_stock_level: product.min_stock_level ?? 5,
              quantity: 0,
            }
          : { name: "", unit: "Pcs", price: 0, min_stock_level: 5, quantity: 0 }
      );
      setSupplierId(product?.supplier_id ? String(product.supplier_id) : "");

      fetch("/api/ledger-accounts")
        .then((r) => r.json())
        .then((data: unknown) => {
          if (Array.isArray(data)) {
            setCreditors((data as LedgerAccount[]).filter((a) => a.type === "creditor"));
          }
        })
        .catch(() => {});
    }
  }, [open, product, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        supplier_id: supplierId ? Number(supplierId) : null,
      };
      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(isEdit ? "Product updated." : "New product added.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>Fill in the product details, measurement unit, supplier, and stock thresholds.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Product name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Scrubber Packing Machine" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Unit (UOM)</Label>
              <Input id="unit" {...register("unit")} placeholder="e.g. Pcs, Kg, Gm, Box, Ltr" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Unit Price (₹)</Label>
              <Input id="price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min_stock_level">Low Stock Alert Level</Label>
              <Input
                id="min_stock_level"
                type="number"
                min={0}
                {...register("min_stock_level", { valueAsNumber: true })}
                placeholder="5"
              />
              <span className="text-[11px] text-muted-foreground">Alert when stock ≤ this</span>
            </div>
            {!isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input id="quantity" type="number" min={0} {...register("quantity", { valueAsNumber: true })} placeholder="0" />
              </div>
            )}
          </div>

          {/* Supplier / Creditor Selection */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier">Supplier / Creditor (Balance Sheet)</Label>
            <select
              id="supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
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
            {!isEdit && supplierId && watchQty > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ₹{supplierCost.toLocaleString("en-IN")} will be logged to this Supplier in Balance Sheet Creditors.
              </p>
            )}
            {creditors.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                No creditor accounts found. Add suppliers in Balance Sheet to link purchases.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
