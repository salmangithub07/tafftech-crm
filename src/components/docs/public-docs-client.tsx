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
  Building,
  UserCheck,
  Code2,
  Share2,
  Bookmark,
  Info,
  Lightbulb,
  ArrowUpRight,
  Plus,
  Check,
  Eye,
  Pencil,
  Clock,
  XCircle,
  Globe,
  Terminal,
  Layers,
  Smartphone,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SessionPayload } from "@/lib/types";

type DocTopic = {
  id: string;
  category: "Getting Started" | "Core Modules" | "Finance & Billing" | "Integrations & Setup" | "Super Admin & SEO" | "Support";
  title: string;
  shortDesc: string;
  icon: any;
  sections: {
    id: string;
    title: string;
  }[];
};

const DOC_TOPICS: DocTopic[] = [
  {
    id: "getting-started",
    category: "Getting Started",
    title: "Quick Start & Overview",
    shortDesc: "Introduction to Taff Desk CRM, core features, and 3-step setup.",
    icon: Sparkles,
    sections: [
      { id: "overview", title: "System Overview" },
      { id: "setup-steps", title: "3-Step Initial Setup" },
      { id: "key-benefits", title: "Key Platform Benefits" },
    ],
  },
  {
    id: "roles-rbac",
    category: "Getting Started",
    title: "User Roles & Permissions",
    shortDesc: "Multi-tenant role definitions for Super Admin, Admin, and Staff.",
    icon: ShieldCheck,
    sections: [
      { id: "super-admin-role", title: "Super Admin (SaaS Owner)" },
      { id: "tenant-admin-role", title: "Tenant Admin (Business Owner)" },
      { id: "executive-role", title: "Executive (Sales Staff)" },
    ],
  },
  {
    id: "customers",
    category: "Core Modules",
    title: "Customers & Lead Management",
    shortDesc: "Managing client profiles, lead tracking, and Customer 360° views.",
    icon: Users,
    sections: [
      { id: "add-customer", title: "Adding & Editing Leads" },
      { id: "customer-search", title: "Searching & Filtering" },
      { id: "customer-360", title: "Customer 360° Financial Profile" },
    ],
  },
  {
    id: "appointments",
    category: "Core Modules",
    title: "Appointments & WhatsApp Reminders",
    shortDesc: "Service booking, scheduled time slots, and 1-click WhatsApp alerts.",
    icon: CalendarClock,
    sections: [
      { id: "schedule-appointment", title: "Scheduling Service Bookings" },
      { id: "whatsapp-reminders", title: "1-Click WhatsApp Reminders" },
      { id: "convert-appointment", title: "1-Click Invoice Conversion" },
    ],
  },
  {
    id: "quotations",
    category: "Core Modules",
    title: "Quotations & Proforma Invoices",
    shortDesc: "Auto-numbered quotes, line items, transport details, and edit mode.",
    icon: FileText,
    sections: [
      { id: "create-quotation", title: "Generating Official Quotations" },
      { id: "transport-details", title: "Transport & Dispatch Information" },
      { id: "edit-quotation", title: "Editing Existing Quotations" },
      { id: "print-quotation", title: "Print & PDF Preview" },
    ],
  },
  {
    id: "bills",
    category: "Finance & Billing",
    title: "Bills & GST Tax Invoices",
    shortDesc: "Tax invoicing, payment tracking, 4 print templates, and trash recovery.",
    icon: Receipt,
    sections: [
      { id: "create-bill", title: "Creating GST Tax Invoices" },
      { id: "invoice-templates", title: "4 Printable Invoice Templates" },
      { id: "payment-tracking", title: "Payment Status & Partial Payments" },
      { id: "trash-recovery", title: "Trash Management & Bulk Restore" },
    ],
  },
  {
    id: "products",
    category: "Finance & Billing",
    title: "Products & Stock Management",
    shortDesc: "Catalogue products, HSN/SKU codes, and auto-fill pricing.",
    icon: Package,
    sections: [
      { id: "add-product", title: "Adding Products & Stock" },
      { id: "hsn-auto-fill", title: "Automated HSN & Price Filling" },
    ],
  },
  {
    id: "ledger",
    category: "Finance & Billing",
    title: "Financial Ledger & Balance Sheet",
    shortDesc: "Income, business expense tracking, running balance, and CSV exports.",
    icon: Wallet,
    sections: [
      { id: "income-expenses", title: "Income & Expense Posting" },
      { id: "running-balance", title: "Running Account Balance" },
      { id: "csv-export", title: "Exporting Financial Records" },
    ],
  },
  {
    id: "whatsapp-setup",
    category: "Integrations & Setup",
    title: "WhatsApp Gateway Integration",
    shortDesc: "API integration with UltraMsg, GreenAPI, WATI, Twilio, or Web Intent.",
    icon: MessageSquare,
    sections: [
      { id: "api-providers", title: "Supported API Providers" },
      { id: "template-variables", title: "Custom Reminder Templates" },
    ],
  },
  {
    id: "superadmin",
    category: "Super Admin & SEO",
    title: "Super Admin SaaS & SEO Controls",
    shortDesc: "Tenant management, plan limits, broadcast alerts, and SEO scripts.",
    icon: Building,
    sections: [
      { id: "saas-analytics", title: "SaaS Revenue & Tenant Management" },
      { id: "broadcast-alerts", title: "Live System Announcements" },
      { id: "seo-scripts", title: "SEO Meta & Script Injector" },
    ],
  },
  {
    id: "faq",
    category: "Support",
    title: "Frequently Asked Questions (FAQ)",
    shortDesc: "Common user queries, browser compatibility, and troubleshooting.",
    icon: HelpCircle,
    sections: [
      { id: "faq-general", title: "General Questions" },
      { id: "faq-billing", title: "Billing & Quotations FAQ" },
      { id: "faq-troubleshoot", title: "Troubleshooting & Support" },
    ],
  },
];

/* Helper Component for Browser Framing Screenshot Mockups */
function BrowserScreenshotFrame({
  url,
  title,
  children,
}: {
  url: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border/80 bg-card shadow-md transition-all">
      {/* Browser Top Window Bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/70 px-4 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-rose-500/80 inline-block"></span>
          <span className="size-3 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="size-3 rounded-full bg-emerald-500/80 inline-block"></span>
          {title && <span className="ml-2 font-semibold text-muted-foreground hidden sm:inline">{title}</span>}
        </div>

        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-mono text-muted-foreground max-w-[260px] sm:max-w-[340px] truncate">
          <Globe className="size-3 shrink-0 text-primary" />
          <span className="truncate">{url}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <Badge variant="outline" className="text-[9px] py-0">UI Reference</Badge>
        </div>
      </div>

      {/* Screen Inner Content */}
      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/60 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

export function PublicDocsClient({ session }: { session: SessionPayload | null }) {
  const [selectedTopicId, setSelectedTopicId] = React.useState("getting-started");
  const [activeSectionId, setActiveSectionId] = React.useState("");
  const [filterQuery, setFilterQuery] = React.useState("");
  const [copiedLink, setCopiedLink] = React.useState(false);

  const activeTopic = DOC_TOPICS.find((t) => t.id === selectedTopicId) || DOC_TOPICS[0];

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const topicParam = params.get("topic");
      if (topicParam && DOC_TOPICS.some((t) => t.id === topicParam)) {
        setSelectedTopicId(topicParam);
      }
    }
  }, []);

  const filteredTopics = DOC_TOPICS.filter(
    (t) =>
      t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.shortDesc.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const categories = Array.from(new Set(DOC_TOPICS.map((t) => t.category)));

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopicId(topicId);
    setActiveSectionId("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("topic", topicId);
      window.history.pushState({}, "", url.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Documentation link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold shadow-sm group-hover:scale-105 transition-transform">
                T
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-base tracking-tight leading-none text-foreground">
                  Taff Desk CRM
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-primary uppercase mt-0.5">
                  Documentation &amp; Help Center
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search topics (e.g. GST, WhatsApp)..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-9 h-8 text-xs bg-muted/50 border-border/60"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyShareLink}
              className="hidden xs:flex gap-1.5 h-8 text-xs font-medium"
            >
              {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
              <span>{copiedLink ? "Copied" : "Share"}</span>
            </Button>

            {session ? (
              <Link href={session.role === "super_admin" ? "/admins" : "/dashboard"}>
                <Button size="sm" className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs">
                  Dashboard <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="h-8 px-3 text-xs font-semibold">
                    14 Days Free Trial
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3-COLUMN MAIN LAYOUT */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMN 1: LEFT NAVIGATION SIDEBAR (3 cols) */}
          <aside className="lg:col-span-3 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 space-y-6 scrollbar-thin">
            <div className="space-y-1">
              <div className="relative md:hidden mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Filter documentation topics..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-muted/50"
                />
              </div>

              {categories.map((cat) => {
                const catTopics = filteredTopics.filter((t) => t.category === cat);
                if (catTopics.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1 pt-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                      {cat}
                    </h3>
                    <div className="space-y-0.5">
                      {catTopics.map((topic) => {
                        const Icon = topic.icon;
                        const isSelected = selectedTopicId === topic.id;

                        return (
                          <button
                            key={topic.id}
                            onClick={() => handleTopicSelect(topic.id)}
                            className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className={`size-3.5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                              <span className="truncate">{topic.title}</span>
                            </div>
                            <ChevronRight className={`size-3 shrink-0 opacity-60 ${isSelected ? "text-primary-foreground" : ""}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* COLUMN 2: CENTER MAIN CONTENT AREA (6 cols) */}
          <main className="lg:col-span-6 space-y-8 min-w-0">
            {/* Topic Header */}
            <div className="space-y-3 pb-6 border-b border-border/60">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                <ChevronRight className="size-3" />
                <span>Docs</span>
                <ChevronRight className="size-3" />
                <span className="font-semibold text-primary">{activeTopic.category}</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
                  {activeTopic.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {activeTopic.shortDesc}
                </p>
              </div>
            </div>

            {/* Article Content & Screenshots */}
            <div className="space-y-10 text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {/* TOPIC 1: GETTING STARTED */}
              {selectedTopicId === "getting-started" && (
                <>
                  <section id="overview" className="space-y-3 scroll-mt-24">
                    <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" /> System Overview
                    </h2>
                    <p>
                      <strong>Taff Desk CRM</strong> is a high-performance, multi-tenant Business CRM &amp; GST Invoicing web application. It combines customer lead management, service appointment scheduling, 1-click WhatsApp reminders, proforma quotations, GST tax invoicing, inventory tracking, and team executive permissions into one unified platform.
                    </p>

                    <BrowserScreenshotFrame url="https://www.taffdesk.com/dashboard" title="Taff Desk Dashboard UI Preview">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground">Dashboard Analytics Preview</h4>
                          <Badge variant="success">Active Workspace</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 rounded-lg border bg-card">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Revenue</span>
                            <p className="text-base font-bold text-primary mt-1">₹1,48,900</p>
                          </div>
                          <div className="p-3 rounded-lg border bg-card">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Leads</span>
                            <p className="text-base font-bold text-foreground mt-1">753</p>
                          </div>
                          <div className="p-3 rounded-lg border bg-card">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Appointments</span>
                            <p className="text-base font-bold text-emerald-600 mt-1">582</p>
                          </div>
                          <div className="p-3 rounded-lg border bg-card">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Quotations</span>
                            <p className="text-base font-bold text-indigo-600 mt-1">316</p>
                          </div>
                        </div>
                      </div>
                    </BrowserScreenshotFrame>
                  </section>
                </>
              )}

              {/* TOPIC 2: USER ROLES */}
              {selectedTopicId === "roles-rbac" && (
                <>
                  <section id="super-admin-role" className="space-y-3 scroll-mt-24">
                    <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" /> Role Permissions Matrix
                    </h2>
                    <p>
                      Each role possesses dedicated capabilities designed to protect data privacy and streamline operations.
                    </p>

                    <BrowserScreenshotFrame url="https://www.taffdesk.com/team" title="Role-Based Permissions Matrix">
                      <div className="border rounded-lg overflow-hidden text-xs bg-card">
                        <div className="grid grid-cols-4 font-bold bg-muted/60 p-2 border-b">
                          <div>Module</div>
                          <div>Super Admin</div>
                          <div>Admin</div>
                          <div>Executive</div>
                        </div>
                        <div className="grid grid-cols-4 p-2 border-b">
                          <div className="font-semibold">Customers &amp; Leads</div>
                          <div className="text-emerald-600 font-bold">Full Access</div>
                          <div className="text-emerald-600 font-bold">Full Access</div>
                          <div className="text-amber-600">Assigned Only</div>
                        </div>
                        <div className="grid grid-cols-4 p-2 border-b">
                          <div className="font-semibold">Quotations &amp; Billing</div>
                          <div className="text-muted-foreground">Global View</div>
                          <div className="text-emerald-600 font-bold">Full Create/Edit</div>
                          <div className="text-emerald-600">Create / View</div>
                        </div>
                        <div className="grid grid-cols-4 p-2">
                          <div className="font-semibold">SaaS Revenue &amp; Tenants</div>
                          <div className="text-purple-600 font-bold">Exclusive</div>
                          <div className="text-destructive">Restricted</div>
                          <div className="text-destructive">Restricted</div>
                        </div>
                      </div>
                    </BrowserScreenshotFrame>
                  </section>
                </>
              )}

              {/* TOPIC 3: CUSTOMERS */}
              {selectedTopicId === "customers" && (
                <>
                  <section id="add-customer" className="space-y-3 scroll-mt-24">
                    <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <Users className="size-4 text-primary" /> Adding &amp; Editing Customer Leads
                    </h2>
                    <p>
                      Click <strong>+ Add Customer</strong> to record customer profiles. Each customer profile stores full contact details, phone number, email address, physical address, and GSTIN.
                    </p>

                    <BrowserScreenshotFrame url="https://www.taffdesk.com/customers" title="Customer Management Table Reference">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-foreground">Customer Leads Directory</div>
                          <Button size="sm" className="h-7 text-[11px] gap-1">
                            <Plus className="size-3" /> Add Customer
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-card text-xs">
                          <div className="grid grid-cols-4 font-bold bg-muted/60 p-2 border-b">
                            <div>Name</div>
                            <div>Phone</div>
                            <div>Address</div>
                            <div>Status</div>
                          </div>
                          <div className="grid grid-cols-4 p-2 border-b items-center">
                            <div className="font-semibold text-primary">Dilip Kumar</div>
                            <div className="font-mono text-muted-foreground">9607086390</div>
                            <div className="text-muted-foreground truncate">Jalor Sanchor</div>
                            <div><Badge variant="success" className="text-[10px]">Active</Badge></div>
                          </div>
                          <div className="grid grid-cols-4 p-2 items-center">
                            <div className="font-semibold text-primary">Fuzail Javed</div>
                            <div className="font-mono text-muted-foreground">8788099744</div>
                            <div className="text-muted-foreground truncate">Nagpur, MH</div>
                            <div><Badge variant="outline" className="text-[10px]">Lead</Badge></div>
                          </div>
                        </div>
                      </div>
                    </BrowserScreenshotFrame>
                  </section>

                  <section id="customer-360" className="space-y-3 scroll-mt-24">
                    <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" /> Customer 360° Financial Profile Dialog
                    </h2>
                    <p>
                      Clicking any customer name opens their 360° modal profile. This displays total lifetime revenue, total paid amount, balance due, and a complete history of linked Appointments, Quotations, and GST Invoices.
                    </p>

                    <BrowserScreenshotFrame url="https://www.taffdesk.com/customers?id=316" title="Customer 360° Profile Modal Reference">
                      <div className="p-4 rounded-xl border bg-card space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div>
                            <h4 className="font-bold text-sm text-foreground">Dilip Kumar</h4>
                            <span className="text-[11px] text-muted-foreground">Jalor Sanchor • GSTIN: 27CENPA9078D1ZI</span>
                          </div>
                          <Badge variant="success">Verified Customer</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 rounded border bg-primary/5">
                            <span className="text-[10px] font-bold text-muted-foreground">Total Billed</span>
                            <p className="font-bold text-primary text-sm mt-0.5">₹32,300</p>
                          </div>
                          <div className="p-2 rounded border bg-emerald-500/5">
                            <span className="text-[10px] font-bold text-muted-foreground">Total Paid</span>
                            <p className="font-bold text-emerald-600 text-sm mt-0.5">₹32,300</p>
                          </div>
                          <div className="p-2 rounded border bg-muted">
                            <span className="text-[10px] font-bold text-muted-foreground">Balance Due</span>
                            <p className="font-bold text-foreground text-sm mt-0.5">₹0.00</p>
                          </div>
                        </div>
                      </div>
                    </BrowserScreenshotFrame>
                  </section>
                </>
              )}

              {/* TOPIC 4: APPOINTMENTS */}
              {selectedTopicId === "appointments" && (
                <>
                  <section id="schedule-appointment" className="space-y-3 scroll-mt-24">
                    <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <CalendarClock className="size-4 text-primary" /> Service Booking &amp; Scheduling
                    </h2>
                    <p>
                      Schedule appointments by selecting customer, service item, booking date, time slot, and status (`scheduled`, `completed`, `cancelled`).
                    </p>

                    <BrowserScreenshotFrame url="https://www.taffdesk.com/appointments" title="Appointments & WhatsApp Reminders UI">
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg border bg-card flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground">Scrubber Machine Servicing — Dilip Kumar</div>
                            <div className="text-[11px] text-muted-foreground">Date: 25 Aug 2026 • Time: 10:30 AM</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-[11px] text-emerald-600 border-emerald-500/40 bg-emerald-500/10 gap-1">
                              <MessageSquare className="size-3" /> WhatsApp Reminder
                            </Button>
                            <Badge variant="warning">Scheduled</Badge>
                          </div>
                        </div>
                      </div>
                    </BrowserScreenshotFrame>
                  </section>
                </>
              )}

              {/* TOPIC 5: QUOTATIONS */}
              {selectedTopicId === "quotations" && (
                <>
                  <section id="create-quotation" className="space-y-3 scroll-mt-24">
                    <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <FileText className="size-4 text-primary" /> Generating &amp; Printing Official Quotations
                    </h2>
                    <p>
                      Create official Proforma Invoices &amp; Quotations with auto-sequenced document numbers (e.g. `QT-2026-0316`). Add product line items, transport details, and preview the signature block (`FOR TAFFTECH`).
                    </p>

                    <BrowserScreenshotFrame url="https://www.taffdesk.com/quotations?id=316" title="Printable Quotation / Proforma Invoice Preview">
                      <div className="p-4 bg-white text-black rounded-lg border border-slate-300 space-y-3 font-sans text-xs">
                        <div className="text-center border-b pb-2">
                          <h3 className="font-extrabold text-lg tracking-wider text-slate-900">TAFF TECH</h3>
                          <p className="text-[10px] font-bold bg-amber-400 text-black py-0.5 my-1">INDUSTRIAL SOLUTIONS</p>
                          <p className="text-[10px]">PLOT NO 4, NIZAMUDDIN COLONY, NAGPUR, MAHARASHTRA - 440001</p>
                        </div>
                        <div className="grid grid-cols-2 border text-[11px] p-2 bg-slate-50">
                          <div>
                            <p><strong>PROFORMA INVOICE :</strong> 316</p>
                            <p><strong>NAME :</strong> DILIP KUMAR</p>
                            <p><strong>BOOK TO :</strong> sanchor</p>
                          </div>
                          <div>
                            <p><strong>GR.NO :</strong> 316</p>
                            <p><strong>VEHICLE NO :</strong> ---------------</p>
                            <p><strong>TRANSPORT :</strong> jaipur golden</p>
                          </div>
                        </div>
                        <div className="border text-[11px]">
                          <div className="grid grid-cols-4 font-bold bg-slate-200 p-1 border-b">
                            <div>PARTICULAR</div>
                            <div>HSN</div>
                            <div>QTY</div>
                            <div className="text-right">AMOUNT</div>
                          </div>
                          <div className="grid grid-cols-4 p-1 border-b">
                            <div>SCRUBBER PACKING MANUAL</div>
                            <div>46</div>
                            <div>1</div>
                            <div className="text-right font-mono">25,000/-</div>
                          </div>
                          <div className="grid grid-cols-4 p-1 border-b">
                            <div>SCRUBBER 10 GM</div>
                            <div>49</div>
                            <div>20</div>
                            <div className="text-right font-mono">3,900/-</div>
                          </div>
                          <div className="grid grid-cols-4 p-1">
                            <div>CARD</div>
                            <div>-</div>
                            <div>120</div>
                            <div className="text-right font-mono">900/-</div>
                          </div>
                        </div>
                        <div className="flex justify-between font-bold text-xs pt-2 border-t">
                          <span>Rupees in word. THIRTY TWO THOUSAND THREE HUNDRED RUPEES ONLY/-</span>
                          <span>GRAND TOTAL: ₹32,300/-</span>
                        </div>
                        <div className="text-right pt-4">
                          <p className="font-extrabold text-xs">FOR TAFFTECH</p>
                          <p className="text-[10px] text-slate-500 pt-3 border-t inline-block mt-2">AUTHORISED SIGNATURE</p>
                        </div>
                      </div>
                    </BrowserScreenshotFrame>
                  </section>
                </>
              )}

              {/* TOPIC 6: BILLS */}
              {selectedTopicId === "bills" && (
                <>
                  <section id="create-bill" className="space-y-3 scroll-mt-24">
                    <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <Receipt className="size-4 text-primary" /> GST Tax Invoices &amp; 4 Printable Templates
                    </h2>
                    <p>
                      Generate official Tax Invoices with payment status tracking (`paid`, `partial`, `unpaid`). Switch between <strong>Modern</strong>, <strong>Classic</strong>, <strong>Minimal</strong>, and <strong>Compact</strong> print templates.
                    </p>

                    <BrowserScreenshotFrame url="https://www.taffdesk.com/bills" title="Bills & Tax Invoices Template Reference">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <span className="text-xs font-bold text-muted-foreground">Select Template:</span>
                          <Badge variant="default" className="text-[10px]">Modern</Badge>
                          <Badge variant="outline" className="text-[10px]">Classic</Badge>
                          <Badge variant="outline" className="text-[10px]">Minimal</Badge>
                          <Badge variant="outline" className="text-[10px]">Compact</Badge>
                        </div>
                        <div className="p-3 rounded-lg border bg-card flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-primary">INV-2026-0042</span>
                            <p className="font-semibold text-foreground">Dilip Kumar — ₹32,300</p>
                          </div>
                          <Badge variant="success">PAID</Badge>
                        </div>
                      </div>
                    </BrowserScreenshotFrame>
                  </section>
                </>
              )}

              {/* TOPIC 7: PRODUCTS */}
              {selectedTopicId === "products" && (
                <section id="add-product" className="space-y-3 scroll-mt-24">
                  <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <Package className="size-4 text-primary" /> Products &amp; Stock Management
                  </h2>
                  <p>
                    Catalogue product titles, SKU / HSN codes, default selling prices, stock quantities, and categories. Selecting a product in Quotations or Invoices automatically pre-fills HSN codes and prices.
                  </p>

                  <BrowserScreenshotFrame url="https://www.taffdesk.com/products" title="Product Inventory Directory UI">
                    <div className="border rounded-lg overflow-hidden bg-card text-xs">
                      <div className="grid grid-cols-4 font-bold bg-muted/60 p-2 border-b">
                        <div>Product Name</div>
                        <div>HSN / SKU</div>
                        <div>Unit Price</div>
                        <div>Stock</div>
                      </div>
                      <div className="grid grid-cols-4 p-2 border-b items-center">
                        <div className="font-semibold text-foreground">Scrubber Packing Manual</div>
                        <div className="font-mono text-muted-foreground">46</div>
                        <div className="font-mono font-bold text-primary">₹25,000</div>
                        <div><Badge variant="success" className="text-[10px]">In Stock</Badge></div>
                      </div>
                      <div className="grid grid-cols-4 p-2 items-center">
                        <div className="font-semibold text-foreground">Scrubber 10 GM</div>
                        <div className="font-mono text-muted-foreground">49</div>
                        <div className="font-mono font-bold text-primary">₹195</div>
                        <div><Badge variant="success" className="text-[10px]">In Stock</Badge></div>
                      </div>
                    </div>
                  </BrowserScreenshotFrame>
                </section>
              )}

              {/* TOPIC 8: LEDGER */}
              {selectedTopicId === "ledger" && (
                <section id="income-expenses" className="space-y-3 scroll-mt-24">
                  <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <Wallet className="size-4 text-primary" /> Financial Ledger &amp; Balance Sheet
                  </h2>
                  <p>
                    Track business income and manual expenses (supplier payments, rent, salaries). Paid GST invoices automatically post credit transactions to your Balance Sheet.
                  </p>

                  <BrowserScreenshotFrame url="https://www.taffdesk.com/balance-sheet" title="Financial Ledger & Balance Sheet Preview">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Total Income</span>
                        <p className="text-base font-bold text-emerald-600 mt-1">₹1,48,900</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-rose-500/10 border-rose-500/30">
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">Total Expenses</span>
                        <p className="text-base font-bold text-rose-600 mt-1">₹14,500</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-primary/10 border-primary/30">
                        <span className="text-[10px] font-bold text-primary">Net Ledger Balance</span>
                        <p className="text-base font-bold text-primary mt-1">₹1,34,400</p>
                      </div>
                    </div>
                  </BrowserScreenshotFrame>
                </section>
              )}

              {/* TOPIC 9: WHATSAPP */}
              {selectedTopicId === "whatsapp-setup" && (
                <section id="api-providers" className="space-y-3 scroll-mt-24">
                  <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <MessageSquare className="size-4 text-primary" /> WhatsApp Gateway Integration Setup
                  </h2>
                  <p>
                    Configure automated messaging via <strong>UltraMsg</strong>, <strong>GreenAPI</strong>, <strong>WATI</strong>, <strong>Twilio</strong>, or <strong>None (Direct Web Intent)</strong> under Settings.
                  </p>

                  <BrowserScreenshotFrame url="https://www.taffdesk.com/settings?tab=whatsapp" title="WhatsApp Gateway Settings UI">
                    <div className="p-4 rounded-xl border bg-card space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Selected API Provider:</span>
                        <Badge variant="default">UltraMsg API</Badge>
                      </div>
                      <div className="p-2 rounded bg-muted/40 font-mono text-[11px] text-muted-foreground">
                        Instance ID: instance104928 • API Key: ************
                      </div>
                    </div>
                  </BrowserScreenshotFrame>
                </section>
              )}

              {/* TOPIC 10: SUPER ADMIN */}
              {selectedTopicId === "superadmin" && (
                <section id="saas-analytics" className="space-y-3 scroll-mt-24">
                  <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <Building className="size-4 text-purple-500" /> Super Admin SaaS Controls &amp; SEO
                  </h2>
                  <p>
                    Super Admin controls global SaaS Revenue Analytics, Tenant Account Management, Live System Announcement Banners, and SEO Meta / Schema.org JSON-LD Script Injection.
                  </p>

                  <BrowserScreenshotFrame url="https://www.taffdesk.com/settings?tab=seo" title="SEO & Schema.org Script Injector UI">
                    <div className="p-4 rounded-xl border bg-slate-950 text-emerald-400 font-mono text-xs space-y-2">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">// Schema.org JSON-LD Editor</div>
                      <pre className="overflow-x-auto text-[11px] leading-relaxed">
{`{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Taff Desk CRM",
  "offers": { "@type": "Offer", "price": "4999", "priceCurrency": "INR" }
}`}
                      </pre>
                    </div>
                  </BrowserScreenshotFrame>
                </section>
              )}

              {/* TOPIC 11: FAQ */}
              {selectedTopicId === "faq" && (
                <section id="faq-general" className="space-y-3 scroll-mt-24">
                  <h2 className="text-lg font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <HelpCircle className="size-4 text-primary" /> Frequently Asked Questions (FAQ)
                  </h2>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border bg-card space-y-1">
                      <h3 className="font-bold text-sm">Q: Is Taff Desk CRM mobile friendly?</h3>
                      <p className="text-xs text-muted-foreground">Yes, 100% responsive for smartphones, tablets, and desktops.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card space-y-1">
                      <h3 className="font-bold text-sm">Q: How do I export records to CSV?</h3>
                      <p className="text-xs text-muted-foreground">Every table includes a 1-click Export CSV button.</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>

          {/* COLUMN 3: RIGHT ON-PAGE TOC SIDEBAR (3 cols) */}
          <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-6">
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Bookmark className="size-3.5 text-primary" /> On This Page
              </h3>

              <div className="space-y-1 text-xs">
                {activeTopic.sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSectionId(sec.id);
                      const el = document.getElementById(sec.id);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`block py-1 px-2 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50 ${
                      activeSectionId === sec.id ? "font-bold text-primary bg-primary/10" : ""
                    }`}
                  >
                    {sec.title}
                  </a>
                ))}
              </div>

              <div className="pt-3 border-t border-border/60 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="w-full h-8 text-xs font-medium gap-1.5"
                >
                  <Printer className="size-3.5" /> Print Article
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4 space-y-2 text-xs">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <Lightbulb className="size-3.5 text-primary" /> Need Quick Support?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Contact our 24/7 customer support team for setup guidance and live assistance.
              </p>
              <a
                href="https://wa.me/917020716334"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary font-bold hover:underline pt-1"
              >
                Chat on WhatsApp <ArrowUpRight className="size-3" />
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
