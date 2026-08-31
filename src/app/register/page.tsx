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
  Mail,
  Phone,
  Lock,
  Building2,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

  // Email / Username Availability States
  const [emailChecking, setEmailChecking] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<"idle" | "available" | "unavailable" | "invalid">("idle");
  const [emailMessage, setEmailMessage] = React.useState("");

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
    terms_of_service: "",
    privacy_policy: "",
  });
  const [termsModalOpen, setTermsModalOpen] = React.useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = React.useState(false);

  // Coupon States
  const [couponInput, setCouponInput] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountPercent: number;
    title: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = React.useState(false);

  // Realtime Email Availability Checker
  React.useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailStatus("idle");
      setEmailMessage("");
      setEmailChecking(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      if (trimmed.includes("@") && trimmed.split("@")[1].length > 1) {
        setEmailStatus("invalid");
        setEmailMessage("Please enter a valid email domain (e.g. name@company.com)");
      } else {
        setEmailStatus("idle");
        setEmailMessage("");
      }
      setEmailChecking(false);
      return;
    }

    setEmailChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.available) {
          setEmailStatus("available");
          setEmailMessage("Username / Email is available!");
        } else {
          setEmailStatus("unavailable");
          setEmailMessage(data.message || "This email is already registered.");
        }
      } catch {
        setEmailStatus("idle");
      } finally {
        setEmailChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

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

    if (emailStatus === "unavailable") {
      setError("This email address is already registered. Please sign in or use a different email.");
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
    <div className="min-h-screen w-full flex flex-col md:grid md:grid-cols-12 bg-background font-sans items-start">
      {/* Left Hero Section (Sticky Desktop >= 768px + Vibrant Aurora Gradient & Dot Grid) */}
      <div className="relative hidden md:flex md:col-span-5 flex-col justify-between p-6 lg:p-10 2xl:p-14 bg-gradient-to-br from-[#1a0b2e] via-[#0d1527] to-[#2b0838] text-white overflow-hidden md:sticky md:top-0 md:h-screen border-r border-border/20 select-none">
        {/* Vibrant Ambient Aurora Mesh Background & Dot Matrix */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/80 via-slate-950/90 to-rose-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff20_1px,transparent_1px)] bg-[size:22px_22px] opacity-70" />
        <div className="absolute -top-16 -left-16 size-[360px] rounded-full bg-rose-500/35 blur-[80px] pointer-events-none" />
        <div className="absolute top-1/3 -right-20 size-[360px] rounded-full bg-indigo-500/40 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-16 left-1/4 size-[380px] rounded-full bg-purple-600/45 blur-[80px] pointer-events-none" />
        <div className="absolute top-10 right-10 size-[180px] rounded-full bg-amber-400/20 blur-[60px] pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-primary to-purple-600 text-white shadow-xl shadow-rose-500/30 group-hover:scale-105 transition-transform border border-white/25">
              <LayoutDashboard className="size-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white block drop-shadow-xs">Taff Desk CRM</span>
              <span className="text-[11px] text-slate-300 font-medium block">Enterprise Workspace Suite</span>
            </div>
          </Link>
        </div>

        {/* Center Content & Value Props */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/25 shadow-xs">
            <Sparkles className="size-3.5 text-amber-300" />
            <span>Instant Cloud Workspace Setup</span>
          </div>

          <h2 className="text-2xl lg:text-3xl 2xl:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-xs">
            Start scaling your business with Taff Desk <span className="bg-gradient-to-r from-amber-300 via-rose-200 to-purple-200 bg-clip-text text-transparent">today</span>.
          </h2>

          <p className="text-xs lg:text-sm text-slate-200 leading-relaxed font-medium">
            Get your dedicated multi-user CRM workspace with WhatsApp alerts, GST invoices, and financial reports ready in under 60 seconds.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-md shadow-lg shadow-black/20 transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">14-Day Risk-Free Trial</p>
                <p className="text-[11px] text-slate-300">Full access to all CRM & Billing features with ₹0 upfront</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-md shadow-lg shadow-black/20 transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/30 text-white border border-primary/40">
                <QrCode className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instant QR & UPI Activation</p>
                <p className="text-[11px] text-slate-300">1-Year & 3-Year plans with automatic discount coupons</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-md shadow-lg shadow-black/20 transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/30 text-amber-300 border border-amber-400/40">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Isolated Tenant Database</p>
                <p className="text-[11px] text-slate-300">Your customer & financial data is 100% private and secure</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof & Trust Footer */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span className="font-medium text-white text-[11px]">256-Bit SSL Encrypted Platform</span>
          </div>
          <span className="text-[11px] text-slate-300">Instant Setup • No Credit Card</span>
        </div>
      </div>

      {/* Right Form Section — Vertically Centered with Modern Ambient Background */}
      <div className="relative flex-1 w-full md:col-span-7 flex flex-col justify-center items-center min-h-screen p-4 sm:p-6 lg:p-10 xl:p-14 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/60 dark:from-background dark:to-muted/20 overflow-y-auto">
        {/* Subtle Decorative Ambient Mesh Grid & Soft Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
        <div className="absolute top-0 right-0 size-96 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 size-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-xl space-y-6 my-auto py-8">
          {/* Top Navbar */}
          <div className="flex items-center justify-between w-full">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-muted transition-all border border-slate-200/80 dark:border-border/50 shadow-xs"
            >
              ← Back to Home
            </Link>
            <div className="text-xs text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline ml-1">
                Sign In →
              </Link>
            </div>
          </div>

          {/* Mobile Brand Banner (<768px) */}
          <div className="flex flex-col items-center gap-2 text-center md:hidden">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-primary text-primary-foreground shadow-md">
              <LayoutDashboard className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your Workspace</h1>
            <p className="text-xs text-muted-foreground">Select a plan and fill in your admin credentials.</p>
          </div>

          {/* Desktop Heading (>=768px) */}
          <div className="hidden md:block space-y-1">
            <h1 className="text-2xl 2xl:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Register your Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground">
              Choose your subscription plan and fill in your admin details to get started.
            </p>
          </div>

          {/* Elevated Glassmorphic Card */}
          <div className="relative bg-white/95 dark:bg-card/90 backdrop-blur-xl border border-slate-200/80 dark:border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-300/40 dark:shadow-none space-y-6">
            {/* Top Card Gradient Accent Line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-full" />

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive flex items-start gap-2 animate-in fade-in-50">
                <span className="shrink-0 font-bold">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Plan Picker Cards */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Select Subscription Plan *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setSelectedPlan("trial"); setAppliedCoupon(null); }}
                    className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === "trial" 
                        ? "border-primary bg-primary/10 ring-2 ring-primary shadow-md shadow-primary/10" 
                        : "border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background hover:bg-slate-100/70 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-foreground">14-Day Trial</span>
                      <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold">₹0 Free</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-1.5 font-medium">14 Days Full Access</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan("yearly")}
                    className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === "yearly" 
                        ? "border-primary bg-primary/10 ring-2 ring-primary shadow-md shadow-primary/10" 
                        : "border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background hover:bg-slate-100/70 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-foreground">1-Year Plan</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/40 text-primary font-bold">365 Days</Badge>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-foreground mt-1.5">
                      ₹{yearlyPriceNum.toLocaleString("en-IN")}<span className="text-[10px] text-slate-500 dark:text-muted-foreground font-normal"> / yr</span>
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan("3_year")}
                    className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === "3_year" 
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10" 
                        : "border-slate-200 dark:border-border bg-slate-50/50 dark:bg-background hover:bg-slate-100/70 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-foreground">3-Year Plan</span>
                      <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold">Best Value</Badge>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-foreground mt-1.5">
                      ₹{threeYearPriceNum.toLocaleString("en-IN")}<span className="text-[10px] text-slate-500 dark:text-muted-foreground font-normal"> / 3 yrs</span>
                    </p>
                  </button>
                </div>
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    Business / Owner Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. Acme Industrial Solutions"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-11 pl-10 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white dark:bg-muted/40 dark:focus:bg-background border-slate-200 dark:border-border rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      Admin Email Address <span className="text-destructive">*</span>
                    </Label>
                    {emailChecking && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin text-primary" /> Checking availability...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      required
                      className={`h-11 pl-10 pr-10 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white dark:bg-muted/40 dark:focus:bg-background rounded-xl transition-all focus-visible:ring-2 ${
                        emailStatus === "available"
                          ? "border-emerald-500/80 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                          : emailStatus === "unavailable"
                          ? "border-destructive/80 focus-visible:ring-destructive/20 focus-visible:border-destructive"
                          : "border-slate-200 dark:border-border focus-visible:ring-primary/20 focus-visible:border-primary"
                      }`}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {emailChecking ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : emailStatus === "available" ? (
                        <CheckCircle2 className="size-4 text-emerald-500 animate-in zoom-in-50" />
                      ) : emailStatus === "unavailable" ? (
                        <AlertCircle className="size-4 text-destructive animate-in zoom-in-50" />
                      ) : null}
                    </div>
                  </div>
                  {emailStatus === "available" && (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in-50">
                      <CheckCircle2 className="size-3 shrink-0" />
                      Username is available
                    </p>
                  )}
                  {emailStatus === "unavailable" && (
                    <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 animate-in fade-in-50">
                      <AlertCircle className="size-3 shrink-0" />
                      {emailMessage}{" "}
                      <Link href="/login" className="underline font-bold text-primary hover:text-primary/80 ml-1">
                        Sign in instead →
                      </Link>
                    </p>
                  )}
                  {emailStatus === "invalid" && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-in fade-in-50">
                      <span>⚠️</span> {emailMessage}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    Phone / WhatsApp Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-11 pl-10 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white dark:bg-muted/40 dark:focus:bg-background border-slate-200 dark:border-border rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    Admin Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-11 h-11 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white dark:bg-muted/40 dark:focus:bg-background border-slate-200 dark:border-border rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Paid Plan QR & UTR Section */}
              {selectedPlan !== "trial" && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3.5 animate-in fade-in-50">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-foreground flex items-center gap-1.5">
                      <CreditCard className="size-4 text-amber-500" />
                      Payment Details ({selectedPlan === "3_year" ? "3-Year Plan" : "1-Year Plan"})
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {appliedCoupon && (
                        <span className="line-through text-muted-foreground mr-1.5 text-xs">
                          ₹{basePriceFormatted}
                        </span>
                      )}
                      ₹{activePriceFormatted}
                    </span>
                  </div>

                  {/* Coupon Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-foreground">
                        <Tag className="size-3.5 text-amber-500" /> Have a Coupon Code?
                      </span>
                      {appliedCoupon && (
                        <Badge variant="success" className="text-[10px] px-2 py-0.5">
                          {appliedCoupon.discountPercent}% OFF APPLIED
                        </Badge>
                      )}
                    </div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-bold font-mono text-foreground">{appliedCoupon.code}</span>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                            (-₹{discountAmount.toLocaleString("en-IN")})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs font-bold text-destructive hover:underline ml-2 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                          <Input
                            placeholder="Enter coupon (e.g. DIWALI20)..."
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            className="h-10 pl-9 text-xs font-mono uppercase bg-white dark:bg-background rounded-xl"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleApplyCoupon}
                          disabled={validatingCoupon || !couponInput.trim()}
                          className="h-10 px-4 text-xs shrink-0 font-bold rounded-xl"
                        >
                          {validatingCoupon ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* QR Box */}
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card space-y-2.5 text-center shadow-xs">
                    <span className="text-xs font-semibold text-slate-800 dark:text-foreground flex items-center gap-1.5">
                      <QrCode className="size-4 text-primary" /> Scan QR & Pay ₹{activePriceFormatted} via UPI / GPay / PhonePe
                    </span>
                    <div className="relative size-36 rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImageSrc} alt="UPI Payment QR Code" className="size-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between w-full rounded-xl bg-slate-100/80 dark:bg-muted/60 px-3 py-1.5 text-xs">
                      <span className="font-mono text-slate-800 dark:text-foreground font-semibold truncate">UPI: {upiId}</span>
                      <button
                        type="button"
                        onClick={copyUpiToClipboard}
                        className="text-primary font-bold hover:underline shrink-0 ml-2 cursor-pointer"
                      >
                        {copiedUpi ? "Copied!" : "Copy UPI"}
                      </button>
                    </div>
                  </div>

                  {/* UTR Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="utr_number" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      Payment UTR / Transaction Reference No. <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <Input
                        id="utr_number"
                        placeholder="Enter 12-digit UPI UTR number..."
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        className="h-11 pl-10 text-xs font-mono bg-white dark:bg-background rounded-xl"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                      Enter the 12-digit UTR number from your payment app. Super Admin will verify and activate your license.
                    </p>
                  </div>
                </div>
              )}

              {/* Terms Checkbox */}
              <div className="flex items-start sm:items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 sm:mt-0 size-4 rounded border-slate-300 dark:border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                />
                <label htmlFor="agree" className="text-xs text-slate-600 dark:text-muted-foreground select-none leading-relaxed">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="font-bold text-slate-900 dark:text-foreground underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(true)}
                    className="font-bold text-slate-900 dark:text-foreground underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-xs sm:text-sm font-bold bg-gradient-to-r from-primary via-rose-600 to-primary hover:opacity-95 text-white shadow-lg shadow-primary/25 rounded-xl gap-2 mt-2 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Setting up your workspace...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    {selectedPlan === "trial" 
                      ? "Start 14-Day Free Trial Now" 
                      : `Submit Registration & Payment (₹${activePriceFormatted})`}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Footer Row */}
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] sm:text-xs text-slate-500 dark:text-muted-foreground">
            <div className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>256-bit Encrypted</span>
            </div>
            <span>•</span>
            <Link href="/login" className="hover:text-foreground underline font-semibold">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Terms of Service Dialog */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Terms of Service
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please read the terms governing the use of your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-slate-700 dark:text-muted-foreground space-y-3 leading-relaxed py-2">
            {settings.terms_of_service?.trim() ? (
              <p className="whitespace-pre-line bg-muted/30 p-3.5 rounded-xl border">
                {settings.terms_of_service}
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">1. Acceptance of Terms</h4>
                  <p>By registering and creating a tenant workspace on this platform, you agree to comply with and be bound by all applicable laws, acceptable usage policies, and license rules.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">2. Account Responsibility</h4>
                  <p>You are solely responsible for maintaining the confidentiality of your workspace credentials and for all activities, data transactions, and customer records created by your team accounts.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">3. Subscription &amp; Billing</h4>
                  <p>Paid plans are activated upon payment verification. Access to multi-user executives, customer lead quotas, and GST invoice generations are governed by your active subscription tier.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">4. System Fair Use</h4>
                  <p>Automated scraping, unauthorized penetration testing, reverse engineering, or sending unsolicited spam through integrated WhatsApp features is strictly prohibited.</p>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setTermsModalOpen(false)}>
              Close &amp; Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" /> Privacy Policy
            </DialogTitle>
            <DialogDescription className="text-xs">
              How your workspace, customer data, and business records are protected.
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-slate-700 dark:text-muted-foreground space-y-3 leading-relaxed py-2">
            {settings.privacy_policy?.trim() ? (
              <p className="whitespace-pre-line bg-muted/30 p-3.5 rounded-xl border">
                {settings.privacy_policy}
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">1. Data Ownership &amp; Privacy</h4>
                  <p>We value your privacy. All customer contact details, lead pipelines, appointment schedules, GST billing records, and financial balance sheets remain 100% your private property.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">2. Tenant Database Isolation</h4>
                  <p>Each tenant workspace operates inside a strictly isolated data partition. No other business or third party has access to your customer base or business performance metrics.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">3. Security &amp; Encryption</h4>
                  <p>We employ industry-standard 256-bit encryption in transit, hashed passwords, and secure session management to ensure your enterprise records are protected around the clock.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">4. No Data Selling</h4>
                  <p>We never sell, rent, or monetize your customer lists or business data to advertisers or third-party brokers.</p>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setPrivacyModalOpen(false)}>
              Close &amp; Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
