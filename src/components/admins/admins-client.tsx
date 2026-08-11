"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  a.download = `subscription_payments_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export function AdminsClient({ initialAdmins }: { initialAdmins: Admin[] }) {
  const router = useRouter();
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

  const fetchPaymentData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/payments");
      if (res.ok) {
        const json = await res.json();
        setAllPayments(json.payments || []);
        setAnalytics(json.analytics || {});
        setExpiringSoonAdmins(json.expiring_soon || []);
      }
    } catch {
      // ignore
    }
  }, []);

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
      {/* Top Title Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SaaS Tenants &amp; Payments</h1>
          <p className="text-sm text-muted-foreground">
            Manage all tenant accounts, subscription plans, payment history, and revenue analytics.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> Add admin
        </Button>
      </div>

      {/* Top SaaS Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <Card className="p-4 flex flex-col items-center justify-center text-center border-primary/20 bg-primary/5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <IndianRupee className="size-5" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Total Revenue Collected</span>
          <span className="text-2xl font-black text-foreground tracking-tight mt-1">
            ₹{Number(analytics.total_revenue || 0).toLocaleString("en-IN")}
          </span>
        </Card>

        {/* Card 2: Active Tenants */}
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
            <Users className="size-5" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Active Tenants</span>
          <span className="text-2xl font-black text-foreground tracking-tight mt-1">{admins.length}</span>
        </Card>

        {/* Card 3: Pending Approvals */}
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-2">
            <Clock className="size-5" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Pending Approvals</span>
          <span className="text-2xl font-black text-amber-500 tracking-tight mt-1">{analytics.pending_count || 0}</span>
        </Card>

        {/* Card 4: Expiring Soon */}
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
            <AlertTriangle className="size-5" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Expiring Soon (7 Days)</span>
          <span className="text-2xl font-black text-destructive tracking-tight mt-1">{expiringSoonAdmins.length}</span>
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
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="size-4" /> SaaS Revenue Dashboard
          </TabsTrigger>
          <TabsTrigger value="admins">Tenants &amp; Admins ({admins.length})</TabsTrigger>
          <TabsTrigger value="payments" className="relative gap-1.5">
            <IndianRupee className="size-4" /> Payment History &amp; Records
            {analytics.pending_count > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {analytics.pending_count}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring" className="gap-1.5">
            <Clock className="size-4" /> Upcoming Expiries (7d) ({expiringSoonAdmins.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 0: SaaS Revenue Dashboard */}
        <TabsContent value="dashboard" className="mt-4 space-y-6">
          {/* Revenue Performance & Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-col justify-between border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">This Month Revenue</span>
                <Badge variant="success" className="gap-1 text-[10px]">
                  {analytics.growth_percent >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {analytics.growth_percent >= 0 ? `+${analytics.growth_percent}%` : `${analytics.growth_percent}%`}
                </Badge>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  ₹{Number(analytics.this_month_revenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  vs ₹{Number(analytics.last_month_revenue || 0).toLocaleString("en-IN")} last month
                </span>
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Pending Approval Revenue</span>
                <Badge variant="warning" className="text-[10px]">
                  {analytics.pending_count || 0} Pending
                </Badge>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  ₹{Number(analytics.pending_revenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Awaiting Super Admin review in Payment History tab
                </span>
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Active Paid Conversion Rate</span>
                <Badge variant="outline" className="text-[10px]">
                  {admins.length > 0 ? Math.round(((analytics.approved_count || 0) / admins.length) * 100) : 0}% Paid
                </Badge>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {analytics.approved_count || 0} / {admins.length} Tenants
                </span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Total approved payment renewals processed
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

        {/* Tab 1: Admins Table */}
        <TabsContent value="admins" className="mt-4">
          {admins.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No Admins yet. Add the first one above.
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden py-0">
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
                              <span className="font-medium">{admin.name}</span>
                              <span className="text-xs text-muted-foreground sm:hidden">{admin.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{admin.email}</TableCell>
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
          )}
        </TabsContent>

        {/* Tab 2: Payment History & Records */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Tenant Name, Email, or UTR..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-xs">
                {["all", "pending", "approved", "rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                      paymentStatusFilter === st
                        ? "bg-primary text-primary-foreground shadow-sm"
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
                className="h-9 text-xs gap-1.5"
                onClick={() => exportPaymentsCsv(filteredPayments)}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant / Admin</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>UTR Number</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      No payment records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{p.admin_name}</span>
                          <span className="text-xs text-muted-foreground">{p.admin_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        ₹{Number(p.amount).toLocaleString("en-IN")}
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
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
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
                        <span className="font-bold text-foreground">{ad.name}</span>
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
    </div>
  );
}


