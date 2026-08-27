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
  description: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

const INCREASE_LABEL: Record<string, string> = {
  cash: "Received (increase)",
  bank: "Received (increase)",
  creditor: "We owe more (increase)",
  debtor: "They owe more (increase)",
};
const DECREASE_LABEL: Record<string, string> = {
  cash: "Paid out (decrease)",
  bank: "Paid out (decrease)",
  creditor: "We paid them (decrease)",
  debtor: "They paid us (decrease)",
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
      toast.success("Transaction recorded — balance updated.");
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
          <DialogTitle>Record a Transaction</DialogTitle>
          <DialogDescription>
            This adjusts the account&apos;s balance from here on — the opening balance itself
            stays untouched, so there&apos;s always a clean history of what changed and when.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Account *</Label>
            <Select value={watch("account_id")} onValueChange={(v) => setValue("account_id", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} (₹{Number(a.balance ?? a.opening_balance).toLocaleString("en-IN")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && <p className="text-xs text-destructive">{errors.account_id.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Direction *</Label>
            <Select value={watch("direction")} onValueChange={(v) => setValue("direction", v as "increase" | "decrease")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">
                  {selectedAccount ? INCREASE_LABEL[selectedAccount.type] : "Increase"}
                </SelectItem>
                <SelectItem value="decrease">
                  {selectedAccount ? DECREASE_LABEL[selectedAccount.type] : "Decrease"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={0}
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry_date">Date *</Label>
              <DatePicker
                value={watch("entry_date")}
                onChange={(val) => setValue("entry_date", val, { shouldValidate: true })}
              />
              {errors.entry_date && <p className="text-xs text-destructive">{errors.entry_date.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} placeholder="e.g. Payment received for invoice #123" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
