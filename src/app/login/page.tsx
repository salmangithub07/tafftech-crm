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
  ShieldCheck, 
  Zap, 
  FileText, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle2, 
  Star,
  Lock,
  Mail,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not log in.");
        return;
      }
      toast.success(`Welcome back, ${data.name.split(" ")[0]}!`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
            <span>Next-Gen CRM & Billing Platform</span>
          </div>

          <h2 className="text-2xl lg:text-3xl 2xl:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-xs">
            Run your entire business operations with effortless <span className="bg-gradient-to-r from-amber-300 via-rose-200 to-purple-200 bg-clip-text text-transparent">automation</span>.
          </h2>

          <p className="text-xs lg:text-sm text-slate-200 leading-relaxed font-medium">
            Manage leads, automate WhatsApp communication, dispatch GST invoices, and track your financial balance sheet in real-time.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-md shadow-lg shadow-black/20 transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                <MessageSquare className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Automated WA Gateway</p>
                <p className="text-[11px] text-slate-300">Instant PDF invoice & appointment notifications</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-md shadow-lg shadow-black/20 transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/30 text-white border border-primary/40">
                <FileText className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">GST & Proforma Invoicing</p>
                <p className="text-[11px] text-slate-300">One-click quotation to bill with tax breakdown</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 backdrop-blur-md shadow-lg shadow-black/20 transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/30 text-amber-300 border border-amber-400/40">
                <Zap className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Realtime Balance Sheet</p>
                <p className="text-[11px] text-slate-300">Ledger accounting, cash & bank transactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof & Trust Footer */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              <div className="size-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-xs">RK</div>
              <div className="size-6 rounded-full bg-primary border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-xs">SA</div>
              <div className="size-6 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-xs">AK</div>
            </div>
            <span className="font-semibold text-white text-[11px] ml-1">5,000+ Businesses</span>
          </div>

          <div className="flex items-center gap-1 text-amber-300 font-bold text-[11px]">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span>4.9 / 5.0 Rating</span>
          </div>
        </div>
      </div>

      {/* Right Form Section — Vertically Centered with Modern Ambient Background */}
      <div className="relative flex-1 w-full md:col-span-7 flex flex-col justify-center items-center min-h-screen p-4 sm:p-6 lg:p-12 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/60 dark:from-background dark:to-muted/20 overflow-hidden">
        {/* Subtle Decorative Ambient Mesh Grid & Soft Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
        <div className="absolute top-0 right-0 size-80 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 size-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md space-y-6 my-auto py-8">
          {/* Top Navbar */}
          <div className="flex items-center justify-between w-full">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-muted transition-all border border-slate-200/80 dark:border-border/50 shadow-xs"
            >
              <ChevronLeft className="size-3.5" /> Back to Home
            </Link>
            <div className="text-xs text-muted-foreground">
              New here?{" "}
              <Link href="/register" className="font-bold text-primary hover:underline ml-1">
                Start Free Trial →
              </Link>
            </div>
          </div>

          {/* Mobile Brand Banner (<768px) */}
          <div className="flex flex-col items-center gap-2 text-center md:hidden">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-primary text-primary-foreground shadow-md">
              <LayoutDashboard className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to Taff Desk</h1>
            <p className="text-xs text-muted-foreground">The smart workspace to manage customers & appointments.</p>
          </div>

          {/* Desktop Heading (>=768px) */}
          <div className="hidden md:block space-y-1">
            <h1 className="text-2xl 2xl:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground">
              Enter your admin credentials to access your dashboard.
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 pl-10 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white dark:bg-muted/40 dark:focus:bg-background border-slate-200 dark:border-border rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pl-10 pr-11 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white dark:bg-muted/40 dark:focus:bg-background border-slate-200 dark:border-border rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
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

              <Button
                type="submit"
                className="w-full h-11 text-xs sm:text-sm font-bold bg-gradient-to-r from-primary via-rose-600 to-primary hover:opacity-95 text-white shadow-lg shadow-primary/25 rounded-xl gap-2 mt-2 group transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-100 dark:border-border/60 text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                Don&apos;t have a workspace account?{" "}
                <Link href="/register" className="font-bold text-primary hover:underline">
                  Create 14-Day Free Trial
                </Link>
              </p>
            </div>
          </div>

          {/* Bottom Trust & Footer Row */}
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] sm:text-xs text-slate-500 dark:text-muted-foreground">
            <div className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>256-bit Encrypted</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-primary" />
              <span>99.9% Uptime</span>
            </div>
            <span>•</span>
            <Link href="/" className="hover:text-foreground underline">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
