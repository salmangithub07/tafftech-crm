"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, DollarSign, CreditCard, Building, Calendar, Wallet } from "lucide-react";
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
import type { Bill, LedgerAccount } from "@/lib/types";

const formSchema = z.object({
  amount: z.number().positive("Enter a valid payment amount"),
  payment_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "bank", "credit", "other"]),
  account_id: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  bill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  onSaved: () => void;
}) {
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = React.useState(false);

  const totalAmount = Number(bill?.total_amount || 0);
  const paidAmount = Number(bill?.paid_amount || 0);
  const remainingDue = Math.max(0, totalAmount - paidAmount);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: remainingDue,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      account_id: "",
      notes: "",
    },
  });

  // Fetch available tenant Cash & Bank ledger accounts for Balance Sheet deposit
  React.useEffect(() => {
    if (open) {
      setLoadingAccounts(true);
      fetch("/api/ledger-accounts")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            // Filter cash & bank accounts
            const depositAccs = data.filter((a: LedgerAccount) => a.type === "cash" || a.type === "bank");
            setLedgerAccounts(depositAccs);
            if (depositAccs.length > 0) {
              setValue("account_id", String(depositAccs[0].id));
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAccounts(false));

      reset({
        amount: remainingDue,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: "cash",
        account_id: "",
        notes: "",
      });
    }
  }, [open, bill, remainingDue, reset, setValue]);

  if (!bill) return null;

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(`/api/bills/${bill!.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: values.amount,
          payment_date: values.payment_date,
          payment_method: values.payment_method,
          account_id: values.account_id ? Number(values.account_id) : null,
          notes: values.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      toast.success(`Payment of ${money(values.amount)} recorded for ${bill!.bill_number}!`);
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Could not record payment.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="size-5" /> Record Payment Collection
          </DialogTitle>
          <DialogDescription>
            Record customer payment for <span className="font-semibold text-foreground">{bill.bill_number}</span> ({bill.customer_name}).
          </DialogDescription>
        </DialogHeader>

        {/* Financial Summary Card */}
        <div className="rounded-xl border bg-card p-3.5 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Bill Amount:</span>
            <span className="font-mono font-semibold text-foreground">{money(totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Already Collected:</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{money(paidAmount)}</span>
          </div>
          <div className="border-t pt-2 flex items-center justify-between font-bold text-sm">
            <span className="text-amber-700 dark:text-amber-300">Remaining Due Balance:</span>
            <span className="font-mono text-base text-amber-600 dark:text-amber-400">{money(remainingDue)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Payment Amount Collected (₹) *</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              max={remainingDue}
              {...register("amount", { valueAsNumber: true })}
              placeholder="e.g. 5000"
              className="font-mono font-bold text-base"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <DatePicker
                value={watch("payment_date")}
                onChange={(val) => setValue("payment_date", val, { shouldValidate: true })}
              />
              {errors.payment_date && (
                <p className="text-xs text-destructive">{errors.payment_date.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Payment Method *</Label>
              <Select
                value={watch("payment_method")}
                onValueChange={(val) => setValue("payment_method", val as FormValues["payment_method"])}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer / UPI</SelectItem>
                  <SelectItem value="credit">Credit / Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Balance Sheet Deposit Account */}
          <div className="flex flex-col gap-1.5">
            <Label className="flex items-center gap-1.5">
              <Wallet className="size-3.5 text-primary" /> Balance Sheet Deposit Account
            </Label>
            <Select
              value={watch("account_id")}
              onValueChange={(val) => setValue("account_id", val)}
              disabled={loadingAccounts}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Cash/Bank Account (Optional)" />
              </SelectTrigger>
              <SelectContent>
                {ledgerAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Money will automatically deposit into this Balance Sheet account and update Debtors.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Remarks / Transaction Ref (Optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              {...register("notes")}
              placeholder="e.g. UPI Ref #987654321 / Cash handed over..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
