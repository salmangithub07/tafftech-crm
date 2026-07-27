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

  const fetchBills = React.useCallback(async () => {
    setLoading(true);
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
        setTotal(json.total || 0);
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bills &amp; Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Generate, manage, and print official customer bills and tax invoices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={exportUrl}>
              <Download className="size-4" /> Export CSV
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Create Bill
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-md-4 gap-2 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Invoiced</CardTitle>
            <Receipt className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{money(stats.totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground mt-1">{total} bills recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Collected</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {money(stats.totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paid in full or partial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Outstanding / Pending</CardTitle>
            <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {money(stats.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Uncollected balance</p>
          </CardContent>
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
          <TabsList className="w-fit">
            <TabsTrigger value="all">All Bills</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
            <TabsTrigger value="partial">Partial</TabsTrigger>
          </TabsList>
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
        <Card className="overflow-hidden py-0">
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
                      <span className="font-medium">{b.customer_name}</span>
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
    </div>
  );
}
