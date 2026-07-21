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
import { Textarea } from "@/components/ui/textarea";
import type { FixedAsset } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.number().int().min(1),
  unit_value: z.number().min(0),
  notes: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

const empty: FormValues = { name: "", quantity: 1, unit_value: 0, notes: "" };

export function FixedAssetDialog({
  open,
  onOpenChange,
  asset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: FixedAsset | null;
  onSaved: () => void;
}) {
  const isEdit = !!asset;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: empty });

  React.useEffect(() => {
    if (!open) return;
    if (asset) {
      reset({
        name: asset.name,
        quantity: asset.quantity,
        unit_value: Number(asset.unit_value),
        notes: asset.notes ?? "",
      });
    } else {
      reset(empty);
    }
  }, [open, asset, reset]);

  const total = (watch("quantity") || 0) * (watch("unit_value") || 0);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(isEdit ? `/api/fixed-assets/${asset!.id}` : "/api/fixed-assets", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(isEdit ? "Asset updated." : "Asset added.");
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
          <DialogTitle>{isEdit ? "Edit Fixed Asset" : "Add Fixed Asset"}</DialogTitle>
          <DialogDescription>
            Machinery and other equipment your business owns — e.g. scrubber machines.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Scrubber Machine - Auto" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" type="number" min={1} {...register("quantity", { valueAsNumber: true })} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit_value">Value per unit *</Label>
              <Input
                id="unit_value"
                type="number"
                step="0.01"
                min={0}
                {...register("unit_value", { valueAsNumber: true })}
              />
              {errors.unit_value && <p className="text-xs text-destructive">{errors.unit_value.message}</p>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Total value: <span className="font-medium text-foreground">₹{total.toLocaleString("en-IN")}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
