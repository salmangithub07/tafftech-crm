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

const formSchema = z.object({
  account_id: z.string().min(1, "Select an account"),
  entry_date: z.string().min(1, "Date is required"),
  direction: z.enum(["increase", "decrease"]),
  amount: z.number().positive("Amount must be greater than 0"),
  voucher_type: z.enum(["receipt", "payment", "journal"]).optional(),
  voucher_no: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

const INCREASE_LABEL: Record<string, string> = {
  cash: "Received / Deposit (Debit)",
  bank: "Received / Deposit (Debit)",
  creditor: "Bill Payable Added (Credit)",
  debtor: "Sale / Due Added (Debit)",
};
const DECREASE_LABEL: Record<string, string> = {
  cash: "Paid out / Expense (Credit)",
  bank: "Paid out / Payment (Credit)",
  creditor: "Payment to Vendor (Debit)",
  debtor: "Received from Debtor (Credit)",
};

export function LedgerTransactionDialog({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: LedgerAccount[];
  defaultAccountId?: number | null;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_id: "",
      entry_date: new Date().toISOString().slice(0, 10),
      direction: "increase",
      amount: 0,
      voucher_type: "receipt",
      voucher_no: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        account_id: defaultAccountId ? String(defaultAccountId) : "",
        entry_date: new Date().toISOString().slice(0, 10),
        direction: "increase",
        amount: 0,
        voucher_type: "receipt",
        voucher_no: "",
        description: "",
      });
    }
  }, [open, defaultAccountId, reset]);

  const selectedAccount = accounts.find((a) => a.id === Number(watch("account_id")));

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/ledger-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Transaction recorded — ledger balance updated.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Voucher / Ledger Entry</DialogTitle>
          <DialogDescription>
            Posts a transaction to the selected ledger account with running balance calculation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Account *</Label>
            <Select value={watch("account_id")} onValueChange={(v) => setValue("account_id", v, { shouldValidate: true })}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.type === "cash" ? "💵 " : a.type === "bank" ? "🏦 " : a.type === "creditor" ? "🤝 " : "👤 "}
                    {a.name} (₹{Number(a.balance ?? a.opening_balance).toLocaleString("en-IN")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && <p className="text-[10px] text-destructive">{errors.account_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Transaction Direction *</Label>
              <Select
                value={watch("direction")}
                onValueChange={(v) => {
                  const dir = v as "increase" | "decrease";
                  setValue("direction", dir);
                  if (dir === "increase") {
                    setValue("voucher_type", "receipt");
                  } else {
                    setValue("voucher_type", "payment");
                  }
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">
                    {selectedAccount ? INCREASE_LABEL[selectedAccount.type] : "Increase (Inflow/Dr)"}
                  </SelectItem>
                  <SelectItem value="decrease">
                    {selectedAccount ? DECREASE_LABEL[selectedAccount.type] : "Decrease (Outflow/Cr)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Voucher Type</Label>
              <Select
                value={watch("voucher_type") || (watch("direction") === "increase" ? "receipt" : "payment")}
                onValueChange={(v) => {
                  setValue("voucher_type", v as any);
                  if (v === "receipt") {
                    setValue("direction", "increase");
                  } else if (v === "payment") {
                    setValue("direction", "decrease");
                  }
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">🟢 Receipt (Inflow)</SelectItem>
                  <SelectItem value="payment">🔴 Payment (Outflow)</SelectItem>
                  <SelectItem value="journal">📝 Journal (General)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount" className="text-xs">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                min={0}
                className="h-9 text-xs font-semibold"
                placeholder="0"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Entry Date *</Label>
              <DatePicker
                value={watch("entry_date")}
                onChange={(val) => setValue("entry_date", val, { shouldValidate: true })}
              />
              {errors.entry_date && <p className="text-[10px] text-destructive">{errors.entry_date.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voucher_no" className="text-xs">Voucher / Ref No. (Optional)</Label>
            <Input
              id="voucher_no"
              className="h-9 text-xs font-mono"
              placeholder="e.g. RCP-101 / PMT-55"
              {...register("voucher_no")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-xs">Narration / Particulars</Label>
            <Textarea
              id="description"
              rows={2}
              className="text-xs"
              placeholder="e.g. Advance payment received against quotation #104"
              {...register("description")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Post Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
