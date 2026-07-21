"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock } from "lucide-react";
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
import type { LedgerAccount, LedgerAccountType } from "@/lib/types";

const TYPE_LABELS: Record<LedgerAccountType, string> = {
  cash: "Cash account",
  bank: "Bank account",
  creditor: "Creditor (you owe them)",
  debtor: "Debtor / Outstanding (they owe you)",
};

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  opening_balance: z.number().min(0),
  notes: z.string().optional().or(z.literal("")),
});

export function LedgerAccountDialog({
  open,
  onOpenChange,
  account,
  type,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: LedgerAccount | null;
  type: LedgerAccountType;
  onSaved: () => void;
}) {
  const isEdit = !!account;
  type FormValues = z.infer<typeof createSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", opening_balance: 0, notes: "" },
  });

  React.useEffect(() => {
    if (!open) return;
    if (account) {
      reset({ name: account.name, opening_balance: Number(account.opening_balance), notes: account.notes ?? "" });
    } else {
      reset({ name: "", opening_balance: 0, notes: "" });
    }
  }, [open, account, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(isEdit ? `/api/ledger-accounts/${account!.id}` : "/api/ledger-accounts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { name: values.name, notes: values.notes } : { ...values, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(isEdit ? "Account updated." : "Account added.");
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
          <DialogTitle>{isEdit ? "Edit Account" : `Add ${TYPE_LABELS[type]}`}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the account name or notes."
              : "Enter the opening balance once — after this, record increases or decreases as transactions."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g. HDFC Bank - 1234" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {isEdit ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Lock className="size-3.5 shrink-0" />
              Opening balance: ₹{Number(account!.opening_balance).toLocaleString("en-IN")} — use &quot;Add
              transaction&quot; to change the balance from here on.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opening_balance">Opening balance *</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                min={0}
                {...register("opening_balance", { valueAsNumber: true })}
              />
              {errors.opening_balance && (
                <p className="text-xs text-destructive">{errors.opening_balance.message}</p>
              )}
            </div>
          )}

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
              {isEdit ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
