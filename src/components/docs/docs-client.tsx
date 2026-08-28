"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Users,
  CalendarClock,
  FileText,
  Receipt,
  Package,
  Wallet,
  Settings,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Printer,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Layers,
  Building,
  UserCheck,
  Code2,
  FileCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SessionPayload } from "@/lib/types";

export function DocsClient({ session }: { session: SessionPayload }) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("quickstart");

  const sections = [
    { id: "quickstart", label: "Quick Start", icon: Sparkles },
    { id: "roles", label: "User Roles & Access", icon: ShieldCheck },
    { id: "customers", label: "Customers & Leads", icon: Users },
    { id: "appointments", label: "Appointments & WhatsApp", icon: CalendarClock },
    { id: "quotations", label: "Quotations / Proforma", icon: FileText },
    { id: "bills", label: "Bills & Invoices", icon: Receipt },
    { id: "products", label: "Products & Stock", icon: Package },
    { id: "ledger", label: "Ledger & Finance", icon: Wallet },
    { id: "whatsapp", label: "WhatsApp Setup", icon: MessageSquare },
    { id: "superadmin", label: "Super Admin Guide", icon: Building },
    { id: "faq", label: "FAQs & Support", icon: HelpCircle },
  ];

  const handlePrintDocs = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 sm:p-8 border border-primary/20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                <BookOpen className="size-3.5" /> Official Guide &amp; Knowledge Base
              </Badge>
              <Badge variant="secondary" className="text-[10px]">v2.0 Documentation</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
              Taff Desk CRM Documentation
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Complete user manual and guide for managing customer leads, 1-click WhatsApp reminders, GST billing, quotations, ledger, and multi-tenant SaaS permissions.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handlePrintDocs} className="gap-1.5 text-xs">
              <Printer className="size-4" /> Print Guide
            </Button>
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 text-xs font-semibold">
                Go to Dashboard <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-6 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documentation (e.g. GST Invoicing, WhatsApp, Quotations, RBAC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-background/80 backdrop-blur-sm border-border/80 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Main Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Horizontal Navigation List */}
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <TabsList className="flex w-max h-auto p-1 gap-1 bg-muted/60 rounded-xl border">
            {sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <TabsTrigger
                  key={sec.id}
                  value={sec.id}
                  className="gap-1.5 text-xs py-2 px-3 data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-lg transition-all"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{sec.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab 1: Quick Start */}
        <TabsContent value="quickstart" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="size-5 text-primary" /> Welcome to Taff Desk CRM
              </CardTitle>
              <CardDescription>
                Taff Desk CRM is a modern, fast, all-in-one Business CRM and GST Invoicing platform tailored for growing Indian businesses, distributors, manufacturers, and service agencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
                  <h3 className="font-semibold text-sm">Set Up Business Profile</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Go to <strong>Settings ➔ Invoice &amp; Bank</strong> to add your GSTIN, PAN, Business Logo, Address, and Bank Details for professional invoices.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">2</div>
                  <h3 className="font-semibold text-sm">Add Leads &amp; Products</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Add customer profiles under <strong>Customers</strong> and catalogue your products/services with price &amp; HSN under <strong>Products</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">3</div>
                  <h3 className="font-semibold text-sm">1-Click WhatsApp &amp; Invoices</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Schedule appointments, send automated WhatsApp reminders, and generate official GST Quotations &amp; Tax Invoices in seconds.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <h4 className="font-bold text-sm text-foreground uppercase tracking-wider text-xs">Core Modules Sitemap</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Link href="/customers" className="p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors flex items-center justify-between">
                    <span className="font-semibold">👥 Customers</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                  <Link href="/appointments" className="p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors flex items-center justify-between">
                    <span className="font-semibold">📅 Appointments</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                  <Link href="/quotations" className="p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors flex items-center justify-between">
                    <span className="font-semibold">📄 Quotations</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                  <Link href="/bills" className="p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors flex items-center justify-between">
                    <span className="font-semibold">🧾 Bills &amp; Invoices</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: User Roles & Access */}
        <TabsContent value="roles" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-5 text-primary" /> Role-Based Access Control (RBAC)
              </CardTitle>
              <CardDescription>
                Taff Desk CRM operates on a secure multi-tenant architecture with three distinct user roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Role 1: Super Admin */}
                <div className="p-4 rounded-xl border bg-purple-500/5 border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                      <Building className="size-4" /> Super Admin (`super_admin`)
                    </h3>
                    <Badge variant="secondary">Global SaaS Owner</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Manages the entire SaaS CRM system. Access to SaaS Revenue Analytics, Tenants &amp; Admins Account Management, Plan Expiries, Subscription Pricing &amp; UPI QR, Live Broadcast System Announcements, and Global SEO/HTML Script Injection.
                  </p>
                </div>

                {/* Role 2: Tenant Admin */}
                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                      <UserCheck className="size-4" /> Tenant Admin (`admin`)
                    </h3>
                    <Badge variant="default">Business Owner</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Full control over their isolated tenant business workspace. Manages Customers, Appointments, Quotations, GST Bills, Stock/Products, Financial Ledger, Team Executives (`/team`), Business Branding &amp; WhatsApp Gateway API settings.
                  </p>
                </div>

                {/* Role 3: Executive */}
                <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <Users className="size-4" /> Team Executive (`executive`)
                    </h3>
                    <Badge variant="outline">Staff / Sales Agent</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Handles assigned customer leads, schedules appointments, and creates quotations/bills based on permissions granted by the Tenant Admin under Team Management (`/team`).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Customers & Leads */}
        <TabsContent value="customers" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="size-5 text-primary" /> Customer &amp; Lead Management (`/customers`)
              </CardTitle>
              <CardDescription>
                Centralized customer directory with instant search, date filters, and 360-degree customer financial profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border space-y-2">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" /> Adding &amp; Editing Customers
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Click <strong>+ Add Customer</strong> to record customer name, phone number, email, address, and GSTIN.</li>
                    <li>Search instantly by name, phone number, or company address.</li>
                    <li>Filter records by creation date ranges (Today, This Month, Custom Date Range).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border space-y-2">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" /> Customer 360° Profile Dialog
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Clicking any customer name opens their comprehensive 360° modal profile.</li>
                    <li>View total lifetime revenue spent, total paid, and total balance due.</li>
                    <li>Inspect all linked Appointments, Quotations, and GST Invoices in one view.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Appointments & WhatsApp */}
        <TabsContent value="appointments" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="size-5 text-primary" /> Appointments &amp; WhatsApp Reminders (`/appointments`)
              </CardTitle>
              <CardDescription>
                Schedule service bookings and trigger automated 1-click WhatsApp notifications to your clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <h4 className="font-bold text-sm text-foreground">Appointment Workflow &amp; 1-Click Conversions:</h4>
                <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
                  <li><strong>Schedule Appointment:</strong> Select customer, service item, date, time slot, and status (`scheduled`, `completed`, `cancelled`).</li>
                  <li><strong>1-Click WhatsApp Reminder:</strong> Click the 🟢 <strong>WhatsApp</strong> button on any appointment to auto-fill custom client message with date &amp; time.</li>
                  <li><strong>Convert to Quotation / Bill:</strong> Click 📄 <strong>Generate Quotation</strong> or 🧾 <strong>Generate Bill</strong> directly from the appointment to auto-fill customer &amp; item details into the invoice generator.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Quotations */}
        <TabsContent value="quotations" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="size-5 text-primary" /> Quotations &amp; Proforma Invoices (`/quotations`)
              </CardTitle>
              <CardDescription>
                Create professional price quotes, dispatch orders, and editable proforma invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border space-y-2">
                  <h4 className="font-bold text-sm text-foreground">Creating &amp; Editing Quotations</h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Auto-generates sequential document numbers (e.g. `QT-2026-0001`).</li>
                    <li>Add multiple product line items with HSN/SKU, quantity, unit price, discounts, and taxes.</li>
                    <li>Record dispatch &amp; transport details (Book To, Transport Name, GR No, Vehicle No).</li>
                    <li>Click ✏️ <strong>Edit Quotation</strong> to update items or prices anytime.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border space-y-2">
                  <h4 className="font-bold text-sm text-foreground">Print, PDF &amp; Convert to Bill</h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Click 🖨️ <strong>View / Print</strong> to preview the official printable quotation with company logo &amp; signature.</li>
                    <li>Click 🧾 <strong>Generate Bill</strong> to instantly convert the accepted quotation into a Tax Invoice.</li>
                    <li>Manage quotation status: <code>pending</code>, <code>accepted</code>, <code>rejected</code>, or move to Trash.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Bills & Invoices */}
        <TabsContent value="bills" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="size-5 text-primary" /> Bills &amp; Tax Invoices (`/bills`)
              </CardTitle>
              <CardDescription>
                GST-compliant tax invoicing with payment tracking, customizable templates, and trash recovery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
                <h4 className="font-bold text-sm text-foreground">Invoice Features &amp; Templates:</h4>
                <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground">
                  <li><strong>4 Printable Templates:</strong> Switch between <em>Modern</em>, <em>Classic</em>, <em>Minimal</em>, and <em>Compact</em> invoice formats under Settings.</li>
                  <li><strong>Payment Status Tracking:</strong> Track <code>paid</code>, <code>partial</code>, and <code>unpaid</code> invoices. Record partial payments with date &amp; payment method.</li>
                  <li><strong>Automatic Financial Ledger:</strong> Every paid bill automatically posts a credit transaction to your business Balance Sheet.</li>
                  <li><strong>Trash &amp; Bulk Recovery:</strong> Soft-deleted invoices can be restored from the <strong>Trash</strong> tab anytime.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Products & Stock */}
        <TabsContent value="products" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="size-5 text-primary" /> Products &amp; Stock Management (`/products`)
              </CardTitle>
              <CardDescription>
                Catalogue your product inventory and service list with prices and HSN codes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                Add product titles, SKU / HSN codes, default selling prices, stock quantities, and categories. When creating Quotations or Bills, selecting a product automatically pre-fills the HSN code and unit price for fast billing.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 8: Ledger & Finance */}
        <TabsContent value="ledger" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="size-5 text-primary" /> Balance Sheet &amp; Financial Ledger (`/balance-sheet`)
              </CardTitle>
              <CardDescription>
                Track income, business expenses, net profit, and running account balances.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                The financial ledger records all business income (sales invoices, customer payments) and manual expenses (supplier payments, rent, salaries, office supplies). Filter by date ranges and export transactions to CSV.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 9: WhatsApp Gateway */}
        <TabsContent value="whatsapp" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="size-5 text-primary" /> WhatsApp Gateway Integration Setup
              </CardTitle>
              <CardDescription>
                Configure automated WhatsApp messaging providers under Settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <h4 className="font-bold text-sm text-foreground">Supported Providers:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
                  <Badge variant="outline" className="p-2 justify-center">UltraMsg</Badge>
                  <Badge variant="outline" className="p-2 justify-center">GreenAPI</Badge>
                  <Badge variant="outline" className="p-2 justify-center">WATI</Badge>
                  <Badge variant="outline" className="p-2 justify-center">Twilio</Badge>
                </div>
                <p className="text-muted-foreground pt-2">
                  If set to <em>None (Direct Web Intent)</em>, clicking the WhatsApp button opens WhatsApp Web / App directly on your device with pre-filled message text.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 10: Super Admin Guide */}
        <TabsContent value="superadmin" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="size-5 text-purple-600 dark:text-purple-400" /> Super Admin Management &amp; SEO Controls
              </CardTitle>
              <CardDescription>
                Complete administration guide for global SaaS tenant management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border space-y-2">
                  <h4 className="font-bold text-sm text-foreground">SaaS Revenue &amp; Tenant Expiries</h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li><strong>SaaS Dashboard:</strong> Monitor total SaaS revenue, active tenant counts, and plan breakdown.</li>
                    <li><strong>Tenants &amp; Admins:</strong> Create new tenant accounts, edit subscription plan tiers, extend expiry dates, or login as tenant.</li>
                    <li><strong>Upcoming Expiries (7d):</strong> Real-time tracking of tenant subscriptions nearing expiration.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border space-y-2">
                  <h4 className="font-bold text-sm text-foreground">SEO &amp; Custom Script Injector</h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li><strong>SEO Meta Information:</strong> Configure Meta Title, Description, and multi-line Meta Keywords.</li>
                    <li><strong>Schema.org JSON-LD:</strong> Built-in 1-click <code>Insert Sample Schema</code> for Google rich search snippets.</li>
                    <li><strong>Script Injector:</strong> Paste Google Analytics / GTM into <code>&lt;head&gt;</code> and Live Chat widgets into <code>&lt;body&gt;</code>.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 11: FAQ */}
        <TabsContent value="faq" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="size-5 text-primary" /> Frequently Asked Questions (FAQ)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg border bg-card space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Q: How do I change the primary accent color or theme?</h4>
                  <p className="text-muted-foreground">
                    Go to <strong>Settings ➔ Appearance</strong> to select your preferred accent color preset (Blue, Violet, Emerald, Amber, Rose, Indigo) or toggle between Light and Dark mode.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border bg-card space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Q: Can I edit an existing Quotation after generating it?</h4>
                  <p className="text-muted-foreground">
                    Yes! Click the <code>⋮</code> menu on any quotation and select <strong>Edit Quotation</strong> or click <strong>Edit Quotation</strong> inside the print preview window.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border bg-card space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Q: How do I backup or export my data?</h4>
                  <p className="text-muted-foreground">
                    All tables (Customers, Appointments, Quotations, Bills, Ledger) feature built-in CSV Export buttons.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
