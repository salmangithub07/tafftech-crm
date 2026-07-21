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
import type { Appointment } from "@/lib/types";

const formSchema = z.object({
  quotation_amount: z.number().min(0, "Amount must be 0 or more"),
  notes: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

export function QuotationDialog({
  open,
  onOpenChange,
  appointment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { quotation_amount: 0, notes: "" },
  });

  React.useEffect(() => {
    if (open) reset({ quotation_amount: 0, notes: "" });
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    if (!appointment) return;
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointment.id,
          customer_id: appointment.customer_id,
          ...values,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      toast.success("Quotation sent — appointment marked as completed.");
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
          <DialogTitle>Send Quotation</DialogTitle>
          <DialogDescription>
            {appointment?.customer_name ? `Customer: ${appointment.customer_name}` : ""} — as soon as you
            save this quotation, the appointment will be marked as completed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quotation_amount">Quotation amount *</Label>
            <Input
              id="quotation_amount"
              type="number"
              step="0.01"
              {...register("quotation_amount", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.quotation_amount && (
              <p className="text-xs text-destructive">{errors.quotation_amount.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Quotation details..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save quotation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
