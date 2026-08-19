"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreVertical,
  Trash2,
  Download,
  Receipt,
  Printer,
  Search,
  Eye,
  FileCheck,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DateFilter, dateFilterParams, type DateFilterValue } from "@/components/ui/date-filter";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { GenerateBillDialog } from "@/components/bills/generate-bill-dialog";
import { BillDetailsDialog } from "@/components/bills/bill-details-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CustomerProfileDialog } from "@/components/customers/customer-profile-dialog";
import { RecordPaymentDialog } from "@/components/bills/record-payment-dialog";
import type { Bill } from "@/lib/types";

function money(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function BillsClient() {
  const router = useRouter();
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState({ totalInvoiced: 0, totalCollected: 0, totalPending: 0 });
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [viewingBill, setViewingBill] = React.useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = React.useState<Bill | null>(null);
  const [paymentBill, setPaymentBill] = React.useState<Bill | null>(null);
  const [profileCustomerId, setProfileCustomerId] = React.useState<number | null>(null);

  const fetchBills = React.useCallback(async () => {
    setLoading(true);
    setTotal(0);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(search ? { search } : {}),
        ...(status !== "all" ? { status } : {}),
        ...dateFilterParams(dateFilter),
      });
      const res = await fetch(`/api/bills?${params}`);
      if (res.ok) {
        const json = await res.json();
        setBills(json.data || []);
        setTotal(json.total ?? 0);
        setStats(json.stats || { totalInvoiced: 0, totalCollected: 0, totalPending: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, dateFilter]);

  React.useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  async function handleDelete(bill: Bill) {
    const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete bill.");
      return;
    }
    toast.success("Bill deleted.");
    fetchBills();
  }

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status } : {}),
      ...dateFilterParams(dateFilter),
    });
    return `/api/bills/export?${params}`;
  }, [search, status, dateFilter]);

  const exportLabel = React.useMemo(() => {
    const parts: string[] = [];
    if (status !== "all") parts.push(status.charAt(0).toUpperCase() + status.slice(1));
    if (dateFilter.period && dateFilter.period !== "all") parts.push(dateFilter.period);
    if (search) parts.push(`"${search}"`);
    return parts.length ? parts.join(" · ") : "All";
  }, [search, status, dateFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header - 50/50 2 Columns on Mobile */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        {/* Left Column (50%) */}
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Bills &amp; Invoices</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
            Generate, manage, and print official customer bills and tax invoices.
          </p>
        </div>

        {/* Right Column (50%) */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[130px] sm:min-w-0 sm:flex-row sm:items-center sm:gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto h-9 px-3 text-xs font-semibold gap-1 shadow-sm">
            <Plus className="size-4" /> Create Bill
          </Button>

          <Button variant="outline" size="sm" asChild title={`Export: ${exportLabel}`} className="w-full sm:w-auto h-8 px-2 text-[11px] font-medium justify-center gap-1">
            <Link href={exportUrl}>
              <Download className="size-3" /> Export CSV
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Outstanding/Pending is col-span-2 on Mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        {/* Card 1: Total Invoiced */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="space-y-0.5 min-w-0 flex-1 pr-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Total Invoiced
              </p>
              <p className="font-mono text-base xs:text-lg sm:text-2xl font-extrabold tracking-tight text-foreground truncate" title={money(stats.totalInvoiced)}>
                {money(stats.totalInvoiced)}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                {total} bills recorded
              </p>
            </div>
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <Receipt className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 2: Total Collected */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="space-y-0.5 min-w-0 flex-1 pr-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Total Collected
              </p>
              <p className="font-mono text-base xs:text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 truncate" title={money(stats.totalCollected)}>
                {money(stats.totalCollected)}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                Paid in full or partial
              </p>
            </div>
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <CheckCircle2 className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 3: Outstanding / Pending */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-amber-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="space-y-0.5 min-w-0 flex-1 pr-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Outstanding / Pending
              </p>
              <p className="font-mono text-base xs:text-lg sm:text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 truncate" title={money(stats.totalPending)}>
                {money(stats.totalPending)}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80 truncate">
                Uncollected balance
              </p>
            </div>
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <AlertCircle className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search Bill #, Customer, Phone..."
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <DateFilter value={dateFilter} onChange={(df) => { setDateFilter(df); setPage(1); }} />
        </div>

        <Tabs value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-none py-0.5">
            <TabsList className="w-max sm:w-fit justify-start sm:justify-center h-9 sm:h-10 p-1 gap-1">
              <TabsTrigger value="all" className="px-2.5 sm:px-3 text-xs whitespace-nowrap">All Bills</TabsTrigger>
              <TabsTrigger value="paid" className="px-2.5 sm:px-3 text-xs whitespace-nowrap">Paid</TabsTrigger>
              <TabsTrigger value="unpaid" className="px-2.5 sm:px-3 text-xs whitespace-nowrap">Unpaid</TabsTrigger>
              <TabsTrigger value="partial" className="px-2.5 sm:px-3 text-xs whitespace-nowrap">Partial</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Bills Table */}
      {bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {loading ? "Loading bills..." : "No bills found matching filters."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium text-primary">
                      <button
                        className="hover:underline focus:outline-none text-left"
                        onClick={() => setViewingBill(b)}
                      >
                        {b.bill_number}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{b.bill_date}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <button
                          onClick={() => setProfileCustomerId(b.customer_id ?? null)}
                          className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {b.customer_name}
                        </button>
                        {b.customer_phone && <span className="text-xs text-muted-foreground">{b.customer_phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.items?.length ?? 1} item{(b.items?.length ?? 1) > 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{money(b.total_amount)}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{money(b.paid_amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          b.payment_status === "paid" ? "success" :
                          b.payment_status === "unpaid" ? "destructive" : "warning"
                        }
                        className="uppercase"
                      >
                        {b.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {b.payment_status !== "paid" && (
                            <DropdownMenuItem
                              onClick={() => setPaymentBill(b)}
                              className="text-emerald-600 dark:text-emerald-400 font-medium"
                            >
                              <DollarSign className="size-4" /> Record Payment
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setViewingBill(b)}>
                            <Eye className="size-4" /> View / Print
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingBill(b)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
            />
          </Card>

          {/* Mobile Card View */}
          <div className="flex flex-col gap-3 md:hidden">
            {bills.map((b) => (
              <Card key={b.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        className="font-mono text-sm font-bold text-primary hover:underline"
                        onClick={() => setViewingBill(b)}
                      >
                        {b.bill_number}
                      </button>
                      <p className="font-medium text-sm text-foreground mt-0.5">{b.customer_name}</p>
                      {b.customer_phone && (
                        <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          b.payment_status === "paid" ? "success" :
                          b.payment_status === "unpaid" ? "destructive" : "warning"
                        }
                        className="uppercase text-[10px]"
                      >
                        {b.payment_status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 -mr-2">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {b.payment_status !== "paid" && (
                            <DropdownMenuItem
                              onClick={() => setPaymentBill(b)}
                              className="text-emerald-600 dark:text-emerald-400 font-medium"
                            >
                              <DollarSign className="size-4" /> Record Payment
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setViewingBill(b)}>
                            <Eye className="size-4" /> View / Print
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingBill(b)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px]">Total Amount</span>
                      <span className="font-mono font-bold text-foreground text-sm">{money(b.total_amount)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-muted-foreground text-[10px]">Paid Amount</span>
                      <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{money(b.paid_amount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>Date: {b.bill_date}</span>
                    <span>{b.items?.length ?? 1} item{(b.items?.length ?? 1) > 1 ? "s" : ""}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
            />
          </div>
        </>
      )}

      {/* Dialogs */}
      <GenerateBillDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={fetchBills}
      />

      {viewingBill && (
        <BillDetailsDialog
          open={!!viewingBill}
          onOpenChange={(op) => !op && setViewingBill(null)}
          bill={viewingBill}
        />
      )}

      {deletingBill && (
        <ConfirmDeleteDialog
          open={!!deletingBill}
          onOpenChange={(op) => !op && setDeletingBill(null)}
          title={`Delete Bill ${deletingBill.bill_number}?`}
          description="This action cannot be undone."
          onConfirm={() => handleDelete(deletingBill)}
        />
      )}

      <CustomerProfileDialog
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onOpenChange={(open) => !open && setProfileCustomerId(null)}
        onCustomerUpdated={fetchBills}
      />

      <RecordPaymentDialog
        open={!!paymentBill}
        onOpenChange={(open) => !open && setPaymentBill(null)}
        bill={paymentBill}
        onSaved={fetchBills}
      />
    </div>
  );
}
