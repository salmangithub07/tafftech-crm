"use client";

import * as React from "react";
import { PhoneCall, Send, Check, MessageSquare, Sparkles, ShieldCheck, QrCode, Copy, CheckCheck, CheckCircle2, Tag, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TenantRenewDialog({
  open,
  onOpenChange,
  planType,
  expiryDate,
  companyPhone,
  yearlyPrice,
  threeYearPrice,
  bankUpiId,
  paymentQrCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType?: string | null;
  expiryDate?: string | null;
  companyPhone?: string | null;
  yearlyPrice?: string | null;
  threeYearPrice?: string | null;
  bankUpiId?: string | null;
  paymentQrCode?: string | null;
}) {
  const [selectedPlan, setSelectedPlan] = React.useState<"yearly" | "3_year">("yearly");
  const [utrNumber, setUtrNumber] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [requestSent, setRequestSent] = React.useState(false);
  const [copiedUpi, setCopiedUpi] = React.useState(false);
  const [couponInput, setCouponInput] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountPercent: number;
    title: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setUtrNumber("");
      setNotes("");
      setRequestSent(false);
      setCouponInput("");
      setAppliedCoupon(null);
      if (planType === "yearly") {
        setSelectedPlan("3_year");
      } else {
        setSelectedPlan("yearly");
      }
    }
  }, [open, planType]);

  const basePriceRaw = selectedPlan === "3_year" ? (threeYearPrice || "12999") : (yearlyPrice || "4999");
  const basePriceNum = Number(basePriceRaw);

  let discountAmount = 0;
  if (appliedCoupon) {
    discountAmount = Math.round((basePriceNum * appliedCoupon.discountPercent) / 100);
  }

  const finalPriceNum = Math.max(0, basePriceNum - discountAmount);
  const activePriceRaw = String(finalPriceNum);
  const activePriceFormatted = finalPriceNum.toLocaleString("en-IN");
  const basePriceFormatted = basePriceNum.toLocaleString("en-IN");

  const yearlyPriceFormatted = Number(yearlyPrice || 4999).toLocaleString("en-IN");
  const threeYearPriceFormatted = Number(threeYearPrice || 12999).toLocaleString("en-IN");
  const upiId = bankUpiId || "superadmin@upi";

  function copyUpiToClipboard() {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2000);
  }

  async function handleApplyCoupon() {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) {
      toast.error("Please enter a coupon code.");
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await fetch(`/api/subscription/coupons?validate=${encodeURIComponent(clean)}&plan=${selectedPlan}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid coupon code.");

      setAppliedCoupon({
        code: data.coupon.code,
        discountPercent: data.coupon.discount_percent,
        title: data.coupon.title,
      });
      toast.success(`Coupon '${data.coupon.code}' applied! Saved ${data.coupon.discount_percent}%.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to apply coupon.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    toast.info("Coupon code removed.");
  }

  async function handleSendRequest() {
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      toast.error("Please enter the 12-digit UTR / Transaction Reference Number after paying.");
      return;
    }
    if (!/^[0-9]{12}$/.test(cleanUtr)) {
      toast.error("Invalid UTR format. Standard Indian UPI UTR numbers must be exactly 12 numeric digits (e.g. 428910293847).");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/subscription/submit-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_type: selectedPlan,
          utr_number: cleanUtr,
          notes,
          coupon_code: appliedCoupon?.code || null,
          discount_amount: discountAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit payment proof");

      setRequestSent(true);
      toast.success("Payment proof submitted! Super Admin will review and activate your subscription.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request. Contact Super Admin directly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const superAdminNum = companyPhone || "+91 9876543210";
  const phoneClean = superAdminNum.replace(/[^0-9+]/g, "");
  const planLabel = selectedPlan === "3_year" ? "3-Year Plan (1095 Days)" : "1-Year Plan (365 Days)";
  const couponText = appliedCoupon ? ` using Coupon ${appliedCoupon.code} (-₹${discountAmount.toLocaleString("en-IN")})` : "";
  const waUrl = `https://wa.me/${phoneClean.replace("+", "")}?text=${encodeURIComponent(
    `Hello! I have paid ₹${activePriceFormatted} for ${planLabel} CRM Subscription${couponText}. UTR: ${utrNumber || "N/A"}. Please approve and extend.`
  )}`;

  // Dynamic UPI QR string based on final discounted price
  const qrImageSrc = paymentQrCode || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `upi://pay?pa=${upiId}&pn=TaffDeskCRM&am=${finalPriceNum}&cu=INR`
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b text-left">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-left">
            <Sparkles className="size-5 text-primary shrink-0" />
            <span>Renew / Upgrade Subscription</span>
          </DialogTitle>
          <DialogDescription className="text-left text-xs sm:text-sm">
            Select your plan, scan Super Admin&apos;s QR Code to pay ₹{activePriceFormatted}, enter your UTR number, and request activation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column: Plan Selection & Payment Form */}
          <div className="space-y-4">
            {/* Current status banner */}
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex items-center justify-between text-xs">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-muted-foreground font-medium">Current Plan</span>
                <span className="font-semibold text-foreground capitalize">{planType || "Trial"}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-muted-foreground font-medium">Expiry Date</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {expiryDate || "No Expiry"}
                </Badge>
              </div>
            </div>

            {/* Plan Options Selector (1-Year vs 3-Year) */}
            <div className="space-y-2 text-left">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between flex-wrap gap-1">
                <span>Select Subscription Plan</span>
                <span className="text-[11px] font-normal text-muted-foreground">Select plan to update QR price</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1-Year Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("yearly")}
                  className={`relative flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPlan === "yearly"
                      ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                      : "border-border bg-card hover:bg-muted/40 hover:border-primary/50"
                  }`}
                >
                  {/* Left Side Icon */}
                  <div className="shrink-0">
                    {selectedPlan === "yearly" ? (
                      <CheckCircle2 className="size-5 text-primary" />
                    ) : (
                      <div className="size-5 rounded-full border-2 border-muted-foreground/40" />
                    )}
                  </div>
                  {/* Right Side Text & Price */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground">1-Year Plan</span>
                      <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-bold">
                        365d
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-foreground tracking-tight">₹{yearlyPriceFormatted}</span>
                      <span className="text-[10px] text-muted-foreground">/ 1 Year</span>
                    </div>
                  </div>
                </button>

                {/* 3-Year Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("3_year")}
                  className={`relative flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPlan === "3_year"
                      ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500 shadow-sm"
                      : "border-border bg-card hover:bg-muted/40 hover:border-emerald-500/50"
                  }`}
                >
                  {/* Left Side Icon */}
                  <div className="shrink-0">
                    {selectedPlan === "3_year" ? (
                      <CheckCircle2 className="size-5 text-emerald-500" />
                    ) : (
                      <div className="size-5 rounded-full border-2 border-muted-foreground/40" />
                    )}
                  </div>
                  {/* Right Side Text & Price */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground">3-Year Plan</span>
                      <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold">
                        Best Value
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-foreground tracking-tight">₹{threeYearPriceFormatted}</span>
                      <span className="text-[10px] text-muted-foreground">/ 3 Years</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Discount Coupon Section */}
            <div className="rounded-xl border border-border/80 bg-gradient-to-r from-amber-500/5 via-primary/5 to-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Tag className="size-3.5 text-amber-500" />
                  Have a Coupon / Offer Code?
                </span>
                {appliedCoupon && (
                  <Badge variant="success" className="text-[10px]">
                    {appliedCoupon.discountPercent}% OFF APPLIED
                  </Badge>
                )}
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground font-mono">{appliedCoupon.code}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                        {appliedCoupon.title} • Saved ₹{discountAmount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter coupon code (e.g. DIWALI20)..."
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="h-8 text-xs font-mono uppercase bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="h-8 text-xs shrink-0 font-semibold"
                  >
                    {validatingCoupon ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            {/* UTR / Transaction ID Field */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="utr_number" className="text-xs font-semibold text-foreground flex items-center gap-1">
                Payment UTR / Transaction Reference No. <span className="text-destructive">*</span>
              </Label>
              <Input
                id="utr_number"
                placeholder="Enter 12-digit UTR number (e.g. 423910293847)..."
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="h-10 text-xs font-mono"
                required
              />
              <span className="text-[11px] text-muted-foreground">
                Enter the 12-digit Ref / UTR No. after paying ₹{activePriceFormatted} on UPI.
              </span>
            </div>

            {/* Optional note */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">
                Note to Super Admin (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any message for Super Admin..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-14 text-xs"
              />
            </div>
          </div>

          {/* Right Column: QR Code & Direct Contact Options */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* Super Admin Static QR Code & UPI Details */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card space-y-3 text-center shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground flex-wrap justify-center">
                <QrCode className="size-4 text-primary shrink-0" />
                <span>Scan to Pay</span>
                {appliedCoupon && (
                  <span className="line-through text-muted-foreground">₹{basePriceFormatted}</span>
                )}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{activePriceFormatted}</span>
                <span>via UPI / GPay / PhonePe</span>
              </div>

              <div className="relative size-44 rounded-xl border bg-white p-2.5 shadow-sm flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageSrc} alt="UPI Payment QR Code" className="size-full object-contain" />
              </div>

              <div className="flex items-center justify-between w-full rounded-lg bg-muted/60 px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-muted-foreground">UPI ID:</span>
                  <span className="font-mono font-semibold text-foreground truncate">{upiId}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-[11px] gap-1 shrink-0"
                  onClick={copyUpiToClipboard}
                >
                  {copiedUpi ? <CheckCheck className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedUpi ? "Copied" : "Copy UPI"}
                </Button>
              </div>
            </div>

            {/* Direct Contact options (Super Admin Number) */}
            <div className="rounded-xl bg-muted/40 p-3.5 space-y-2.5 text-xs border border-border/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <PhoneCall className="size-3.5 text-primary" /> Need Help? Contact Super Admin
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">{superAdminNum}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${phoneClean}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <PhoneCall className="size-3.5" /> Call Admin
                </a>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-500 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <MessageSquare className="size-3.5" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-4 flex sm:justify-between items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleSendRequest}
            disabled={isSubmitting || requestSent}
            className="gap-1.5 bg-primary text-primary-foreground hover:opacity-90 px-5 h-9 text-xs"
          >
            {requestSent ? (
              <>
                <Check className="size-4 text-emerald-400" /> Payment Proof Submitted!
              </>
            ) : (
              <>
                <Send className="size-4" /> Submit Proof for {selectedPlan === "3_year" ? "3-Year Plan" : "1-Year Plan"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
