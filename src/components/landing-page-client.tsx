"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
  Users,
  CalendarClock,
  Receipt,
  Package,
  BarChart3,
  ShieldCheck,
  Wallet,
  ArrowRight,
  ChevronDown,
  Star,
  Loader2,
  Zap,
  TrendingUp,
  CreditCard,
  BadgePercent,
  Coins,
  Cpu,
  Layers,
  Rocket,
  Scale,
  SlidersHorizontal,
  HelpCircle,
  MessageSquare,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PricingSettings = {
  site_name: string;
  yearly_plan_price: string;
  three_year_plan_price: string;
  lifetime_plan_price: string;
  trial_max_executives: string;
  trial_max_customers: string;
  yearly_max_executives: string;
  yearly_max_customers: string;
  three_year_max_executives: string;
  three_year_max_customers: string;
  lifetime_max_executives: string;
  lifetime_max_customers: string;
};

const DEFAULT_PRICING: PricingSettings = {
  site_name: "Taff Desk CRM",
  yearly_plan_price: "4999",
  three_year_plan_price: "11999",
  lifetime_plan_price: "24999",
  trial_max_executives: "2",
  trial_max_customers: "50",
  yearly_max_executives: "10",
  yearly_max_customers: "1000",
  three_year_max_executives: "25",
  three_year_max_customers: "5000",
  lifetime_max_executives: "-1",
  lifetime_max_customers: "-1",
};

function formatLimitText(val: string | number, singular: string, plural: string, prefix = ""): string {
  const num = Number(val);
  if (isNaN(num) || num === -1) {
    return `Unlimited ${plural} (∞)`;
  }
  return `${prefix}${num.toLocaleString("en-IN")} ${num === 1 ? singular : plural}`;
}

function formatPrice(val: string | number): string {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
}

export function LandingPageClient() {
  const [settings, setSettings] = React.useState<PricingSettings>(DEFAULT_PRICING);
  const [loading, setLoading] = React.useState(true);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/public/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.error("Failed to load live settings:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  function toggleFaq(index: number) {
    setOpenFaq((prev) => (prev === index ? null : index));
  }

  const yearlyPriceNum = Number(settings.yearly_plan_price || 4999);
  const threeYearPriceNum = Number(settings.three_year_plan_price || 11999);
  const lifetimePriceNum = Number(settings.lifetime_plan_price || 24999);
  const threeYearPerYear = Math.round(threeYearPriceNum / 3);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <LayoutDashboard className="size-5" />
            </div>
            <span className="text-sm sm:text-lg font-bold tracking-tight text-foreground truncate">
              {settings.site_name || "Taff Desk CRM"}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#comparison" className="hover:text-foreground transition-colors">Comparison</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm font-semibold px-2 sm:px-3">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-xs sm:text-sm font-semibold px-3 sm:px-4 shadow-md">
              <Link href="/register">
                Register
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-6 pb-8 sm:pt-20 sm:pb-24 bg-gradient-to-b from-primary/10 via-background to-background border-b border-border/40">
          {/* Ambient Radial Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-purple-500/10 to-transparent blur-3xl opacity-70 pointer-events-none" />

          {/* Decorative Floating Background Icons */}
          <Zap className="size-8 text-amber-500/25 absolute top-16 left-6 sm:left-20 animate-float-slow pointer-events-none hidden sm:block" />
          <Sparkles className="size-8 text-primary/25 absolute top-24 right-6 sm:right-20 animate-float-reverse pointer-events-none hidden sm:block" />
          <TrendingUp className="size-7 text-emerald-500/25 absolute bottom-24 left-8 sm:left-28 animate-float-reverse pointer-events-none hidden sm:block" />
          <ShieldCheck className="size-7 text-purple-500/25 absolute bottom-28 right-8 sm:right-28 animate-float-slow pointer-events-none hidden sm:block" />

          <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-4 sm:space-y-6">
            {/* Pulsing Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
              </span>
              <span>14-Day Free Trial · No Credit Card Required</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.15]">
              The All-In-One CRM Built for <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Growing Businesses &amp; Teams
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mx-auto max-w-2xl text-sm sm:text-lg text-muted-foreground leading-relaxed">
              Streamline customer leads, appointments, 1-click WhatsApp reminders, GST billing, inventory, balance sheets, and team permissions in one clean dashboard.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" asChild className="w-full sm:w-auto text-sm font-bold gap-2 px-8 h-12 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.02] transition-all duration-200">
                <Link href="/register">
                  Start 14-Day Free Trial <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto text-sm font-semibold h-12 border-border/80 bg-background/80 backdrop-blur-xs hover:bg-muted">
                <Link href="/login">Sign In / Demo Login</Link>
              </Button>
            </div>

            {/* Interactive Live CRM Preview Card */}
            <div className="pt-4 sm:pt-8 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-border/80 bg-card/90 shadow-2xl p-4 sm:p-6 backdrop-blur-md space-y-4 hover:border-primary/40 transition-colors duration-300">
                <div className="flex items-center justify-between border-b border-border/50 pb-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="font-semibold text-foreground ml-2">{settings.site_name || "Taff Desk CRM"} Live Dashboard</span>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Real-Time Analytics
                  </span>
                </div>

                {/* Dashboard Quick Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <span className="text-[11px] text-muted-foreground font-medium">Monthly Revenue</span>
                    <p className="text-base sm:text-lg font-bold font-mono text-primary mt-0.5">₹1,48,500</p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+18.4% this month</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <span className="text-[11px] text-muted-foreground font-medium">Active Leads</span>
                    <p className="text-base sm:text-lg font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">142</p>
                    <span className="text-[10px] text-muted-foreground">+12 new today</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-[11px] text-muted-foreground font-medium">Upcoming Visits</span>
                    <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">8 Today</p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Next 5 Days Filter</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <span className="text-[11px] text-muted-foreground font-medium">WhatsApp Reminders</span>
                    <p className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">94 Sent</p>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">1-Click Automated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stylized Feature Chips */}
            <div className="pt-4 sm:pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 transition-colors">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Instant Self Setup</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 transition-colors">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>WhatsApp 1-Click</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 transition-colors">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>GST Billing & Invoices</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 transition-colors">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Isolated Security</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section id="pricing" className="relative overflow-hidden py-8 sm:py-24 container mx-auto max-w-7xl px-4 sm:px-6">
          {/* Floating Background Icons */}
          <CreditCard className="size-8 text-primary/20 absolute top-12 left-4 sm:left-12 animate-float-slow pointer-events-none hidden sm:block" />
          <BadgePercent className="size-8 text-purple-500/20 absolute top-20 right-4 sm:right-12 animate-float-reverse pointer-events-none hidden sm:block" />
          <Coins className="size-7 text-emerald-500/20 absolute bottom-12 left-6 sm:left-16 animate-float-reverse pointer-events-none hidden sm:block" />
          <div className="text-center space-y-3 mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
              </span>
              <span>Simple &amp; Transparent Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Choose the Perfect Plan for Your Business
            </h2>
            <p className="text-xs sm:text-base text-muted-foreground max-w-xl mx-auto">
              Start with a 14-day free trial. Upgrade anytime as your team and customer base grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            {/* Card 1: Trial Plan */}
            <Card className="group relative flex flex-col justify-between p-6 border-border/80 bg-card/80 backdrop-blur-md shadow-xs hover:-translate-y-1 hover:border-border hover:shadow-md transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-semibold text-[11px] px-2.5 py-0.5">
                    14-Day Trial
                  </Badge>
                  <Zap className="size-5 text-amber-500/70 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Free Trial</h3>
                  <CardDescription className="text-xs mt-0.5">Perfect for exploring {settings.site_name || "Taff Desk CRM"} features.</CardDescription>
                </div>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl font-extrabold tracking-tight font-mono">₹0</span>
                  <span className="text-xs text-muted-foreground">/ 14 days</span>
                </div>
                <ul className="space-y-2.5 text-xs text-muted-foreground pt-4 border-t border-border/40">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>{formatLimitText(settings.trial_max_executives, "Executive Account", "Executive Accounts")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>{formatLimitText(settings.trial_max_customers, "Customer Record", "Customer Records")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>Appointments &amp; Next 5 Days Filter</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>WhatsApp 1-Click Reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>GST Invoicing &amp; Thermal Receipts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>Inventory &amp; Low Stock Reorder Alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>Balance Sheet &amp; Customer Ledgers</span>
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full mt-6 text-xs font-bold gap-2" variant="outline">
                <Link href="/register">
                  Start 14-Day Free Trial <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </Card>

            {/* Card 2: Yearly Plan (Most Popular) */}
            <Card className="group relative flex flex-col justify-between p-6 border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl hover:-translate-y-1 hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 md:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-primary via-purple-600 to-indigo-600 text-primary-foreground font-bold text-[11px] px-3.5 py-1 shadow-md flex items-center gap-1.5">
                  <Star className="size-3 fill-current" /> Most Popular Plan
                </Badge>
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[11px] px-2.5 py-0.5 bg-primary/5">
                    Yearly Pass
                  </Badge>
                  <TrendingUp className="size-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-primary flex items-center gap-1.5">
                    Yearly Plan <Sparkles className="size-4" />
                  </h3>
                  <CardDescription className="text-xs mt-0.5">Comprehensive solution for active sales &amp; billing teams.</CardDescription>
                </div>
                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight font-mono text-foreground">
                      ₹{formatPrice(yearlyPriceNum)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">/ year</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Save over 40% vs monthly billing
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs text-muted-foreground pt-4 border-t border-primary/20">
                  <li className="flex items-center gap-2 text-foreground font-bold">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>{formatLimitText(settings.yearly_max_executives, "Executive Account", "Executive Accounts")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-bold">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>{formatLimitText(settings.yearly_max_customers, "Customer Record", "Customer Records")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>Full Appointments &amp; Reminders</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>WhatsApp 1-Click Reminders</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>GST Invoicing &amp; Thermal Receipts</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>Inventory &amp; Low Stock Alerts</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span>Balance Sheet &amp; Customer Ledgers</span>
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full mt-6 text-xs font-bold gap-2 shadow-lg shadow-primary/25">
                <Link href="/register">
                  Get Yearly Plan <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </Card>

            {/* Card 3: 3-Year Plan */}
            <Card className="group relative flex flex-col justify-between p-6 border-purple-500/30 bg-gradient-to-br from-card via-card to-purple-500/5 shadow-xs hover:-translate-y-1 hover:border-purple-500/60 hover:shadow-md transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold text-[11px] px-2.5 py-0.5 bg-purple-500/5">
                    3-Year Value
                  </Badge>
                  <Rocket className="size-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">3-Year Plan</h3>
                  <CardDescription className="text-xs mt-0.5">Maximum savings &amp; stability for growing enterprises.</CardDescription>
                </div>
                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold tracking-tight font-mono text-foreground">
                      ₹{formatPrice(threeYearPriceNum)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 3 years</span>
                  </div>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
                    Only ₹{formatPrice(threeYearPerYear)}/year (Best Value)
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs text-muted-foreground pt-4 border-t border-purple-500/20">
                  <li className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>{formatLimitText(settings.three_year_max_executives, "Executive Account", "Executive Accounts")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>{formatLimitText(settings.three_year_max_customers, "Customer Record", "Customer Records")}</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Full WhatsApp Integration</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Advanced SM Analytics &amp; Reports</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Balance Sheet &amp; Customer Ledgers</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Priority 24/7 Support</span>
                  </li>
                </ul>
              </div>
              <Button asChild variant="outline" className="w-full mt-6 text-xs font-bold gap-2 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10">
                <Link href="/register">
                  Get 3-Year Plan <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </Card>
          </div>
        </section>

        {/* Feature Breakdown Section */}
        <section id="features" className="relative overflow-hidden py-8 sm:py-24 bg-muted/30 border-y border-border/60">
          {/* Floating Background Icons */}
          <Cpu className="size-8 text-primary/20 absolute top-12 left-4 sm:left-16 animate-float-slow pointer-events-none hidden sm:block" />
          <Layers className="size-8 text-indigo-500/20 absolute top-16 right-4 sm:right-16 animate-float-reverse pointer-events-none hidden sm:block" />
          <Rocket className="size-7 text-sky-500/20 absolute bottom-12 right-8 sm:right-24 animate-float-slow pointer-events-none hidden sm:block" />
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center space-y-3 mb-6 sm:mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-md">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
                </span>
                <span>Powerful Capabilities</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Everything You Need to Run Your Business
              </h2>
              <p className="text-xs sm:text-base text-muted-foreground max-w-xl mx-auto">
                No third-party plugins required. Every tool is built directly into {settings.site_name || "Taff Desk CRM"}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <Card className="group gap-0 p-5 sm:p-6 border-border/80 bg-card shadow-2xs hover:-translate-y-1 hover:border-primary/60 hover:ring-2 hover:ring-primary/15 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ease-out">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Users className="size-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-primary transition-colors duration-200">360° Lead &amp; Customer Directory</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                  Track customer statuses (Lead, Progress, Active, Inactive, Trash), visited indicators, complete transaction history, CSV import/export, and search filters.
                </p>
              </Card>

              {/* Feature 2 */}
              <Card className="group gap-0 p-5 sm:p-6 border-border/80 bg-card shadow-2xs hover:-translate-y-1 hover:border-purple-500/60 hover:ring-2 hover:ring-purple-500/15 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 ease-out">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                    <CalendarClock className="size-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">Appointments &amp; 1-Click WhatsApp</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                  Filter upcoming visits by Today, Tomorrow, and Next 5 Days (ordered nearest date first). Trigger pre-filled WhatsApp follow-up reminders instantly.
                </p>
              </Card>

              {/* Feature 3 */}
              <Card className="group gap-0 p-5 sm:p-6 border-border/80 bg-card shadow-2xs hover:-translate-y-1 hover:border-emerald-500/60 hover:ring-2 hover:ring-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 ease-out">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <Receipt className="size-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">GST Billing &amp; Printable Invoices</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                  Create official GST invoices, manage Paid/Unpaid/Partial payment statuses, and print clean thermal or full-page tax receipts with your branding.
                </p>
              </Card>

              {/* Feature 4 */}
              <Card className="group gap-0 p-5 sm:p-6 border-border/80 bg-card shadow-2xs hover:-translate-y-1 hover:border-amber-500/60 hover:ring-2 hover:ring-amber-500/15 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 ease-out">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                    <Package className="size-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200">Inventory &amp; Reorder Alerts</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                  Real-time stock valuation, cost vs selling price calculations, potential &amp; realized profit analytics, and automated low stock alerts.
                </p>
              </Card>

              {/* Feature 5 */}
              <Card className="group gap-0 p-5 sm:p-6 border-border/80 bg-card shadow-2xs hover:-translate-y-1 hover:border-sky-500/60 hover:ring-2 hover:ring-sky-500/15 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300 ease-out">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20 shrink-0 group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all duration-300">
                    <BarChart3 className="size-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors duration-200">SM Analytics &amp; Lead Tracking</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                  Log executive social media performance, track enquiries, post activity, and generate real-time visual revenue analytics dashboards.
                </p>
              </Card>

              {/* Feature 6 */}
              <Card className="group gap-0 p-5 sm:p-6 border-border/80 bg-card shadow-2xs hover:-translate-y-1 hover:border-indigo-500/60 hover:ring-2 hover:ring-indigo-500/15 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 ease-out">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Wallet className="size-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">Balance Sheet &amp; Customer Ledgers</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                  Maintain real-time double-entry ledgers, track customer debit &amp; credit balances, record payments, and sync accounts automatically.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table Section */}
        <section id="comparison" className="relative overflow-hidden py-8 sm:py-24 container mx-auto max-w-5xl px-4 sm:px-6">
          {/* Floating Background Icons */}
          <Scale className="size-8 text-primary/20 absolute top-12 left-4 sm:left-12 animate-float-slow pointer-events-none hidden sm:block" />
          <SlidersHorizontal className="size-8 text-purple-500/20 absolute top-20 right-4 sm:right-12 animate-float-reverse pointer-events-none hidden sm:block" />
          <div className="text-center space-y-3 mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
              </span>
              <span>Plan Comparison</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Compare All Plan Features Side-by-Side
            </h2>
          </div>

          {/* Mobile Plan Feature Selector (No horizontal drag needed) */}
          <div className="block sm:hidden">
            <Tabs defaultValue="yearly" className="w-full">
              <TabsList className="grid grid-cols-3 w-full h-auto p-1 bg-muted/80 rounded-xl mb-4">
                <TabsTrigger value="trial" className="text-xs font-semibold py-2">
                  Trial
                </TabsTrigger>
                <TabsTrigger value="yearly" className="text-xs font-bold py-2 text-primary">
                  Yearly ⭐
                </TabsTrigger>
                <TabsTrigger value="three_year" className="text-xs font-semibold py-2">
                  3-Year
                </TabsTrigger>
              </TabsList>

              {/* Trial Plan Mobile Card */}
              <TabsContent value="trial">
                <Card className="p-4 border-border/80 bg-card shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
                    <div>
                      <p className="font-bold text-base">Free Trial</p>
                      <p className="text-xs text-muted-foreground">14 Days Access</p>
                    </div>
                    <Badge variant="secondary">Free</Badge>
                  </div>
                  <ul className="space-y-2.5 text-xs">
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Executive Accounts</span>
                      <span className="font-semibold">{formatLimitText(settings.trial_max_executives, "Exec", "Execs")}</span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Customer Records Limit</span>
                      <span className="font-semibold">{formatLimitText(settings.trial_max_customers, "Customer", "Customers")}</span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Appointments &amp; Next 5 Days Filter</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">WhatsApp 1-Click Reminders</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">GST Invoicing &amp; Thermal Receipts</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Inventory &amp; Low Stock Alerts</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Balance Sheet &amp; Ledgers</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground font-medium">Support Level</span>
                      <span className="text-muted-foreground font-medium">Community</span>
                    </li>
                  </ul>
                </Card>
              </TabsContent>

              {/* Yearly Plan Mobile Card */}
              <TabsContent value="yearly">
                <Card className="p-4 border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-3 mb-3">
                    <div>
                      <p className="font-bold text-base text-primary flex items-center gap-1">
                        Yearly Plan ⭐
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">₹{formatPrice(yearlyPriceNum)} / year</p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground font-bold">Most Popular</Badge>
                  </div>
                  <ul className="space-y-2.5 text-xs">
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Executive Accounts</span>
                      <span className="font-bold text-primary">{formatLimitText(settings.yearly_max_executives, "Exec", "Execs")}</span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Customer Records Limit</span>
                      <span className="font-bold text-primary">{formatLimitText(settings.yearly_max_customers, "Customer", "Customers")}</span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Appointments &amp; Next 5 Days Filter</span>
                      <CheckCircle2 className="size-4 text-primary" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">WhatsApp 1-Click Reminders</span>
                      <CheckCircle2 className="size-4 text-primary" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">GST Invoicing &amp; Thermal Receipts</span>
                      <CheckCircle2 className="size-4 text-primary" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Inventory &amp; Low Stock Alerts</span>
                      <CheckCircle2 className="size-4 text-primary" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Balance Sheet &amp; Ledgers</span>
                      <CheckCircle2 className="size-4 text-primary" />
                    </li>
                    <li className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground font-medium">Support Level</span>
                      <span className="font-bold text-primary">Standard Support</span>
                    </li>
                  </ul>
                </Card>
              </TabsContent>

              {/* 3-Year Plan Mobile Card */}
              <TabsContent value="three_year">
                <Card className="p-4 border-purple-500/40 bg-gradient-to-br from-card via-card to-purple-500/5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3 mb-3">
                    <div>
                      <p className="font-bold text-base text-purple-600 dark:text-purple-400">
                        3-Year Plan
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">₹{formatPrice(threeYearPriceNum)} for 3 years</p>
                    </div>
                    <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 font-semibold">Best Value</Badge>
                  </div>
                  <ul className="space-y-2.5 text-xs">
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Executive Accounts</span>
                      <span className="font-bold">{formatLimitText(settings.three_year_max_executives, "Exec", "Execs")}</span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Customer Records Limit</span>
                      <span className="font-bold">{formatLimitText(settings.three_year_max_customers, "Customer", "Customers")}</span>
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Appointments &amp; Next 5 Days Filter</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">WhatsApp 1-Click Reminders</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">GST Invoicing &amp; Thermal Receipts</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Inventory &amp; Low Stock Alerts</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Balance Sheet &amp; Ledgers</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </li>
                    <li className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground font-medium">Support Level</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">Priority 24/7</span>
                    </li>
                  </ul>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/70 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Features</th>
                  <th className="p-4 text-center">Trial (14 Days)</th>
                  <th className="p-4 text-center text-primary font-bold">Yearly (₹{formatPrice(yearlyPriceNum)}) ⭐</th>
                  <th className="p-4 text-center">3-Year (₹{formatPrice(threeYearPriceNum)})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                <tr>
                  <td className="p-4 font-semibold">Executive Accounts</td>
                  <td className="p-4 text-center">{formatLimitText(settings.trial_max_executives, "Exec", "Execs")}</td>
                  <td className="p-4 text-center text-primary font-bold">{formatLimitText(settings.yearly_max_executives, "Exec", "Execs")}</td>
                  <td className="p-4 text-center">{formatLimitText(settings.three_year_max_executives, "Exec", "Execs")}</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Customer Records Limit</td>
                  <td className="p-4 text-center">{formatLimitText(settings.trial_max_customers, "Customer", "Customers")}</td>
                  <td className="p-4 text-center text-primary font-bold">{formatLimitText(settings.yearly_max_customers, "Customer", "Customers")}</td>
                  <td className="p-4 text-center">{formatLimitText(settings.three_year_max_customers, "Customer", "Customers")}</td>
                </tr>
                <tr>
                  <td className="p-4">Appointments &amp; Next 5 Days Filter</td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-primary inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                </tr>
                <tr>
                  <td className="p-4">WhatsApp 1-Click Reminders</td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-primary inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                </tr>
                <tr>
                  <td className="p-4">GST Invoicing &amp; Thermal Printable Receipts</td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-primary inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                </tr>
                <tr>
                  <td className="p-4">Inventory &amp; Low Stock Reorder Alerts</td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-primary inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                </tr>
                <tr>
                  <td className="p-4">Balance Sheet &amp; Ledgers</td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-primary inline" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="size-4 text-emerald-500 inline" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Support Level</td>
                  <td className="p-4 text-center text-muted-foreground">Community</td>
                  <td className="p-4 text-center text-primary font-bold">Standard Support</td>
                  <td className="p-4 text-center text-muted-foreground font-medium">Priority 24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="relative overflow-hidden py-8 sm:py-24 bg-muted/30 border-t border-border/60">
          {/* Floating Background Icons */}
          <HelpCircle className="size-8 text-primary/20 absolute top-16 left-4 sm:left-16 animate-float-slow pointer-events-none hidden sm:block" />
          <MessageSquare className="size-8 text-purple-500/20 absolute top-24 right-4 sm:right-16 animate-float-reverse pointer-events-none hidden sm:block" />
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 space-y-4 sm:space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-md">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
                </span>
                <span>Got Questions?</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-2 sm:space-y-2.5 max-w-3xl mx-auto">
              {[
                {
                  q: "What happens when my 14-day free trial ends?",
                  a: "Your data remains completely safe! When your trial ends, an account renewal screen will guide you to select your preferred paid plan (Yearly or 3-Year) to instantly reactivate access.",
                },
                {
                  q: "Do I need a credit card to sign up for the free trial?",
                  a: "No! You can register instantly without entering any credit card or payment details. Your 14-day free trial activates immediately upon sign up.",
                },
                {
                  q: "How does the 1-Click WhatsApp reminder feature work?",
                  a: `${settings.site_name || "Taff Desk CRM"} builds pre-formatted WhatsApp Web/App deep links with customer name, appointment time, and product details so your team can send reminders with a single click.`,
                },
                {
                  q: "Can I upgrade my plan later as my team grows?",
                  a: "Yes, absolutely! You can upgrade from Trial to Yearly or 3-Year at any time directly through the admin panel.",
                },
                {
                  q: "Is my customer data secure and private?",
                  a: `Yes! ${settings.site_name || "Taff Desk CRM"} employs strict multi-tenant data isolation. Each tenant's data is strictly scoped and encrypted so no other business can view your records.`,
                },
              ].map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <Card
                    key={i}
                    className={`gap-0 border-border/80 overflow-hidden transition-all duration-200 ${
                      isOpen ? "border-primary/50 shadow-xs bg-card" : "hover:border-border/90"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(i)}
                      className="w-full text-left px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between font-bold text-sm sm:text-base select-none gap-4 cursor-pointer focus:outline-none"
                    >
                      <span className={`font-heading ${isOpen ? "text-primary" : "text-foreground"}`}>{faq.q}</span>
                      <ChevronDown
                        className={`size-4 shrink-0 transition-transform duration-300 ease-in-out text-muted-foreground ${
                          isOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 pb-4 sm:px-5 sm:pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Banner Section */}
        <section className="relative overflow-hidden py-10 sm:py-24 bg-gradient-to-br from-slate-900 via-primary/95 to-purple-950 text-white border-y border-white/10">
          {/* Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 h-96 w-full max-w-4xl bg-primary/30 blur-3xl opacity-50 pointer-events-none rounded-full" />

          {/* Floating Background Icons */}
          <Flame className="size-9 text-amber-400/35 absolute top-10 left-6 sm:left-20 animate-float-slow pointer-events-none hidden sm:block" />
          <Sparkles className="size-9 text-white/35 absolute bottom-10 right-6 sm:right-20 animate-float-reverse pointer-events-none hidden sm:block" />

          <div className="relative z-10 container mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white shadow-xs backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400"></span>
              </span>
              <span>Instant 14-Day Setup · Upgrade Anytime</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Ready to Accelerate Your Sales Growth with {settings.site_name || "Taff Desk CRM"}?
            </h2>

            <p className="text-sm sm:text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of growing businesses managing leads, appointments, 1-click WhatsApp reminders, inventory, and GST billing seamlessly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto text-sm font-bold gap-2.5 px-8 h-12 shadow-2xl bg-white text-primary hover:bg-white/90 hover:scale-[1.02] transition-all duration-200">
                <Link href="/register">
                  Start Your 14-Day Free Trial <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto text-sm font-semibold h-12 border-white/30 text-white bg-white/10 backdrop-blur-xs hover:bg-white/20 hover:text-white">
                <Link href="/login">Explore Demo Login</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-105">
              <LayoutDashboard className="size-4.5" />
            </div>
            <span className="font-bold tracking-tight text-foreground text-sm">
              {settings.site_name || "Taff Desk CRM"}
            </span>
            <span className="text-muted-foreground text-xs font-normal ml-1">
              &copy; {new Date().getFullYear()} All rights reserved.
            </span>
          </Link>

          <div className="flex items-center gap-6 text-xs font-medium">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#comparison" className="hover:text-foreground transition-colors">Comparison</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
