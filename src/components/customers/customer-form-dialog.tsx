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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  product: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  status: z.enum(["lead", "progress", "active", "inactive"]),
  visited: z.boolean(),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = {
  name: "",
  product: "",
  email: "",
  phone: "",
  status: "lead",
  visited: false,
  address: "",
  notes: "",
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved: () => void;
}) {
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues,
  });

  React.useEffect(() => {
    if (open) {
      reset(
        customer
          ? {
              name: customer.name,
              product: customer.product ?? "",
              email: customer.email ?? "",
              phone: customer.phone ?? "",
              status: customer.status,
              visited: !!customer.visited,
              address: customer.address ?? "",
              notes: customer.notes ?? "",
            }
          : emptyValues
      );
    }
  }, [open, customer, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(
        isEdit ? `/api/customers/${customer!.id}` : "/api/customers",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Save failed");

      toast.success(isEdit ? "Customer updated." : "New customer added.");
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
          <DialogTitle>{isEdit ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            Fill in the customer&apos;s details. Name is required, everything else is optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Ayesha Khan" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="product">Product / Interest</Label>
              <Input id="product" {...register("product")} placeholder="e.g. Scrubber Packing Machine" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="name@company.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+91 90000 00000" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as FormValues["status"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border px-3">
              <Label htmlFor="visited" className="cursor-pointer">Site visited?</Label>
              <Switch id="visited" checked={watch("visited")} onCheckedChange={(v) => setValue("visited", v)} />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} placeholder="City, State" />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} placeholder="Koi additional note..." />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
