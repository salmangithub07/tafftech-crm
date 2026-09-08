"use client";

import * as React from "react";
import {
  TrendingUp,
  IndianRupee,
  Receipt,
  Users,
  CalendarCheck2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Award,
  PackageCheck,
  ChevronRight,
  Loader2,
  RefreshCw,
  Info,
  UserCheck,
  PhoneCall,
  XCircle,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsWrapper } from "@/components/ui/scrollable-tabs-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type TimeframeType = "daily" | "weekly" | "yearly";

// Custom Tooltip component for clean cards without zero clutter
function CustomChartTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload || !payload.length) return null;

  // Filter non-zero entries or show all if all are 0
  const validItems = payload.filter((p: any) => Number(p.value) > 0);
  const itemsToRender = validItems.length > 0 ? validItems : payload;

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs min-w-[160px] space-y-1.5 z-50">
      <p className="font-bold text-foreground border-b border-border/60 pb-1 flex items-center justify-between">
        <span>📅 {label}</span>
      </p>
      <div className="space-y-1">
        {itemsToRender.map((entry: any, index: number) => {
          const formattedVal = isCurrency && (entry.dataKey.includes("amount") || entry.name.includes("₹"))
            ? `₹${Number(entry.value).toLocaleString("en-IN")}`
            : Number(entry.value).toLocaleString("en-IN");

          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill || entry.stroke }}
                />
                <span className="text-muted-foreground truncate">{entry.name}:</span>
              </div>
              <span className="font-bold font-mono text-foreground">{formattedVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformanceClient() {
  const [timeframe, setTimeframe] = React.useState<TimeframeType>("daily");
  const [days, setDays] = React.useState("30");
  const [selectedYear, setSelectedYear] = React.useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = React.useState("customers");
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe,
        days,
        year: selectedYear,
      });
      const res = await fetch(`/api/performance?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load performance analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, days, selectedYear]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = data?.kpis || {
    revenue_collected: 0,
    revenue_growth: 0,
    total_invoiced: 0,
    success_bills: 0,
    success_bills_growth: 0,
    new_customers: 0,
    new_customers_growth: 0,
    completed_appointments: 0,
    completed_appointments_growth: 0,
    total_quotations: 0,
  };

  const timeline: any[] = data?.timeline || [];
  const topProducts = data?.topProducts || [];
  const executives = data?.executiveLeaderboard || [];

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString("en-IN")}`;
  };

  // Funnel calculations
  const totalLeads = kpis.new_customers || 0;
  const totalQuotes = kpis.total_quotations || 0;
  const totalAppts = kpis.completed_appointments || 0;
  const totalWonBills = kpis.success_bills || 0;

  const quoteRate = totalLeads > 0 ? Math.min(100, Math.round((totalQuotes / totalLeads) * 100)) : 0;
  const apptRate = totalQuotes > 0 ? Math.min(100, Math.round((totalAppts / totalQuotes) * 100)) : 0;
  const wonRate = totalLeads > 0 ? Math.min(100, Math.round((totalWonBills / totalLeads) * 100)) : 0;

  // Aggregate customer status sums
  const customerStatusSums = React.useMemo(() => {
    return timeline.reduce(
      (acc, t) => ({
        leads: acc.leads + (t.leads || 0),
        contacted: acc.contacted + (t.contacted || 0),
        quote_sent: acc.quote_sent + (t.quote_sent || 0),
        won: acc.won + (t.won || 0),
        lost: acc.lost + (t.lost || 0),
      }),
      { leads: 0, contacted: 0, quote_sent: 0, won: 0, lost: 0 }
    );
  }, [timeline]);

  // Aggregate appointments status sums
  const appointmentStatusSums = React.useMemo(() => {
    return timeline.reduce(
      (acc, t) => ({
        completed: acc.completed + (t.completed || 0),
        scheduled: acc.scheduled + (t.scheduled || 0),
        cancelled: acc.cancelled + (t.cancelled || 0),
        total: acc.total + (t.total_appointments || 0),
      }),
      { completed: 0, scheduled: 0, cancelled: 0, total: 0 }
    );
  }, [timeline]);

  // Peak activity day detection
  const peakRevenueDay = React.useMemo(() => {
    if (!timeline.length) return null;
    return timeline.reduce((max, t) => (t.collected_amount > (max?.collected_amount || 0) ? t : max), null);
  }, [timeline]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Timeframe Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              <TrendingUp className="size-6 text-primary" /> Performance Graph
            </h1>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-primary/5 text-primary border-primary/20">
              Live Business Analytics
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
            Real-time visual intelligence on revenue, success bills, customer velocity &amp; service fulfillment.
          </p>
        </div>

        {/* Timeframe Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Timeframe Mode Selector */}
          <Select value={timeframe} onValueChange={(val: TimeframeType) => setTimeframe(val)}>
            <SelectTrigger className="h-9 text-xs w-[130px] font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">📅 Daily View</SelectItem>
              <SelectItem value="weekly">📆 Weekly View</SelectItem>
              <SelectItem value="yearly">📈 Yearly / Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Sub-selector for Daily or Yearly */}
          {timeframe === "daily" && (
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-9 text-xs w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="14">Last 14 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          )}

          {timeframe === "yearly" && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-xs w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={loading}
            className="size-9 shrink-0"
            title="Refresh analytics data"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards (With Growth Comparison Badges) - Reordered: Customers, Appointments, Bills, Revenue */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        {/* Card 1: Customers Acquired */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-blue-500/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-blue-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Customers Added
              </p>
              <p className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {kpis.new_customers}
              </p>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                {kpis.new_customers_growth >= 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <ArrowUpRight className="size-3" /> +{kpis.new_customers_growth}%
                  </span>
                ) : (
                  <span className="font-semibold text-rose-600 flex items-center">
                    <ArrowDownRight className="size-3" /> {kpis.new_customers_growth}%
                  </span>
                )}
                <span className="text-muted-foreground truncate">pipeline leads</span>
              </div>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <Users className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 2: Completed Appointments */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-purple-500/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Completed Meetings
              </p>
              <p className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {kpis.completed_appointments}
              </p>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                {kpis.completed_appointments_growth >= 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <ArrowUpRight className="size-3" /> +{kpis.completed_appointments_growth}%
                  </span>
                ) : (
                  <span className="font-semibold text-rose-600 flex items-center">
                    <ArrowDownRight className="size-3" /> {kpis.completed_appointments_growth}%
                  </span>
                )}
                <span className="text-muted-foreground truncate">fulfilled visits</span>
              </div>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <CalendarCheck2 className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 3: Success (Paid) Bills */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Success Bills
              </p>
              <p className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-foreground">
                {kpis.success_bills} <span className="text-xs text-muted-foreground font-normal">paid</span>
              </p>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                {kpis.success_bills_growth >= 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <ArrowUpRight className="size-3" /> +{kpis.success_bills_growth}%
                  </span>
                ) : (
                  <span className="font-semibold text-rose-600 flex items-center">
                    <ArrowDownRight className="size-3" /> {kpis.success_bills_growth}%
                  </span>
                )}
                <span className="text-muted-foreground truncate">closed bills</span>
              </div>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <Receipt className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 4: Total Revenue Collected */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/5 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Collected Revenue
              </p>
              <p className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate" title={formatCurrency(kpis.revenue_collected)}>
                {formatCurrency(kpis.revenue_collected)}
              </p>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
                {kpis.revenue_growth >= 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <ArrowUpRight className="size-3" /> +{kpis.revenue_growth}%
                  </span>
                ) : (
                  <span className="font-semibold text-rose-600 flex items-center">
                    <ArrowDownRight className="size-3" /> {kpis.revenue_growth}%
                  </span>
                )}
                <span className="text-muted-foreground truncate">vs prev period</span>
              </div>
            </div>
            <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <IndianRupee className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Auto Smart Business Insight Banner */}
      {peakRevenueDay && peakRevenueDay.collected_amount > 0 && (
        <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent rounded-xl border border-emerald-500/20 flex items-center gap-2.5 text-xs">
          <Sparkles className="size-4 text-emerald-600 shrink-0" />
          <p className="text-foreground leading-snug">
            <strong>Key Business Takeaway:</strong> Peak cash flow occurred on <strong>{peakRevenueDay.label}</strong> with{" "}
            <strong>{formatCurrency(peakRevenueDay.collected_amount)}</strong> collected across{" "}
            <strong>{peakRevenueDay.success_bills} success bills</strong>. Total conversion win rate is{" "}
            <strong>{wonRate}%</strong>.
          </p>
        </div>
      )}

      {/* Main Interactive Graphs & Visual Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollableTabsWrapper>
          <TabsList className="w-max sm:w-fit justify-start h-9 sm:h-10 p-1 gap-1">
            <TabsTrigger value="customers" className="gap-1.5 text-xs sm:text-sm px-3">
              <Users className="size-3.5" /> Customers (Status-wise)
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-1.5 text-xs sm:text-sm px-3">
              <CalendarCheck2 className="size-3.5" /> Appointments Fulfillment
            </TabsTrigger>
            <TabsTrigger value="revenue" className="gap-1.5 text-xs sm:text-sm px-3">
              <IndianRupee className="size-3.5" /> Revenue &amp; Bills Velocity
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-1.5 text-xs sm:text-sm px-3">
              <Layers className="size-3.5" /> Conversion Funnel &amp; Leaderboard
            </TabsTrigger>
          </TabsList>
        </ScrollableTabsWrapper>

        {/* ----------------- TAB 1: CUSTOMERS STATUS-WISE ----------------- */}
        <TabsContent value="customers" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="size-4 text-blue-600" /> Customer Acquisition &amp; Status Velocity
                </CardTitle>
                <CardDescription className="text-xs">
                  Visual distribution across pipeline stages: Leads, Contacted (including Appointments), Quote Sent, Won &amp; Lost.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                {kpis.new_customers} Total Registered Leads
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              {timeline.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No customer registrations recorded in this period.
                </div>
              ) : (
                <div className="h-[300px] sm:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeline} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} minTickGap={15} />
                      <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomChartTooltip isCurrency={false} />} />
                      <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                      <Bar dataKey="won" name="Won / Converted" fill="#10b981" stackId="status" radius={[0, 0, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="quote_sent" name="Quote Sent" fill="#8b5cf6" stackId="status" radius={[0, 0, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="contacted" name="Contacted" fill="#f59e0b" stackId="status" radius={[0, 0, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="leads" name="New Leads" fill="#3b82f6" stackId="status" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="lost" name="Lost" fill="#f43f5e" stackId="status" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Customers 4-Status Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t mt-4">
                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">New Leads</span>
                    <span className="font-bold text-base text-blue-600">{customerStatusSums.leads} Registered</span>
                  </div>
                  <UserCheck className="size-5 text-blue-500" />
                </div>
                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">In Contacted State</span>
                    <span className="font-bold text-base text-amber-600">{customerStatusSums.contacted} In Progress</span>
                  </div>
                  <PhoneCall className="size-5 text-amber-500" />
                </div>
                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Quotes Dispatched</span>
                    <span className="font-bold text-base text-purple-600">{customerStatusSums.quote_sent} Quotes</span>
                  </div>
                  <FileText className="size-5 text-purple-500" />
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Won / Converted</span>
                    <span className="font-bold text-base text-emerald-600">
                      {customerStatusSums.won} Won ({wonRate}%)
                    </span>
                  </div>
                  <CheckCircle2 className="size-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 2: APPOINTMENTS FULFILLMENT ----------------- */}
        <TabsContent value="appointments" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarCheck2 className="size-4 text-purple-600" /> Appointments Scheduled vs Completed
                </CardTitle>
                <CardDescription className="text-xs">
                  Track client visit attendance, service executions, and cancelled bookings.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                {kpis.completed_appointments} Meetings Fulfilled
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              {timeline.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No appointments recorded in this period.
                </div>
              ) : (
                <div className="h-[300px] sm:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeline} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} minTickGap={15} />
                      <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomChartTooltip isCurrency={false} />} />
                      <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                      <Bar dataKey="completed" name="Completed Visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="scheduled" name="Scheduled / Pending" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.6} />
                      <Bar dataKey="cancelled" name="Cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Appointments 3-Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t mt-4">
                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Completed Meetings</span>
                    <span className="font-bold text-base text-purple-600">
                      {appointmentStatusSums.completed} Visits (
                      {appointmentStatusSums.total > 0
                        ? `${Math.round((appointmentStatusSums.completed / appointmentStatusSums.total) * 100)}%`
                        : "100%"}
                      )
                    </span>
                  </div>
                  <CheckCircle2 className="size-5 text-purple-500" />
                </div>
                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Scheduled / Upcoming</span>
                    <span className="font-bold text-base text-blue-600">{appointmentStatusSums.scheduled} Pending</span>
                  </div>
                  <Clock className="size-5 text-blue-500" />
                </div>
                <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Cancelled Bookings</span>
                    <span className="font-bold text-base text-rose-600">{appointmentStatusSums.cancelled} Cancelled</span>
                  </div>
                  <XCircle className="size-5 text-rose-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 3: REVENUE & BILLS VELOCITY ----------------- */}
        <TabsContent value="revenue" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="size-4 text-emerald-600" /> Revenue Invoiced vs Collected (₹) &amp; Success Bills
                </CardTitle>
                <CardDescription className="text-xs">
                  Dual-axis trajectory tracking cash flow and closed payment velocity over the selected {timeframe} interval.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Total Collected: {formatCurrency(kpis.revenue_collected)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              {timeline.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No billing transactions found in this timeframe.
                </div>
              ) : (
                <div className="h-[300px] sm:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timeline} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} minTickGap={15} />
                      <YAxis
                        yAxisId="left"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        allowDecimals={false}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                      <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                      <Bar yAxisId="left" dataKey="invoiced_amount" name="Invoiced (₹)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.6} />
                      <Bar yAxisId="left" dataKey="collected_amount" name="Collected (₹)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="success_bills"
                        name="Success Bills Count"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={(props: any) =>
                          props.payload.success_bills > 0 ? (
                            <circle cx={props.cx} cy={props.cy} r={3.5} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} />
                          ) : null
                        }
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sub-breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t mt-4">
                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Fully Paid (Success)</span>
                    <span className="font-bold text-base text-emerald-600">{kpis.success_bills} Bills</span>
                  </div>
                  <CheckCircle2 className="size-5 text-emerald-500" />
                </div>
                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Total Invoiced Volume</span>
                    <span className="font-bold text-base text-amber-600">{formatCurrency(kpis.total_invoiced)}</span>
                  </div>
                  <FileText className="size-5 text-amber-500" />
                </div>
                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Payment Realization Rate</span>
                    <span className="font-bold text-base text-blue-600">
                      {kpis.total_invoiced > 0 ? `${Math.round((kpis.revenue_collected / kpis.total_invoiced) * 100)}%` : "100%"}
                    </span>
                  </div>
                  <Sparkles className="size-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 4: FUNNEL & LEADERBOARD ----------------- */}
        <TabsContent value="funnel" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Conversion Funnel */}
            <Card>
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="size-4 text-primary" /> End-to-End Sales Conversion Funnel
                </CardTitle>
                <CardDescription className="text-xs">
                  Efficiency of converting fresh leads into paid customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Step 1: Leads */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">1. Total Leads Registered</span>
                    <span className="font-bold text-blue-600">{totalLeads}</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-full" />
                  </div>
                </div>

                {/* Step 2: Quotes */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">2. Quotations Issued</span>
                    <span className="font-bold text-amber-600">{totalQuotes} ({quoteRate}%)</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${quoteRate}%` }} />
                  </div>
                </div>

                {/* Step 3: Appointments */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">3. Visits &amp; Demos Completed</span>
                    <span className="font-bold text-purple-600">{totalAppts} ({apptRate}%)</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${apptRate}%` }} />
                  </div>
                </div>

                {/* Step 4: Success Bills */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">4. Success Closed Bills (Won)</span>
                    <span className="font-bold text-emerald-600">{totalWonBills} ({wonRate}%)</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${wonRate}%` }} />
                  </div>
                </div>

                <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/20 text-xs flex items-center justify-between mt-2">
                  <span className="font-medium text-foreground">Overall Lead-to-Sale Conversion:</span>
                  <Badge variant="success" className="font-mono text-xs">
                    {wonRate}% Win Rate
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PackageCheck className="size-4 text-emerald-600" /> Top Revenue Products
                </CardTitle>
                <CardDescription className="text-xs">
                  Best performing stock items in the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No billed products found in this period.</p>
                ) : (
                  topProducts.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground truncate">{p.product_name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-600">{formatCurrency(p.total_revenue)}</div>
                        <span className="text-[10px] text-muted-foreground">{p.total_qty} units sold</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team / Executive Leaderboard */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="size-4 text-amber-500" /> Team Performance Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Performance breakdown across sales executives and team members.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {executives.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No executive activity recorded in this period.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {executives.map((ex: any, idx: number) => (
                    <div key={ex.id} className="p-3 bg-muted/20 rounded-xl border flex items-center justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground truncate">{ex.name}</span>
                          {idx === 0 && <span title="Top Producer">👑</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {ex.bills_count} Bills • {ex.appointments_completed} Visits
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-emerald-600 block">{formatCurrency(ex.revenue_generated)}</span>
                        <span className="text-[10px] text-muted-foreground">Realized</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
