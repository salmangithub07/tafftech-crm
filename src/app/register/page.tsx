"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  LayoutDashboard, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  Tag,
  QrCode,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [agree, setAgree] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Plan Selection & Payment States
  const [selectedPlan, setSelectedPlan] = React.useState<"trial" | "yearly" | "3_year">("trial");
  const [utrNumber, setUtrNumber] = React.useState("");
  const [copiedUpi, setCopiedUpi] = React.useState(false);
  const [settings, setSettings] = React.useState({
    yearly_plan_price: "4999",
    three_year_plan_price: "12999",
    bank_upi_id: "",
    payment_qr_code: "",
    company_phone: "+91 9876543210",
  });

  // Coupon States
  const [couponInput, setCouponInput] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountPercent: number;
    title: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  const yearlyPriceNum = Number(settings.yearly_plan_price || 4999);
  const threeYearPriceNum = Number(settings.three_year_plan_price || 12999);

  const basePriceNum =
    selectedPlan === "3_year" ? threeYearPriceNum : selectedPlan === "yearly" ? yearlyPriceNum : 0;

  let discountAmount = 0;
  if (appliedCoupon && selectedPlan !== "trial") {
    discountAmount = Math.round((basePriceNum * appliedCoupon.discountPercent) / 100);
  }

  const finalPriceNum = Math.max(0, basePriceNum - discountAmount);
  const activePriceFormatted = finalPriceNum.toLocaleString("en-IN");
  const basePriceFormatted = basePriceNum.toLocaleString("en-IN");
  const upiId = settings.bank_upi_id || "heenakausarkmt@okicici";

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
    if (selectedPlan === "trial") {
      toast.error("Coupon codes are applicable for 1-Year and 3-Year paid plans.");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) {
      setError("Please agree to the Terms of Service to continue.");
      return;
    }

    const phoneClean = phone.trim();
    if (!phoneClean) {
      setError("Phone / WhatsApp number is required.");
      return;
    }
    if (/[a-zA-Z]/.test(phoneClean)) {
      setError("Phone number cannot contain letters or text.");
      return;
    }

    const digits = phoneClean.replace(/[^0-9]/g, "");
    if (digits.length < 10 || digits.length > 15) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (/^(\d)\1+$/.test(digits)) {
      setError("Dummy or repetitive phone numbers (e.g. 0000000000) are not allowed.");
      return;
    }

    const dummySequences = ["1234567890", "0123456789", "9876543210", "0987654321", "1234512345"];
    if (dummySequences.includes(digits.slice(-10))) {
      setError("Test or dummy phone numbers (e.g. 1234567890) are not allowed.");
      return;
    }

    const last10 = digits.slice(-10);
    if (!/^[6-9]\d{9}$/.test(last10)) {
      setError("Please enter a valid mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    if (selectedPlan !== "trial") {
      const cleanUtr = utrNumber.trim();
      if (!cleanUtr) {
        setError("Payment UTR / Transaction Reference Number is required for paid plans.");
        return;
      }
      if (!/^[0-9]{12}$/.test(cleanUtr)) {
        setError("Standard Indian UPI UTR numbers must be exactly 12 numeric digits (e.g. 428910293847).");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          phone, 
          password,
          selected_plan: selectedPlan,
          utr_number: selectedPlan !== "trial" ? utrNumber.trim() : null,
          coupon_code: appliedCoupon?.code || null,
          discount_amount: discountAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not complete registration.");
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success(selectedPlan !== "trial"
        ? "Registration & Payment proof submitted! Super Admin will review and activate your paid license."
        : "Registration successful! Welcome to Taff Desk CRM.");
      router.push(data.redirectUrl || "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const qrImageSrc =
    settings.payment_qr_code ||
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      `upi://pay?pa=${upiId}&pn=TaffDeskCRM&am=${finalPriceNum}&cu=INR`
    )}`;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <LayoutDashboard className="size-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
            <Sparkles className="size-3.5" />
            Flexible Business Plans · Instant Workspace Setup
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Register your Taff Desk CRM Workspace
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
            Select a plan and fill in your details to get started.
          </p>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Create Business Account</CardTitle>
            <CardDescription className="text-xs">
              Choose your subscription plan and fill in your admin credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive border border-destructive/20 flex items-start gap-2">
                <span className="shrink-0 font-bold">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Select Subscription Plan *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button type="button" onClick={() => { setSelectedPlan("trial"); setAppliedCoupon(null); }} className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${selectedPlan === "trial" ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs" : "border-border bg-card hover:bg-muted/40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">14-Day Trial</span>
                      <Badge variant="success" className="text-[9px] px-1 py-0">₹0</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">14 Days Free</p>
                  </button>
                  <button type="button" onClick={() => setSelectedPlan("yearly")} className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${selectedPlan === "yearly" ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs" : "border-border bg-card hover:bg-muted/40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">1-Year Plan</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/40 text-primary font-bold">365d</Badge>
                    </div>
                    <p className="text-xs font-black text-foreground mt-1">₹{yearlyPriceNum.toLocaleString("en-IN")}<span className="text-[10px] text-muted-foreground font-normal"> / yr</span></p>
                  </button>
                  <button type="button" onClick={() => setSelectedPlan("3_year")} className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${selectedPlan === "3_year" ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500 shadow-xs" : "border-border bg-card hover:bg-muted/40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">3-Year Plan</span>
                      <Badge variant="success" className="text-[9px] px-1 py-0">Best Value</Badge>
                    </div>
                    <p className="text-xs font-black text-foreground mt-1">₹{threeYearPriceNum.toLocaleString("en-IN")}<span className="text-[10px] text-muted-foreground font-normal"> / 3 yrs</span></p>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">Business / Owner Name <span className="text-destructive">*</span></Label>
                <Input id="name" type="text" placeholder="e.g. Acme Industrial Solutions" value={name} onChange={(e) => setName(e.target.value)} required className="h-9 text-xs" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">Admin Email Address <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 text-xs" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">Phone / WhatsApp Number <span className="text-destructive">*</span></Label>
                <Input id="phone" type="tel" placeholder="e.g. +91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required className="h-9 text-xs" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pr-10 h-9 text-xs" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {selectedPlan !== "trial" && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5"><CreditCard className="size-4 text-amber-500" /> Payment Details ({selectedPlan === "3_year" ? "3-Year Plan" : "1-Year Plan"})</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{appliedCoupon && <span className="line-through text-muted-foreground mr-1 text-[11px]">₹{basePriceFormatted}</span>}₹{activePriceFormatted}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1 text-foreground"><Tag className="size-3 text-amber-500" /> Have a Coupon Code?</span>
                      {appliedCoupon && <Badge variant="success" className="text-[9px]">{appliedCoupon.discountPercent}% OFF</Badge>}
                    </div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0"><CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /><span className="font-bold font-mono text-foreground">{appliedCoupon.code}</span><span className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate">(-₹{discountAmount.toLocaleString("en-IN")})</span></div>
                        <button type="button" onClick={handleRemoveCoupon} className="text-[10px] font-bold text-destructive hover:underline ml-2">Remove</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Input placeholder="Coupon code (e.g. DIWALI20)..." value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} className="h-8 text-xs font-mono uppercase bg-background" />
                        <Button type="button" variant="outline" size="sm" onClick={handleApplyCoupon} disabled={validatingCoupon || !couponInput.trim()} className="h-8 text-xs shrink-0 font-semibold">{validatingCoupon ? <Loader2 className="size-3 animate-spin" /> : "Apply"}</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card space-y-2 text-center">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1"><QrCode className="size-3.5 text-primary" /> Scan QR & Pay ₹{activePriceFormatted} via UPI / GPay / PhonePe</span>
                    <div className="relative size-36 rounded-lg border bg-white p-2 flex items-center justify-center">
                      <img src={qrImageSrc} alt="UPI Payment QR Code" className="size-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between w-full rounded bg-muted/60 px-2.5 py-1 text-[11px]">
                      <span className="font-mono text-foreground font-semibold truncate">UPI: {upiId}</span>
                      <button type="button" onClick={copyUpiToClipboard} className="text-primary font-bold hover:underline shrink-0 ml-1">{copiedUpi ? "Copied" : "Copy"}</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="utr_number" className="text-xs font-semibold text-foreground">Payment UTR / Transaction Reference No. <span className="text-destructive">*</span></Label>
                    <Input id="utr_number" placeholder="Enter 12-digit UTR number after paying..." value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="h-9 text-xs font-mono bg-background" required />
                    <p className="text-[10px] text-muted-foreground">Enter the 12-digit UPI UTR number received after paying. Super Admin will verify and activate your paid license.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer" />
                <label htmlFor="agree" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                  I agree to the <span className="font-semibold text-foreground">Terms of Service</span> and <span className="font-semibold text-foreground">Privacy Policy</span>
                </label>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-10 font-bold text-xs gap-2 mt-1">
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /> Creating your workspace...</>
                ) : (
                  <><CheckCircle2 className="size-4" /> {selectedPlan === "trial" ? "Start 14-Day Free Trial Now" : `Submit Registration & Payment Proof (₹${activePriceFormatted})`}</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Sign in to your account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Secure 256-bit Encrypted Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
