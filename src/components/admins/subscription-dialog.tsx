"use client";

import * as React from "react";
import { Loader2, Calendar, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Admin, PlanType } from "@/lib/types";
import { getSubscriptionInfo } from "@/lib/subscription";

export function SubscriptionDialog({
  open,
  onOpenChange,
  admin,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: Admin | null;
  onSaved: () => void;
}) {
  const [planType, setPlanType] = React.useState<PlanType>("trial");
  const [expiryDate, setExpiryDate] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (admin && open) {
      setPlanType(admin.plan_type || "trial");
      setExpiryDate(admin.plan_expiry_date || "");
    }
  }, [admin, open]);

  if (!admin) return null;

  const currentInfo = getSubscriptionInfo(admin);

  function quickSetExpiry(daysToAdd: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setExpiryDate(d.toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admins/${admin!.id}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_type: planType,
          plan_expiry_date: expiryDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update subscription");

      toast.success(`Subscription plan updated for ${admin!.name}`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="size-5 text-primary" />
            Manage Subscription — {admin.name}
          </DialogTitle>
          <DialogDescription>
            Update subscription plan, extension period, or expiry date.
          </DialogDescription>
        </DialogHeader>

        {/* Current status summary card */}
        <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Current Status:</span>
            <Badge
              variant={
                currentInfo.status === "active"
                  ? "success"
                  : currentInfo.status === "grace"
                  ? "warning"
                  : "destructive"
              }
              className="capitalize"
            >
              {currentInfo.status === "grace" ? "Grace Period (3 Days)" : currentInfo.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Plan Type:</span>
            <span className="font-semibold text-foreground capitalize">{currentInfo.planType}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Expiry Date:</span>
            <span className="font-semibold text-foreground">{currentInfo.formattedExpiry}</span>
          </div>
          {currentInfo.status === "grace" && (
            <div className="flex items-center gap-1.5 text-amber-500 pt-1 border-t border-border/50">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>
                {currentInfo.graceDaysRemaining} day(s) left before automatic CRM lock!
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan_type">Subscription Plan *</Label>
            <Select value={planType} onValueChange={(v) => {
              const val = v as PlanType;
              setPlanType(val);
              if (val === "lifetime" || val === "trial") {
                setExpiryDate("");
              } else if (val === "yearly" && !expiryDate) {
                quickSetExpiry(365);
              }
            }}>
              <SelectTrigger id="plan_type" className="w-full">
                <SelectValue placeholder="Select plan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly Plan (365 Days)</SelectItem>
                <SelectItem value="3_year">3-Year Plan (1095 Days)</SelectItem>
                <SelectItem value="lifetime">Lifetime Plan (Unlimited / No Expiry)</SelectItem>
                <SelectItem value="trial">Trial Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              {expiryDate && (
                <button
                  type="button"
                  onClick={() => setExpiryDate("")}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                >
                  Clear Expiry (Unlimited)
                </button>
              )}
            </div>
            <DatePicker
              value={expiryDate}
              onChange={setExpiryDate}
            />
          </div>

          {/* Quick extension shortcuts */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" /> Quick Expiry Shortcuts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => quickSetExpiry(365)}
              >
                +1 Year (365d)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => quickSetExpiry(1095)}
              >
                +3 Years (1095d)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setExpiryDate("")}
              >
                Clear Expiry (Lifetime)
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Save Subscription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
