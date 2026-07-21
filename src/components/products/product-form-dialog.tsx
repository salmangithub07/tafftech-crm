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
import type { Product } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional().or(z.literal("")),
  price: z.number().min(0),
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", sku: "", price: 0, quantity: 0 },
  });

  React.useEffect(() => {
    if (open) {
      reset(
        product
          ? { name: product.name, sku: product.sku ?? "", price: Number(product.price), quantity: 0 }
          : { name: "", sku: "", price: 0, quantity: 0 }
      );
    }
  }, [open, product, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
          <DialogDescription>Fill in the product details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Product name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Scrubber Packing Machine" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
            </div>
          </div>
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Initial quantity</Label>
              <Input id="quantity" type="number" min={0} {...register("quantity", { valueAsNumber: true })} placeholder="0" />
            </div>
          )}
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
