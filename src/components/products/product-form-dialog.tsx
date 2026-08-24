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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LedgerAccount, Product, ProductCategory } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string(),
  price: z.number().min(0),
  cost_price: z.number().min(0).optional(),
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
  const [categories, setCategories] = React.useState<ProductCategory[]>([]);
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [customCategory, setCustomCategory] = React.useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", unit: "Pcs", price: 0, cost_price: 0, min_stock_level: 5, quantity: 0 },
  });

  const watchPrice = watch("price") || 0;
  const watchCostPrice = watch("cost_price") || 0;
  const watchQty = watch("quantity") || 0;
  const unitCostForSupplier = watchCostPrice > 0 ? watchCostPrice : watchPrice;
  const supplierCost = unitCostForSupplier * watchQty;
  const profitPerUnit = watchPrice - watchCostPrice;
  const profitMarginPercent = watchPrice > 0 && watchCostPrice > 0 ? Math.round((profitPerUnit / watchPrice) * 100) : 0;

  React.useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              name: product.name,
              unit: product.unit ?? "Pcs",
              price: Number(product.price),
              cost_price: Number(product.cost_price || 0),
              min_stock_level: product.min_stock_level ?? 5,
              quantity: 0,
            }
          : { name: "", unit: "Pcs", price: 0, cost_price: 0, min_stock_level: 5, quantity: 0 }
      );
      setSupplierId(product?.supplier_id ? String(product.supplier_id) : "");
      setCategoryId(product?.category_id ? String(product.category_id) : "");
      setCustomCategory(product?.category ?? "");

      fetch("/api/ledger-accounts")
        .then((r) => r.json())
        .then((data: unknown) => {
          if (Array.isArray(data)) {
            setCreditors((data as LedgerAccount[]).filter((a) => a.type === "creditor"));
          }
        })
        .catch(() => {});

      fetch("/api/product-categories")
        .then((r) => r.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            setCategories(json.data);
          }
        })
        .catch(() => {});
    }
  }, [open, product, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        cost_price: Number(values.cost_price) || 0,
        supplier_id: supplierId ? Number(supplierId) : null,
        category_id: categoryId ? Number(categoryId) : null,
        category: customCategory || null,
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
          <DialogDescription>Fill in product pricing, cost price, measurement unit, and stock thresholds.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Product name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Scrubber Packing Machine" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Unit (UOM)</Label>
              <Input id="unit" {...register("unit")} placeholder="e.g. Pcs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cost_price">Cost Price (₹)</Label>
              <Input id="cost_price" type="number" step="0.01" min={0} {...register("cost_price", { valueAsNumber: true })} placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Selling Price (₹) *</Label>
              <Input id="price" type="number" step="0.01" min={0} {...register("price", { valueAsNumber: true })} placeholder="0.00" />
            </div>
          </div>

          {watchPrice > 0 && watchCostPrice > 0 && (
            <div className="rounded-md border p-2.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
              <span>Estimated Profit / Unit: <strong className="font-mono">₹{profitPerUnit.toLocaleString("en-IN")}</strong></span>
              <span className="font-semibold">Margin: {profitMarginPercent}%</span>
            </div>
          )}

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

            {!isEdit ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input id="quantity" type="number" min={0} {...register("quantity", { valueAsNumber: true })} placeholder="0" />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Product Category</Label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(val) => {
                    const nextVal = val === "none" ? "" : val;
                    setCategoryId(nextVal);
                    const selectedCat = categories.find((c) => String(c.id) === nextVal);
                    if (selectedCat) setCustomCategory(selectedCat.name);
                    else setCustomCategory("");
                  }}
                >
                  <SelectTrigger className="h-9 w-full text-xs font-medium bg-background text-foreground shadow-xs">
                    <SelectValue placeholder="Uncategorized / None" />
                  </SelectTrigger>
                  <SelectContent align="start" className="text-xs">
                    <SelectItem value="none">Uncategorized / None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Product Category Selection (for Add New Product: placed above Supplier) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Product Category</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(val) => {
                  const nextVal = val === "none" ? "" : val;
                  setCategoryId(nextVal);
                  const selectedCat = categories.find((c) => String(c.id) === nextVal);
                  if (selectedCat) setCustomCategory(selectedCat.name);
                  else setCustomCategory("");
                }}
              >
                <SelectTrigger className="h-9 w-full text-xs font-medium bg-background text-foreground shadow-xs">
                  <SelectValue placeholder="Uncategorized / None" />
                </SelectTrigger>
                <SelectContent align="start" className="text-xs">
                  <SelectItem value="none">Uncategorized / None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Supplier / Creditor Selection */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier">Supplier / Creditor (Balance Sheet)</Label>
            <Select
              value={supplierId || "none"}
              onValueChange={(val) => setSupplierId(val === "none" ? "" : val)}
            >
              <SelectTrigger className="h-9 w-full text-xs font-medium bg-background text-foreground shadow-xs">
                <SelectValue placeholder="None / Direct Purchase" />
              </SelectTrigger>
              <SelectContent align="start" className="text-xs">
                <SelectItem value="none">None / Direct Purchase</SelectItem>
                {creditors.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isEdit && supplierId && watchQty > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ₹{supplierCost.toLocaleString("en-IN")} will be logged to this Supplier in Balance Sheet Creditors.
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
