"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Users,
  CalendarClock,
  UserCog,
  ShieldCheck,
  IndianRupee,
  Search,
  Download,
  AlertTriangle,
  PhoneCall,
  MessageSquare,
  XCircle,
  Clock,
  FileSpreadsheet,
  Copy,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  UserCheck,
  Activity,
  Database,
  HeartPulse,
  HardDrive,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminFormDialog } from "@/components/admins/admin-form-dialog";
import { SubscriptionDialog } from "@/components/admins/subscription-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DateFilter, type DateFilterValue } from "@/components/ui/date-filter";
import type { Admin } from "@/lib/types";
import { getSubscriptionInfo } from "@/lib/subscription";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function exportPaymentsCsv(payments: any[]) {
  const headers = ["ID", "Tenant Name", "Tenant Email", "Amount (INR)", "UTR Number", "Status", "Notes", "Submitted Date"];
  const rows = payments.map((p) => [
    p.id,
    p.admin_name,
    p.admin_email,
    p.amount,
    p.utr_number,
    p.status,
    p.notes || "",
    p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "",
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
}

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 2) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatKbSize(kb?: number) {
  const size = kb || 16;
  if (size < 1024) return `${size} KB`;
  return `${(size / 1024).toFixed(2)} MB`;
}

export function AdminsClient({ initialAdmins }: { initialAdmins: Admin[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get("tab") : null;
  const [activeTab, setActiveTab] = React.useState(tabParam || "dashboard");

  React.useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("tab", val);
    router.push(`/admins?${params.toString()}`, { scroll: false });
  };

  const [admins, setAdmins] = React.useState(initialAdmins);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Admin | null>(null);
  const [resetting, setResetting] = React.useState<Admin | null>(null);
  const [subscriptionAdmin, setSubscriptionAdmin] = React.useState<Admin | null>(null);

  // Payment history & analytics state
  const [allPayments, setAllPayments] = React.useState<any[]>([]);
  const [analytics, setAnalytics] = React.useState<any>({
    total_revenue: 0,
    approved_count: 0,
    pending_count: 0,
    rejected_count: 0,
    expiring_soon_count: 0,
  });
  const [expiringSoonAdmins, setExpiringSoonAdmins] = React.useState<any[]>([]);
  const [paymentSearch, setPaymentSearch] = React.useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState("all");
  const [copiedUtrId, setCopiedUtrId] = React.useState<number | null>(null);
  const [paymentDateFilter, setPaymentDateFilter] = React.useState<DateFilterValue>({
    period: "all",
    value: "",
  });
  const [selectedPaymentIds, setSelectedPaymentIds] = React.useState<number[]>([]);
  const [deletingPaymentsOpen, setDeletingPaymentsOpen] = React.useState(false);

  const fetchPaymentData = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (paymentDateFilter.period !== "all" && paymentDateFilter.value) {
        params.set("period", paymentDateFilter.period);
        params.set("dateValue", paymentDateFilter.value);
      }
      const res = await fetch(`/api/subscription/payments?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAllPayments(json.payments || []);
        setAnalytics(json.analytics || {});
        setExpiringSoonAdmins(json.expiring_soon || []);
      }
    } catch {
      // ignore
    }
  }, [paymentDateFilter]);

  React.useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  async function refresh() {
    const res = await fetch("/api/admins");
    if (res.ok) setAdmins(await res.json());
    fetchPaymentData();
    router.refresh();
  }

  async function handleApprovePayment(paymentId: number, adminName: string) {
    try {
      const res = await fetch(`/api/subscription/payments/${paymentId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      toast.success(`Approved! 1-Year subscription activated for ${adminName}.`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not approve payment.");
    }
  }

  async function handleRejectPayment(paymentId: number, adminName: string) {
    const reason = window.prompt(`Enter rejection reason for ${adminName}:`, "Invalid UTR / Payment not received");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/subscription/payments/${paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");

      toast.success(`Payment proof rejected for ${adminName}.`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not reject payment.");
    }
  }

  async function toggleStatus(admin: Admin) {
    const res = await fetch(`/api/admins/${admin.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: admin.status === "active" ? "inactive" : "active" }),
    });
    if (!res.ok) {
      toast.error("Could not update.");
      return;
    }
    toast.success(admin.status === "active" ? "Admin deactivated." : "Admin activated.");
    refresh();
  }

  async function handleDelete(admin: Admin) {
    const res = await fetch(`/api/admins/${admin.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove.");
      return;
    }
    toast.success(`${admin.name} and their entire tenant have been removed.`);
    refresh();
  }

  async function handleResetPassword(password: string) {
    if (!resetting) return;
    const res = await fetch(`/api/admins/${resetting.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error("Could not reset password.");
    toast.success("Password reset.");
    refresh();
  }

  const pendingPayments = allPayments.filter((p) => p.status === "pending");

  const filteredPayments = allPayments.filter((p) => {
    const matchStatus = paymentStatusFilter === "all" || p.status === paymentStatusFilter;
    const matchSearch =
      !paymentSearch ||
      p.admin_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.admin_email?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.utr_number?.toLowerCase().includes(paymentSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const allVisiblePaymentIds = filteredPayments.map((p) => p.id);
  const isAllPaymentsSelected =
    allVisiblePaymentIds.length > 0 && allVisiblePaymentIds.every((id) => selectedPaymentIds.includes(id));

  function toggleSelectAllPayments() {
    if (isAllPaymentsSelected) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(allVisiblePaymentIds);
    }
  }

  function toggleSelectPayment(id: number) {
    setSelectedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleBulkDeletePayments() {
    if (selectedPaymentIds.length === 0) return;
    try {
      const res = await fetch("/api/subscription/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedPaymentIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete payments");
      toast.success(`${selectedPaymentIds.length} payment record(s) deleted permanently.`);
      setSelectedPaymentIds([]);
      setDeletingPaymentsOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payments");
    }
  }

  function copyUtr(utr: string, id: number) {
    navigator.clipboard.writeText(utr);
    setCopiedUtrId(id);
    toast.success("UTR Number copied!");
    setTimeout(() => setCopiedUtrId(null), 2000);
  }

  async function handleImpersonate(admin: Admin) {
    try {
      toast.loading(`Logging in as ${admin.name}...`);
      const res = await fetch(`/api/admins/${admin.id}/impersonate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to impersonate tenant");

      toast.success(`Logged in as ${admin.name}! Entering support mode...`);
      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enter support mode.");
    }
  }

  return (
    <div className="flex flex-col gap-6" suppressHydrationWarning>
      {/* Top Title Bar — 2 Columns on Mobile */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 pr-1">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            SaaS Tenants &amp; Payments
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
            Manage all tenant accounts, subscription plans, payment history, and revenue analytics.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="shrink-0 text-xs sm:text-sm font-semibold h-9 px-3 gap-1">
          <Plus className="size-4" /> Add admin
        </Button>
      </div>

      {/* Top SaaS Analytics KPI Cards — 2 Columns (50-50) on Mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Total Revenue */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-xs">
              <IndianRupee className="size-4 sm:size-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                TOTAL REVENUE
              </p>
              <p className="font-heading text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate" title={`₹${Number(analytics.total_revenue || 0).toLocaleString("en-IN")}`}>
                ₹{Number(analytics.total_revenue || 0).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                {admins.filter((a) => a.status === "active").length} active accounts
              </p>
            </div>
          </div>
        </Card>

        {/* Card 2: Active Tenants */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/5 p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Users className="size-4 sm:size-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                ACTIVE TENANTS
              </p>
              <p className="font-heading text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {admins.filter((a) => a.status === "active").length}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                {admins.length} total registered
              </p>
            </div>
          </div>
        </Card>

        {/* Card 3: Pending Approvals */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
              <Clock className="size-4 sm:size-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                PENDING APPROVALS
              </p>
              <p className="font-heading text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {analytics.pending_count || 0}
              </p>
              <p className={`text-[10px] sm:text-[11px] font-medium truncate ${
                (analytics.pending_count || 0) > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {(analytics.pending_count || 0) > 0 ? "Action required" : "All payments cleared"}
              </p>
            </div>
          </div>
        </Card>

        {/* Card 4: Expiring (7 Days) */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-destructive/5 p-3 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20 group-hover:scale-105 group-hover:bg-destructive group-hover:text-white transition-all duration-300 shadow-xs">
              <AlertTriangle className="size-4 sm:size-5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                EXPIRING (7 DAYS)
              </p>
              <p className="font-heading text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {expiringSoonAdmins.length}
              </p>
              <p className={`text-[10px] sm:text-[11px] font-medium truncate ${
                expiringSoonAdmins.length > 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {expiringSoonAdmins.length > 0 ? "Follow-up due" : "No urgent expiries"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alert Banner for Pending Payment Approvals */}
      {pendingPayments.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Pending Subscription Renewal Requests ({pendingPayments.length})
              </span>
              <Badge variant="warning" className="text-xs">Action Required</Badge>
            </div>
            <div className="space-y-2">
              {pendingPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{p.admin_name} ({p.admin_email})</span>
                    <span className="text-muted-foreground">
                      Submitted UTR: <strong className="font-mono text-foreground">{p.utr_number}</strong> · Amount: ₹{Number(p.amount).toLocaleString("en-IN")}
                    </span>
                    {p.notes && <span className="text-[11px] italic text-muted-foreground">Note: {p.notes}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => handleRejectPayment(p.id, p.admin_name)}
                    >
                      <XCircle className="size-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprovePayment(p.id, p.admin_name)}
                    >
                      <CheckCircle2 className="size-3.5" /> Approve &amp; Extend 1 Year
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">

        {/* Tab 0: SaaS Revenue Dashboard */}
        <TabsContent value="dashboard" className="mt-4 space-y-6">
          {/* Revenue Performance & Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
            <Card className="p-3 sm:p-4 flex flex-col justify-between border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">This Month Revenue</span>
                <Badge variant="success" className="gap-1 text-[10px] px-1.5 py-0">
                  {analytics.growth_percent >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {analytics.growth_percent >= 0 ? `+${analytics.growth_percent}%` : `${analytics.growth_percent}%`}
                </Badge>
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="font-heading text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                  ₹{Number(analytics.this_month_revenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 sm:mt-1 truncate">
                  vs ₹{Number(analytics.last_month_revenue || 0).toLocaleString("en-IN")} last month
                </span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 flex flex-col justify-between border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">Pending Revenue</span>
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                  {analytics.pending_count || 0} Pending
                </Badge>
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="font-heading text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                  ₹{Number(analytics.pending_revenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 sm:mt-1 truncate">
                  Awaiting review in Payment History
                </span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 col-span-2 md:col-span-1 flex flex-col justify-between border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">Active Paid Conversion</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {admins.length > 0 ? Math.round(((analytics.approved_count || 0) / admins.length) * 100) : 0}% Paid
                </Badge>
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="font-heading text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                  {analytics.approved_count || 0} / {admins.length} Tenants
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 sm:mt-1 truncate">
                  Total approved payment renewals
                </span>
              </div>
            </Card>
          </div>

          {/* Revenue Trends & Plan Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Revenue Growth Chart */}
            <Card className="lg:col-span-2 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Monthly Revenue Growth (Last 12 Months)</h3>
                    <p className="text-[11px] text-muted-foreground font-normal">Approved subscription payments collected per month</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  Lifetime Total: ₹{Number(analytics.total_revenue || 0).toLocaleString("en-IN")}
                </Badge>
              </div>

              {/* Responsive Styled Bar Chart */}
              {(!analytics.monthly_trends || analytics.monthly_trends.length === 0) ? (
                <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                  No monthly revenue trends recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-end gap-2 h-44 pt-4 border-b border-border/50 px-2">
                    {analytics.monthly_trends.map((m: any, idx: number) => {
                      const maxRev = Math.max(...analytics.monthly_trends.map((t: any) => Number(t.revenue) || 1));
                      const heightPercent = Math.max(14, Math.round((Number(m.revenue) / maxRev) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-popover text-popover-foreground border text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                            ₹{Number(m.revenue).toLocaleString("en-IN")} ({m.count} payments)
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[36px] bg-primary/80 hover:bg-primary rounded-t transition-all group-hover:scale-105 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* Month X-Axis Labels */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono px-2">
                    {analytics.monthly_trends.map((m: any, idx: number) => (
                      <div key={idx} className="flex-1 text-center truncate">
                        {m.month_label || m.month_key}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Tenant Subscription Plan Distribution */}
            <Card className="p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 border-b pb-3 mb-4">
                <PieChart className="size-5 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Subscription Plan Distribution</h3>
                  <p className="text-[11px] text-muted-foreground font-normal">Breakdown of tenants across plan tiers</p>
                </div>
              </div>

              <div className="space-y-4 my-auto">
                {["yearly", "3_year", "lifetime", "trial"].map((pt) => {
                  const dist = (analytics.plan_distribution || []).find((d: any) => d.plan_type === pt);
                  const count = dist?.count || 0;
                  const percent = admins.length > 0 ? Math.round((count / admins.length) * 100) : 0;
                  const labelMap: Record<string, string> = {
                    yearly: "1-Year Plan (365d)",
                    "3_year": "3-Year Plan (1095d)",
                    lifetime: "Lifetime Plan",
                    trial: "Trial Plan",
                  };
                  const colorMap: Record<string, string> = {
                    yearly: "bg-primary",
                    "3_year": "bg-emerald-500",
                    lifetime: "bg-purple-500",
                    trial: "bg-amber-500",
                  };
                  return (
                    <div key={pt} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{labelMap[pt]}</span>
                        <span className="font-mono text-muted-foreground">{count} ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full rounded-full ${colorMap[pt]} transition-all`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 1: Admins Table & Mobile Cards */}
        <TabsContent value="admins" className="mt-4">
          {admins.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No Admins yet. Add the first one above.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table View */}
              <Card className="hidden overflow-hidden py-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan &amp; Expiry</TableHead>
                      <TableHead className="hidden md:table-cell">
                        <Users className="inline size-3.5" /> Customers
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <CalendarClock className="inline size-3.5" /> Appointments
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <UserCog className="inline size-3.5" /> Team
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => {
                      const subInfo = getSubscriptionInfo(admin);
                      return (
                        <TableRow key={admin.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7">
                                <AvatarFallback className="text-[11px]">{initials(admin.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-foreground">{admin.name}</span>
                                  <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0">
                                    ID: #{admin.id}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground sm:hidden">{admin.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            <div className="flex flex-col">
                              <span>{admin.email}</span>
                              {admin.phone && (
                                <a
                                  href={`https://wa.me/${admin.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5 font-semibold"
                                >
                                  <PhoneCall className="size-3" /> {admin.phone}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={admin.status === "active" ? "success" : "secondary"} className="capitalize">
                              {admin.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant={
                                    subInfo.status === "locked"
                                      ? "destructive"
                                      : subInfo.status === "grace" || (subInfo.daysRemaining !== null && subInfo.daysRemaining <= 3)
                                      ? "warning"
                                      : "outline"
                                  }
                                  className="capitalize text-[11px] h-5 px-1.5"
                                >
                                  {subInfo.planType}
                                </Badge>
                                {subInfo.status === "grace" && (
                                  <span className="text-[10px] text-amber-500 font-semibold">Grace ({subInfo.graceDaysRemaining}d)</span>
                                )}
                                {subInfo.status === "active" && subInfo.daysRemaining !== null && subInfo.daysRemaining === 0 && (
                                  <span className="text-[10px] text-amber-500 font-semibold">Expires Today</span>
                                )}
                                {subInfo.status === "active" && subInfo.daysRemaining !== null && subInfo.daysRemaining > 0 && subInfo.daysRemaining <= 3 && (
                                  <span className="text-[10px] text-amber-500 font-semibold">{subInfo.daysRemaining}d left</span>
                                )}
                                {subInfo.status === "locked" && (
                                  <span className="text-[10px] text-destructive font-semibold">Locked</span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {subInfo.formattedExpiry === "Never" ? "Unlimited" : `Exp: ${subInfo.formattedExpiry}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {admin.customer_count ?? 0}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {admin.appointment_count ?? 0}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {admin.executive_count ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-[11px] font-semibold gap-1 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 shadow-xs shrink-0"
                                onClick={() => handleImpersonate(admin)}
                                title={`Login as ${admin.name} for Support`}
                              >
                                <UserCheck className="size-3.5 text-purple-600 dark:text-purple-400" />
                                <span className="hidden sm:inline">Login as Tenant</span>
                                <span className="sm:hidden">Login</span>
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleImpersonate(admin)} className="font-semibold text-purple-700 dark:text-purple-300">
                                    <UserCheck className="size-4 text-purple-600" /> Login as Tenant (Support)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setSubscriptionAdmin(admin)}>
                                    <ShieldCheck className="size-4 text-primary" /> Manage Plan
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setResetting(admin)}>
                                    <KeyRound className="size-4" /> Reset password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleStatus(admin)}>
                                    {admin.status === "active" ? (
                                      <>
                                        <Ban className="size-4" /> Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="size-4" /> Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(admin)}>
                                    <Trash2 className="size-4" /> Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile Cards View */}
              <div className="flex flex-col gap-2.5 md:hidden">
                {admins.map((admin) => {
                  const subInfo = getSubscriptionInfo(admin);
                  return (
                    <Card key={admin.id} className="p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className="text-[11px]">{initials(admin.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate leading-snug">{admin.name}</span>
                              <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0 shrink-0">
                                ID: #{admin.id}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">{admin.email}</span>
                            {admin.phone && (
                              <a
                                href={`https://wa.me/${admin.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5 font-semibold"
                              >
                                <PhoneCall className="size-3" /> {admin.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(admin.health_score || 0) >= 75 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px] px-1.5 py-0">
                              🟢 {admin.health_score}%
                            </Badge>
                          ) : (admin.health_score || 0) >= 40 ? (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold text-[10px] px-1.5 py-0">
                              🟡 {admin.health_score}%
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold text-[10px] px-1.5 py-0">
                              🔴 {admin.health_score}%
                            </Badge>
                          )}
                          <Badge variant={admin.status === "active" ? "success" : "secondary"} className="capitalize text-[10px] px-1.5 py-0">
                            {admin.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleImpersonate(admin)} className="font-semibold text-purple-700 dark:text-purple-300">
                                <UserCheck className="size-4 text-purple-600" /> Login as Tenant (Support)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSubscriptionAdmin(admin)}>
                                <ShieldCheck className="size-4 text-primary" /> Manage Plan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setResetting(admin)}>
                                <KeyRound className="size-4" /> Reset password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus(admin)}>
                                {admin.status === "active" ? (
                                  <>
                                    <Ban className="size-4" /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-4" /> Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(admin)}>
                                <Trash2 className="size-4" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Plan & Expiry Details */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md border bg-muted/30 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              subInfo.status === "locked"
                                ? "destructive"
                                : subInfo.status === "grace" || (subInfo.daysRemaining !== null && subInfo.daysRemaining <= 3)
                                ? "warning"
                                : "outline"
                            }
                            className="capitalize text-[10px] px-1.5 py-0"
                          >
                            {subInfo.planType}
                          </Badge>
                          {subInfo.status === "grace" && (
                            <span className="text-[10px] text-amber-500 font-semibold">Grace ({subInfo.graceDaysRemaining}d)</span>
                          )}
                          {subInfo.status === "active" && subInfo.daysRemaining !== null && subInfo.daysRemaining <= 3 && (
                            <span className="text-[10px] text-amber-500 font-semibold">{subInfo.daysRemaining}d left</span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {subInfo.formattedExpiry === "Never" ? "Unlimited" : `Exp: ${subInfo.formattedExpiry}`}
                        </span>
                      </div>

                      {/* Usage Stats Pills */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{admin.customer_count ?? 0}</span>
                          <span className="text-[10px]">Customers</span>
                        </div>
                        <div className="flex flex-col border-x border-border/40">
                          <span className="font-bold text-foreground">{admin.appointment_count ?? 0}</span>
                          <span className="text-[10px]">Appts</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{admin.executive_count ?? 0}</span>
                          <span className="text-[10px]">Team</span>
                        </div>
                      </div>

                      {/* Login as Tenant Action */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7.5 text-xs font-semibold gap-1.5 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        onClick={() => handleImpersonate(admin)}
                      >
                        <UserCheck className="size-3.5 text-purple-600 dark:text-purple-400" />
                        Login as Tenant (Support)
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab 2: Payment History & Records */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Tenant Name, Email, or UTR..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Date Filter for Top Cards & Table */}
              <DateFilter value={paymentDateFilter} onChange={setPaymentDateFilter} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="grid grid-cols-4 w-full sm:w-auto rounded-lg border border-border bg-card p-1 text-xs text-center">
                {["all", "pending", "approved", "rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`px-2 py-1 rounded capitalize font-medium transition-colors text-center ${
                      paymentStatusFilter === st
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 text-xs gap-1.5 w-full sm:w-auto justify-center shrink-0"
                onClick={() => exportPaymentsCsv(filteredPayments)}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedPaymentIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="font-mono text-xs">
                  {selectedPaymentIds.length} Selected
                </Badge>
                <span className="text-muted-foreground hidden sm:inline">
                  Select payment records to bulk delete permanently.
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs gap-1.5 font-semibold"
                onClick={() => setDeletingPaymentsOpen(true)}
              >
                <Trash2 className="size-3.5" /> Delete Selected ({selectedPaymentIds.length})
              </Button>
            </div>
          )}

          {filteredPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-xs text-muted-foreground">
                No payment records found.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table View */}
              <Card className="hidden overflow-hidden py-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={isAllPaymentsSelected}
                          onCheckedChange={toggleSelectAllPayments}
                        />
                      </TableHead>
                      <TableHead>Tenant / Admin</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UTR Number</TableHead>
                      <TableHead>Date Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((p) => {
                      const isSelected = selectedPaymentIds.includes(p.id);
                      return (
                        <TableRow key={p.id} className={isSelected ? "bg-muted/40" : undefined}>
                          <TableCell className="w-10">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectPayment(p.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-foreground">{p.admin_name}</span>
                                <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0">
                                  ID: #{p.admin_id}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">{p.admin_email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex flex-col">
                              <span>₹{Number(p.amount).toLocaleString("en-IN")}</span>
                              {p.coupon_code && (
                                <Badge variant="outline" className="w-fit text-[9px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-0.5 px-1.5 py-0 mt-0.5">
                                  🎟️ {p.coupon_code} (-₹{Number(p.discount_amount).toLocaleString("en-IN")})
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border">
                                {p.utr_number}
                              </span>
                              <button
                                onClick={() => copyUtr(p.utr_number, p.id)}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy UTR"
                              >
                                {copiedUtrId === p.id ? (
                                  <CheckCheck className="size-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.status === "approved"
                                  ? "success"
                                  : p.status === "pending"
                                  ? "warning"
                                  : "destructive"
                              }
                              className="capitalize text-xs"
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRejectPayment(p.id, p.admin_name)}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleApprovePayment(p.id, p.admin_name)}
                                >
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Processed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile Cards View */}
              <div className="flex flex-col gap-2.5 md:hidden">
                {filteredPayments.map((p) => {
                  const isSelected = selectedPaymentIds.includes(p.id);
                  return (
                    <Card key={p.id} className={`p-3 space-y-2.5 ${isSelected ? "border-primary/50 bg-primary/5" : ""}`}>
                      {/* Header: Checkbox + Name & Status */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectPayment(p.id)}
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate leading-snug">{p.admin_name}</span>
                              <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0 shrink-0">
                                ID: #{p.admin_id}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">{p.admin_email}</span>
                          </div>
                        </div>
                      <Badge
                        variant={
                          p.status === "approved"
                            ? "success"
                            : p.status === "pending"
                            ? "warning"
                            : "destructive"
                        }
                        className="capitalize text-[10px] px-2 py-0.5 shrink-0"
                      >
                        {p.status}
                      </Badge>
                    </div>

                    {/* Compact Amount & UTR Box */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md border bg-muted/30 text-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Amount:</span>
                        <span className="text-sm font-black text-foreground">
                          ₹{Number(p.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">UTR:</span>
                        <span className="font-mono text-[11px] font-semibold text-foreground bg-card px-1.5 py-0.5 rounded border">
                          {p.utr_number}
                        </span>
                        <button
                          onClick={() => copyUtr(p.utr_number, p.id)}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                          title="Copy UTR"
                        >
                          {copiedUtrId === p.id ? (
                            <CheckCheck className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Date & Notes */}
                    <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                      <span>Date: {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "N/A"}</span>
                      {p.notes && (
                        <span className="italic text-[10px] text-muted-foreground truncate">
                          Note: {p.notes}
                        </span>
                      )}
                    </div>

                    {p.status === "pending" && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleRejectPayment(p.id, p.admin_name)}
                        >
                          <XCircle className="size-3 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApprovePayment(p.id, p.admin_name)}
                        >
                          <CheckCircle2 className="size-3 mr-1" /> Approve &amp; Extend
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
          )}
        </TabsContent>

        {/* Tab 3: Upcoming Expiries (7 Days) */}
        <TabsContent value="expiring" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-amber-500" /> Tenants Expiring in the Next 7 Days
              </CardTitle>
              <CardDescription className="text-xs">
                Follow up with these tenants directly to ensure smooth renewal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringSoonAdmins.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No tenant subscriptions are expiring in the next 7 days. 🎉
                </div>
              ) : (
                <div className="space-y-2">
                  {expiringSoonAdmins.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card text-xs"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground">{ad.name}</span>
                          <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0">
                            ID: #{ad.id}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground">{ad.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground">Expires On</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{ad.plan_expiry_date}</span>
                        </div>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hello ${ad.name}! Your CRM subscription plan is expiring on ${ad.plan_expiry_date}. Please renew soon to avoid service interruption.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-medium transition-colors"
                        >
                          <MessageSquare className="size-3" /> WhatsApp Followup
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Tenant Health & Daily Usage Report */}
        <TabsContent value="health" className="mt-4 space-y-6">
          {/* Health Summary Analytics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <Card className="p-3 sm:p-4 flex flex-col justify-between border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">Healthy &amp; Active</span>
                <HeartPulse className="size-4 text-emerald-500" />
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="font-heading text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {admins.filter((a) => (a.health_score || 0) >= 75).length} Tenants
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 sm:mt-1 truncate">
                  Score ≥ 75% · Daily active users
                </span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 flex flex-col justify-between border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">Moderate Usage</span>
                <Zap className="size-4 text-amber-500" />
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="font-heading text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                  {admins.filter((a) => (a.health_score || 0) >= 40 && (a.health_score || 0) < 75).length} Tenants
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 sm:mt-1 truncate">
                  Score 40-74% · Occasional logins
                </span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 flex flex-col justify-between border-destructive/20 bg-destructive/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">At Risk / Inactive</span>
                <AlertTriangle className="size-4 text-destructive" />
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="font-heading text-lg sm:text-2xl font-bold text-destructive tracking-tight">
                  {admins.filter((a) => (a.health_score || 0) < 40).length} Tenants
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 sm:mt-1 truncate">
                  Score &lt; 40% · Needs support follow-up
                </span>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 flex flex-col justify-between border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">Consolidated Storage</span>
                <HardDrive className="size-4 text-primary" />
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="font-heading text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                  {formatKbSize(admins.reduce((sum, a) => sum + (a.est_db_size_kb || 16), 0))}
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 sm:mt-1 truncate">
                  {admins.reduce((sum, a) => sum + (a.total_records || 0), 0)} Total DB Records
                </span>
              </div>
            </Card>
          </div>

          {/* Consolidated Report List / Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="size-5 text-primary" /> Tenant Health &amp; Daily Usage Consolidated Report
                </span>
                <Badge variant="outline" className="text-xs">
                  {admins.length} Registered Tenants
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time breakdown of daily active usage, last login times, and database storage footprint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {admins.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No tenant data available.
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tenant / Admin</TableHead>
                          <TableHead>Health Score</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Weekly Active Usage</TableHead>
                          <TableHead>Database Footprint</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admins.map((ad) => {
                          const score = ad.health_score || 0;
                          return (
                            <TableRow key={ad.id}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="size-8">
                                    <AvatarFallback className="text-xs">{initials(ad.name)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-sm text-foreground">{ad.name}</span>
                                      <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0">
                                        ID: #{ad.id}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{ad.email}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {score >= 75 ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold gap-1 text-xs">
                                    <HeartPulse className="size-3.5" /> {score}% Healthy
                                  </Badge>
                                ) : score >= 40 ? (
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold gap-1 text-xs">
                                    <Zap className="size-3.5" /> {score}% Moderate
                                  </Badge>
                                ) : (
                                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold gap-1 text-xs">
                                    <AlertTriangle className="size-3.5" /> {score}% At Risk
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground">
                                    {formatRelativeTime(ad.last_login_at || ad.last_activity_at)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {ad.last_login_at ? new Date(ad.last_login_at).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }) : "No login record"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 w-36">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground">{ad.daily_active_days || 0}/7 Days</span>
                                    <span className="text-[10px] text-muted-foreground">{ad.weekly_activity_count || 0} acts</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                      style={{ width: `${Math.min(100, Math.round(((ad.daily_active_days || 0) / 7) * 100))}%` }}
                                      className={`h-full rounded-full ${
                                        (ad.daily_active_days || 0) >= 5 ? "bg-emerald-500" : (ad.daily_active_days || 0) >= 2 ? "bg-amber-500" : "bg-destructive"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="flex flex-col">
                                  <span className="font-mono font-bold text-foreground">
                                    {formatKbSize(ad.est_db_size_kb)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {ad.customer_count || 0} Cust · {ad.appointment_count || 0} Appt · {ad.bill_count || 0} Bills · {ad.quotation_count || 0} Quot
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] font-semibold gap-1 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                    onClick={() => handleImpersonate(ad)}
                                  >
                                    <UserCheck className="size-3 text-purple-600" /> Support Login
                                  </Button>
                                  <a
                                    href={`https://wa.me/?text=${encodeURIComponent(
                                      `Hello ${ad.name}! This is Super Admin Support checking in to see how your CRM experience is going. Do you need any assistance?`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center size-7 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                    title="WhatsApp Re-engagement Check-in"
                                  >
                                    <MessageSquare className="size-3.5" />
                                  </a>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="flex flex-col gap-3 md:hidden">
                    {admins.map((ad) => {
                      const score = ad.health_score || 0;
                      return (
                        <Card key={ad.id} className="p-3.5 space-y-3 border border-border">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="size-8 shrink-0">
                                <AvatarFallback className="text-[11px]">{initials(ad.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-foreground truncate">{ad.name}</span>
                                  <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0 shrink-0">
                                    ID: #{ad.id}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-muted-foreground truncate">{ad.email}</span>
                              </div>
                            </div>
                            {score >= 75 ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px] shrink-0">
                                🟢 {score}% Healthy
                              </Badge>
                            ) : score >= 40 ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold text-[10px] shrink-0">
                                🟡 {score}% Moderate
                              </Badge>
                            ) : (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold text-[10px] shrink-0">
                                🔴 {score}% At Risk
                              </Badge>
                            )}
                          </div>

                          {/* Login & Activity Status */}
                          <div className="grid grid-cols-2 gap-2 p-2 rounded-md bg-muted/30 text-xs">
                            <div>
                              <span className="text-[10px] text-muted-foreground block">Last Login:</span>
                              <span className="font-semibold text-foreground">
                                {formatRelativeTime(ad.last_login_at || ad.last_activity_at)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block">Weekly Usage:</span>
                              <span className="font-semibold text-foreground">
                                {ad.daily_active_days || 0}/7 Days Active
                              </span>
                            </div>
                          </div>

                          {/* Database Storage Breakdown */}
                          <div className="space-y-1.5 pt-1 border-t border-border/40 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground text-[11px]">Database Footprint:</span>
                              <span className="font-mono font-bold text-foreground">
                                {formatKbSize(ad.est_db_size_kb)} ({ad.total_records || 0} rows)
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-muted-foreground bg-card p-1.5 rounded border">
                              <div><strong className="block text-foreground">{ad.customer_count || 0}</strong>Cust</div>
                              <div><strong className="block text-foreground">{ad.appointment_count || 0}</strong>Appt</div>
                              <div><strong className="block text-foreground">{ad.bill_count || 0}</strong>Bills</div>
                              <div><strong className="block text-foreground">{ad.quotation_count || 0}</strong>Quot</div>
                              <div><strong className="block text-foreground">{ad.product_count || 0}</strong>Prod</div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs font-semibold gap-1.5 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              onClick={() => handleImpersonate(ad)}
                            >
                              <UserCheck className="size-3.5 text-purple-600" /> Support Login
                            </Button>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `Hello ${ad.name}! Super Admin Support checking in to see how your CRM experience is going. Do you need any help?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-3 h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1 shrink-0"
                            >
                              <MessageSquare className="size-3.5" /> WhatsApp
                            </a>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AdminFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />

      <SubscriptionDialog
        open={!!subscriptionAdmin}
        onOpenChange={(open) => !open && setSubscriptionAdmin(null)}
        admin={subscriptionAdmin}
        onSaved={refresh}
      />

      {resetting && (
        <ResetPasswordDialog
          open={!!resetting}
          onOpenChange={(open) => !open && setResetting(null)}
          name={resetting.name}
          onConfirm={handleResetPassword}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Remove ${deleting.name}?`}
          description="Their entire tenant — customers, appointments, quotations, products, team — will be permanently deleted. This action cannot be undone."
          onConfirm={() => handleDelete(deleting)}
        />
      )}

      <ConfirmDeleteDialog
        open={deletingPaymentsOpen}
        onOpenChange={setDeletingPaymentsOpen}
        title={`Delete ${selectedPaymentIds.length} Selected Payment Record(s)?`}
        description="Selected payment history records will be permanently removed from the system. This action cannot be undone."
        onConfirm={handleBulkDeletePayments}
      />
    </div>
  );
}


