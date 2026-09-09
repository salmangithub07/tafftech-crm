"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowRightLeft, Landmark, Wallet } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LedgerAccount } from "@/lib/types";

const contraSchema = z.object({
  from_account_id: z.string().min(1, "Select source account"),
  to_account_id: z.string().min(1, "Select destination account"),
  entry_date: z.string().min(1, "Date is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  voucher_no: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
}).refine((data) => data.from_account_id !== data.to_account_id, {
  message: "Source and destination accounts must be different",
  path: ["to_account_id"],
});

type FormValues = z.infer<typeof contraSchema>;

export function ContraVoucherDialog({
  open,
  onOpenChange,
  cashAccounts,
  bankAccounts,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashAccounts: LedgerAccount[];
  bankAccounts: LedgerAccount[];
  onSaved: () => void;
}) {
  const eligibleAccounts = [...cashAccounts, ...bankAccounts];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(contraSchema),
    defaultValues: {
      from_account_id: "",
      to_account_id: "",
      entry_date: new Date().toISOString().slice(0, 10),
      amount: 0,
      voucher_no: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        from_account_id: bankAccounts[0] ? String(bankAccounts[0].id) : "",
        to_account_id: cashAccounts[0] ? String(cashAccounts[0].id) : "",
        entry_date: new Date().toISOString().slice(0, 10),
        amount: 0,
        voucher_no: `CNTR-${Date.now().toString().slice(-4)}`,
        description: "",
      });
    }
  }, [open, cashAccounts, bankAccounts, reset]);

  const fromId = watch("from_account_id");
  const toId = watch("to_account_id");
  const fromAcc = eligibleAccounts.find((a) => String(a.id) === fromId);
  const toAcc = eligibleAccounts.find((a) => String(a.id) === toId);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/ledger-transactions/contra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to process contra fund transfer");
      }
      toast.success("Contra Fund Transfer posted successfully! (Double-entry updated)");
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to post transfer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="size-5 text-primary" /> Contra Voucher / Fund Transfer
          </DialogTitle>
          <DialogDescription className="text-xs">
            Transfer money between Cash &amp; Bank accounts. Creates standard double-entry records in both ledgers simultaneously.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Transfer Visual Direction */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                From Account (Credit / Outflow)
              </Label>
              <Select
                value={watch("from_account_id")}
                onValueChange={(val) => setValue("from_account_id", val, { shouldValidate: true })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.type === "bank" ? "🏦 " : "💵 "} {a.name} (₹{Number(a.balance ?? 0).toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.from_account_id && (
                <p className="text-[10px] text-destructive">{errors.from_account_id.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                To Account (Debit / Inflow)
              </Label>
              <Select
                value={watch("to_account_id")}
                onValueChange={(val) => setValue("to_account_id", val, { shouldValidate: true })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Destination" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.type === "bank" ? "🏦 " : "💵 "} {a.name} (₹{Number(a.balance ?? 0).toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.to_account_id && (
                <p className="text-[10px] text-destructive">{errors.to_account_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs">Transfer Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                className="h-9 text-xs font-semibold"
                placeholder="0"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Entry Date *</Label>
              <DatePicker
                value={watch("entry_date")}
                onChange={(dateStr) => setValue("entry_date", dateStr, { shouldValidate: true })}
              />
              {errors.entry_date && <p className="text-[10px] text-destructive">{errors.entry_date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="voucher_no" className="text-xs">Voucher Ref No. (Optional)</Label>
            <Input
              id="voucher_no"
              className="h-9 text-xs"
              placeholder="e.g. CNTR-101 / Cheque No."
              {...register("voucher_no")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Narration / Remarks (Optional)</Label>
            <Textarea
              id="description"
              rows={2}
              className="text-xs"
              placeholder="e.g. Cash withdrawn for office petty expenses / ATM cash deposit"
              {...register("description")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              Post Contra Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
