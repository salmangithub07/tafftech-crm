"use client";

import * as React from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  FileText,
  MessageSquare,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Activity,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Customer, Appointment, Bill, Quotation } from "@/lib/types";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CustomerProfileDialog({
  customerId,
  open,
  onOpenChange,
  onOpenAppointmentDialog,
  onOpenBillDialog,
  onOpenQuotationDialog,
  onCustomerUpdated,
}: {
  customerId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAppointmentDialog?: (customerId: number) => void;
  onOpenBillDialog?: (customerId: number) => void;
  onOpenQuotationDialog?: (customerId: number) => void;
  onCustomerUpdated?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<{
    customer: Customer;
    summary: {
      totalRevenue: number;
      totalPaid: number;
      outstandingBalance: number;
      appointmentCount: number;
      billCount: number;
      quotationCount: number;
    };
    appointments: Appointment[];
    bills: Bill[];
    quotations: Quotation[];
    timeline: Array<{
      id: string;
      type: "appointment" | "bill" | "quotation" | "activity";
      title: string;
      date: string;
      timestamp: string;
      status?: string;
      amount?: number;
      paidAmount?: number;
      actorName?: string;
      details?: string | null;
      entityId?: number;
    }>;
  } | null>(null);

  const fetchProfile = React.useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/profile`);
      if (!res.ok) {
        throw new Error("Failed to fetch customer profile");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to load 360° profile");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    if (open && customerId) {
      fetchProfile();
    }
  }, [open, customerId, fetchProfile]);

  if (!open || !customerId) return null;

  const c = data?.customer;
  const s = data?.summary;
  const initialLetter = c?.name ? c.name.charAt(0).toUpperCase() : "C";

  const cleanPhone = c?.phone ? c.phone.replace(/[^0-9]/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="size-5 text-primary" />
            Customer 360° Profile
          </DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Clock className="size-6 animate-spin text-primary" />
            Loading customer timeline &amp; financial history...
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-2">
            {/* Header Banner */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg border border-primary/20">
                  {initialLetter}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground">{c?.name}</h2>
                    {c?.status && (
                      <Badge
                        variant={
                          c.status === "active"
                            ? "success"
                            : c.status === "lead"
                            ? "warning"
                            : "outline"
                        }
                        className="capitalize text-xs"
                      >
                        {c.status}
                      </Badge>
                    )}
                    {c?.visited === 1 ? (
                      <Badge variant="success" className="gap-1 text-xs">
                        <CheckCircle2 className="size-3" /> Visited
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" /> Visit Pending
                      </Badge>
                    )}
                  </div>

                  {c?.product && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Building2 className="size-3 text-primary" /> Product/Interest: <span className="font-medium text-foreground">{c.product}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                    {c?.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                        <Phone className="size-3" /> {c.phone}
                      </a>
                    )}
                    {c?.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                        <Mail className="size-3" /> {c.email}
                      </a>
                    )}
                    {c?.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {c.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end border-t pt-3 sm:border-t-0 sm:pt-0">
                {whatsappUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    asChild
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="size-3.5" /> WhatsApp
                    </a>
                  </Button>
                )}
                {onOpenAppointmentDialog && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenAppointmentDialog(customerId);
                    }}
                  >
                    <Calendar className="size-3.5" /> Appointment
                  </Button>
                )}
                {onOpenBillDialog && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenBillDialog(customerId);
                    }}
                  >
                    <Receipt className="size-3.5" /> Bill
                  </Button>
                )}
              </div>
            </div>

            {/* Financial Metrics Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 p-3">
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Billed</p>
                <p className="font-mono text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {money(s?.totalRevenue || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s?.billCount || 0} Bills Issued</p>
              </div>

              <div className="rounded-xl border bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 p-3">
                <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Total Paid</p>
                <p className="font-mono text-base sm:text-lg font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                  {money(s?.totalPaid || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Received Payments</p>
              </div>

              <div className={`rounded-xl border p-3 ${(s?.outstandingBalance || 0) > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200" : "bg-muted/20 border-border"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outstanding</p>
                <p className={`font-mono text-base sm:text-lg font-bold mt-0.5 ${(s?.outstandingBalance || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {money(s?.outstandingBalance || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Due Balance</p>
              </div>

              <div className="rounded-xl border bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/20 p-3">
                <p className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider">Appointments</p>
                <p className="font-mono text-base sm:text-lg font-bold text-purple-700 dark:text-purple-400 mt-0.5">
                  {s?.appointmentCount || 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Scheduled Visits</p>
              </div>
            </div>

            {/* Tabs for Timeline, Appointments, Bills, Quotations, Notes */}
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="w-full grid grid-cols-5 h-9 p-1">
                <TabsTrigger value="timeline" className="text-[11px] sm:text-xs px-1 py-1 gap-1">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="appointments" className="text-[11px] sm:text-xs px-1 py-1 gap-1">
                  <span className="sm:hidden">Appts</span>
                  <span className="hidden sm:inline">Appointments</span>
                </TabsTrigger>
                <TabsTrigger value="bills" className="text-[11px] sm:text-xs px-1 py-1 gap-1">
                  Bills
                </TabsTrigger>
                <TabsTrigger value="quotations" className="text-[11px] sm:text-xs px-1 py-1 gap-1">
                  <span className="sm:hidden">Quotes</span>
                  <span className="hidden sm:inline">Quotations</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-[11px] sm:text-xs px-1 py-1 gap-1">
                  Details
                </TabsTrigger>
              </TabsList>

              {/* -------------------- 1. TIMELINE FEED -------------------- */}
              <TabsContent value="timeline" className="pt-4">
                {data.timeline.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">No history logged for this customer yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {data.timeline.map((item) => {
                      let icon = <Activity className="size-3.5" />;
                      let iconBg = "bg-muted text-muted-foreground";

                      if (item.type === "appointment") {
                        icon = <Calendar className="size-3.5" />;
                        iconBg = "bg-purple-500/15 text-purple-600 dark:text-purple-400";
                      } else if (item.type === "bill") {
                        icon = <Receipt className="size-3.5" />;
                        iconBg = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
                      } else if (item.type === "quotation") {
                        icon = <FileText className="size-3.5" />;
                        iconBg = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
                      } else if (item.type === "activity") {
                        icon = <User className="size-3.5" />;
                        iconBg = "bg-blue-500/15 text-blue-600 dark:text-blue-400";
                      }

                      return (
                        <div key={item.id} className="relative group">
                          {/* Timeline dot */}
                          <div className={`absolute -left-6 top-1 flex size-5 items-center justify-center rounded-full border border-border ${iconBg}`}>
                            {icon}
                          </div>

                          <div className="rounded-lg border p-3 bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm text-foreground">{item.title}</p>
                                {item.actorName && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">By {item.actorName}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.amount !== undefined && (
                                  <span className="font-mono text-xs font-bold text-foreground">
                                    {money(item.amount)}
                                  </span>
                                )}
                                {item.status && (
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {item.status}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {item.details && (
                              <p className="text-xs text-muted-foreground mt-2 bg-muted/20 p-2 rounded border border-border/40">
                                {item.details}
                              </p>
                            )}

                            <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                              {item.date ? new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* -------------------- 2. APPOINTMENTS -------------------- */}
              <TabsContent value="appointments" className="pt-4">
                {data.appointments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No appointments scheduled yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {data.appointments.map((ap) => (
                      <div key={ap.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                        <div>
                          <p className="font-medium text-sm text-foreground">{ap.title || "Scheduled Visit"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Date: {ap.appointment_date} {ap.appointment_time ? `• ${ap.appointment_time}` : ""}
                          </p>
                          {ap.remarks && <p className="text-xs text-muted-foreground mt-1">{ap.remarks}</p>}
                        </div>
                        <Badge
                          variant={
                            ap.status === "completed"
                              ? "success"
                              : ap.status === "cancelled"
                              ? "destructive"
                              : "warning"
                          }
                          className="capitalize text-xs"
                        >
                          {ap.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* -------------------- 3. BILLS -------------------- */}
              <TabsContent value="bills" className="pt-4">
                {data.bills.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No bills generated yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {data.bills.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                        <div>
                          <p className="font-medium text-sm text-foreground">Bill #{b.bill_number}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Date: {b.bill_date} • Paid: {money(Number(b.paid_amount))} / {money(Number(b.total_amount))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">{money(Number(b.total_amount))}</span>
                          <Badge
                            variant={
                              b.payment_status === "paid"
                                ? "success"
                                : b.payment_status === "partial"
                                ? "warning"
                                : "destructive"
                            }
                            className="capitalize text-xs"
                          >
                            {b.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* -------------------- 4. QUOTATIONS -------------------- */}
              <TabsContent value="quotations" className="pt-4">
                {data.quotations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No quotations issued yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {data.quotations.map((q) => (
                      <div key={q.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                        <div>
                          <p className="font-medium text-sm text-foreground">Quotation #{q.id}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Date: {q.quotation_date}
                          </p>
                          {q.notes && <p className="text-xs text-muted-foreground mt-1">{q.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">{money(Number(q.quotation_amount))}</span>
                          <Badge
                            variant={
                              q.quotation_status === "accepted"
                                ? "success"
                                : q.quotation_status === "rejected"
                                ? "destructive"
                                : "warning"
                            }
                            className="capitalize text-xs"
                          >
                            {q.quotation_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* -------------------- 5. NOTES & DETAILS -------------------- */}
              <TabsContent value="notes" className="pt-4">
                <div className="rounded-lg border p-4 bg-card flex flex-col gap-3">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Internal Customer Notes</h4>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap bg-muted/20 p-3 rounded border">
                      {c?.notes || "No internal notes recorded for this customer."}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground font-semibold">Registered Date:</span>
                      <p className="text-foreground font-mono mt-0.5">{c?.created_at ? new Date(c.created_at).toLocaleString("en-IN") : "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold">Added By:</span>
                      <p className="text-foreground mt-0.5">{c?.created_by_name || "System Admin"}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
