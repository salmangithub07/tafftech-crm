"use client";

import * as React from "react";
import { ShieldCheck, PhoneCall, Send, Check, MessageSquare, Clock, Sparkles } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function TenantRenewDialog({
  open,
  onOpenChange,
  planType,
  expiryDate,
  companyPhone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType?: string | null;
  expiryDate?: string | null;
  companyPhone?: string | null;
}) {
  const [selectedPlan, setSelectedPlan] = React.useState<string>("yearly");
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [requestSent, setRequestSent] = React.useState(false);

  async function handleSendRequest() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/subscription/request-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: selectedPlan, notes }),
      });
      if (!res.ok) throw new Error("Failed to send request");

      setRequestSent(true);
      toast.success("Renewal request sent to Super Admin!");
    } catch (err) {
      toast.error("Failed to send request. Please contact support directly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const phoneClean = (companyPhone || "+91 9876543210").replace(/[^0-9+]/g, "");
  const waUrl = `https://wa.me/${phoneClean.replace("+", "")}?text=${encodeURIComponent(
    `Hello! I want to renew/upgrade my CRM subscription plan to ${selectedPlan.toUpperCase()}. Expiry Date: ${expiryDate || "N/A"}.`
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-primary" />
            Renew / Upgrade Subscription
          </DialogTitle>
          <DialogDescription>
            Choose a plan and request renewal from Super Admin or contact directly.
          </DialogDescription>
        </DialogHeader>

        {/* Current status banner */}
        <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground font-medium">Current Plan</span>
            <span className="font-semibold text-foreground capitalize">{planType || "Trial"}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-muted-foreground font-medium">Expiry Date</span>
            <Badge variant="outline" className="text-xs">
              {expiryDate || "No Expiry"}
            </Badge>
          </div>
        </div>

        {/* Select Plan */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Select Renewal Plan</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "monthly", title: "Monthly", period: "30 Days" },
              { id: "quarterly", title: "Quarterly", period: "90 Days" },
              { id: "yearly", title: "Yearly", period: "365 Days", badge: "Best Value" },
            ].map((p) => {
              const isSelected = selectedPlan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                      {p.badge}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-foreground">{p.title}</span>
                  <span className="text-[11px] text-muted-foreground">{p.period}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional note */}
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">
            Note to Super Admin (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="e.g. Please update our account for 1 year plan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-16 text-xs"
          />
        </div>

        {/* Quick Contact options */}
        <div className="rounded-xl bg-muted/40 p-3 space-y-2 text-xs border border-border/50">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <PhoneCall className="size-3.5 text-primary" /> Direct Contact Options
          </span>
          <div className="flex gap-2">
            <a
              href={`tel:${phoneClean}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <PhoneCall className="size-3" /> Call Admin
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-500 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              <MessageSquare className="size-3" /> WhatsApp
            </a>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleSendRequest}
            disabled={isSubmitting || requestSent}
            className="gap-1.5"
          >
            {requestSent ? (
              <>
                <Check className="size-3.5 text-emerald-400" /> Request Sent!
              </>
            ) : (
              <>
                <Send className="size-3.5" /> Send Renewal Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
