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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Appointment, Customer } from "@/lib/types";

const formSchema = z.object({
  title: z.string().optional().or(z.literal("")),
  customer_id: z.string().min(1, "Select a customer"),
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().optional().or(z.literal("")),
  status: z.enum(["pending", "completed", "cancelled"]),
  remarks: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

function emptyValues(defaultCustomerId?: string): FormValues {
  return {
    title: "",
    customer_id: defaultCustomerId ?? "",
    appointment_date: new Date().toISOString().slice(0, 10),
    appointment_time: "",
    status: "pending",
    remarks: "",
  };
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  customers,
  defaultCustomerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  customers: Customer[];
  defaultCustomerId?: string;
  onSaved: () => void;
}) {
  const isEdit = !!appointment;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(defaultCustomerId),
  });

  React.useEffect(() => {
    if (open) {
      reset(
        appointment
          ? {
              title: appointment.title ?? "",
              customer_id: String(appointment.customer_id),
              appointment_date: appointment.appointment_date,
              appointment_time: appointment.appointment_time ?? "",
              status: appointment.status,
              remarks: appointment.remarks ?? "",
            }
          : emptyValues(defaultCustomerId)
      );
    }
  }, [open, appointment, defaultCustomerId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(
        isEdit ? `/api/appointments/${appointment!.id}` : "/api/appointments",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, customer_id: Number(values.customer_id) }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      toast.success(isEdit ? "Appointment updated." : "New appointment added.");
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
          <DialogTitle>{isEdit ? "Edit Appointment" : "Add New Appointment"}</DialogTitle>
          <DialogDescription>Select a customer and fill in the appointment details.</DialogDescription>
        </DialogHeader>

        {customers.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
            Add a customer from the Customers page first, then create the appointment.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Customer *</Label>
                <Select
                  value={watch("customer_id")}
                  onValueChange={(v) => {
                    setValue("customer_id", v);
                    const selectedCust = customers.find((c) => String(c.id) === v);
                    if (selectedCust?.product && (!watch("title") || !isEdit)) {
                      setValue("title", selectedCust.product);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.product ? `(${c.product})` : ""} {c.phone ? `· ${c.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && (
                  <p className="text-xs text-destructive">{errors.customer_id.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="title">Title / Product</Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="Auto-fetched from Customer Product (or enter custom title)"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appointment_date">Date *</Label>
                <Input id="appointment_date" type="date" {...register("appointment_date")} />
                {errors.appointment_date && (
                  <p className="text-xs text-destructive">{errors.appointment_date.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appointment_time">Time</Label>
                <Input id="appointment_time" type="time" {...register("appointment_time")} />
              </div>

              {isEdit && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Status</Label>
                  <Select
                    value={watch("status")}
                    onValueChange={(v) => setValue("status", v as FormValues["status"])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" {...register("remarks")} placeholder="Koi remarks..." />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save changes" : "Add appointment"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
