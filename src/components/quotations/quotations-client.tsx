"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Printer,
  FileText,
  Receipt,
  RotateCcw,
  Pencil,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import { shareDocumentOnWhatsApp } from "@/lib/pdf-share";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CustomerProfileDialog } from "@/components/customers/customer-profile-dialog";
import type { Quotation, QuotationStatus } from "@/lib/types";

const statusVariant: Record<QuotationStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  accepted: "success",
  rejected: "destructive",
};

type FilterTab = "all" | QuotationStatus | "trash";
type Counts = { all: number; pending: number; accepted: number; rejected: number; trash: number };
const PAGE_SIZE_KEY = "nova-crm:pageSize:quotations";

function money(amt: number) {
  return `₹${Number(amt || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function QuotationsClient({ initialQuotations }: { initialQuotations: Quotation[] }) {
  const router = useRouter();
  const [quotations, setQuotations] = React.useState(initialQuotations);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ all: 0, pending: 0, accepted: 0, rejected: 0, trash: 0 });
  const [stats, setStats] = React.useState<{ totalValue: number; acceptedValue: number; pendingValue: number }>({
    totalValue: 0,
    acceptedValue: 0,
    pendingValue: 0,
  });
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = React.useState(false);

  const [deleting, setDeleting] = React.useState<Quotation | null>(null);
  const [profileCustomerId, setProfileCustomerId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    if (saved) setPageSize(Number(saved));
  }, []);

  const fetchQuotations = React.useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...(tab !== "all" ? { status: tab } : {}),
      ...dateFilterParams(dateFilter),
    });
    const res = await fetch(`/api/quotations?${params}`);
    if (res.ok) {
      const json = await res.json();
      setQuotations(json.data);
      setTotal(json.total);
      setCounts(json.counts);
      if (json.stats) setStats(json.stats);
    }
  }, [tab, page, pageSize, dateFilter]);

  React.useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  function changeTab(next: string) {
    setTab(next as FilterTab);
    setSelectedIds([]);
    setPage(1);
  }

  function changeDateFilter(next: DateFilterValue) {
    setDateFilter(next);
    setSelectedIds([]);
    setPage(1);
  }

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
    window.localStorage.setItem(PAGE_SIZE_KEY, String(size));
  }

  async function refresh() {
    await fetchQuotations();
    router.refresh();
  }

  // Selection helpers
  const isTrashTab = tab === "trash";
  const isAllSelected = quotations.length > 0 && quotations.every((q) => selectedIds.includes(q.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(quotations.map((q) => q.id));
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  // Bulk actions
  async function handleBulkTrash() {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/quotations/bulk-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selectedIds.length} quotation(s) moved to trash.`);
      setSelectedIds([]);
      refresh();
    } catch {
      toast.error("Failed to move quotations to trash.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkRestore() {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/quotations/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selectedIds.length} quotation(s) restored.`);
      setSelectedIds([]);
      refresh();
    } catch {
      toast.error("Failed to restore quotations.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/quotations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selectedIds.length} quotation(s) permanently deleted.`);
      setSelectedIds([]);
      refresh();
    } catch {
      toast.error("Failed to delete quotations permanently.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleEmptyTrash() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/quotations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Trash emptied (${data.count} deleted).`);
      setSelectedIds([]);
      setEmptyTrashConfirm(false);
      refresh();
    } catch {
      toast.error("Failed to empty trash.");
    } finally {
      setBulkLoading(false);
    }
  }

  function viewQuotationDetails(q: Quotation) {
    router.push(`/quotations/${q.id}`);
  }

  function handleGenerateBill(q: Quotation) {
    router.push(`/bills/new?quotation_id=${q.id}`);
  }

  function handleEditQuotation(q: Quotation) {
    router.push(`/quotations/${q.id}/edit`);
  }

  async function updateStatus(q: Quotation, status: QuotationStatus) {
    const res = await fetch(`/api/quotations/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quotation_status: status }),
    });
    if (!res.ok) {
      toast.error("Could not update status.");
      return;
    }
    toast.success("Quotation status updated.");
    refresh();
  }

  async function handleDelete(q: Quotation) {
    const isPermanent = isTrashTab;
    const res = await fetch(`/api/quotations/${q.id}${isPermanent ? "?permanent=true" : ""}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(isPermanent ? "Could not delete quotation permanently." : "Could not move quotation to trash.");
      return;
    }
    toast.success(isPermanent ? "Quotation permanently deleted." : "Quotation moved to trash.");
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header - 2 Columns on Mobile */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        {/* Left Column */}
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Quotations Invoices</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
            Manage, generate, and print customer quotations.
          </p>
        </div>

        {/* Right Column */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[130px] sm:min-w-0 sm:flex-row sm:items-center sm:gap-2">
          <Button size="sm" onClick={() => router.push("/quotations/new")} className="w-full sm:w-auto h-9 px-3 text-xs font-semibold gap-1.5 shadow-sm">
            <Plus className="size-4" /> Create Quotation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        {/* Card 1: Total Quotations */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="space-y-0.5 min-w-0 flex-1 pr-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Total Quotations
              </p>
              <p className="font-heading text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {counts.all}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-primary truncate">
                quotations recorded
              </p>
            </div>
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <FileText className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 2: Accepted Quotations */}
        <Card className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/5 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="space-y-0.5 min-w-0 flex-1 pr-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Accepted Quotations
              </p>
              <p className="font-heading text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
                {counts.accepted}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                accepted / billed
              </p>
            </div>
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <CheckCircle2 className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>

        {/* Card 3: Pending Quotations (Full width on mobile col-span-2) */}
        <Card className="col-span-2 sm:col-span-1 group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-amber-500/30 transition-all duration-300">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="space-y-0.5 min-w-0 flex-1 pr-0.5">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Pending Quotations
              </p>
              <p className="font-heading text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 truncate">
                {counts.pending}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80 truncate">
                awaiting approval
              </p>
            </div>
            <div className="flex size-8 xs:size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-all duration-300 shadow-xs">
              <Clock className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="overflow-x-auto -mx-1 px-1 py-0.5 no-scrollbar sm:overflow-visible">
            <TabsList className="w-max sm:w-fit justify-start h-9 sm:h-10 p-1 gap-1">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({counts.accepted})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
              <TabsTrigger value="trash">Trash ({counts.trash})</TabsTrigger>
            </TabsList>
          </div>
          <DateFilter value={dateFilter} onChange={changeDateFilter} />
        </div>
      </Tabs>

      {/* Bulk action toolbar */}
      {(selectedIds.length > 0 || (isTrashTab && counts.trash > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 border rounded-lg text-sm">
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Badge variant="secondary" className="font-semibold">
                {selectedIds.length} selected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                {isTrashTab ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkLoading}
                      onClick={handleBulkRestore}
                      className="gap-1 text-xs"
                    >
                      <RotateCcw className="size-3.5" /> Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={bulkLoading}
                      onClick={handleBulkDelete}
                      className="gap-1 text-xs"
                    >
                      <Trash2 className="size-3.5" /> Delete Permanently
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkLoading}
                    onClick={handleBulkTrash}
                    className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" /> Move to Trash
                  </Button>
                )}
              </>
            )}

            {isTrashTab && counts.trash > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={bulkLoading}
                onClick={() => setEmptyTrashConfirm(true)}
                className="gap-1 text-xs text-rose-600 border-rose-500/40 hover:bg-rose-500/10"
              >
                <Trash2 className="size-3.5" /> Empty Trash
              </Button>
            )}
          </div>
        </div>
      )}

      {quotations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {isTrashTab ? "Trash is empty." : "No quotations found."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => {
                  const docNo = q.quotation_number || `QT-${q.id}`;
                  const isSelected = selectedIds.includes(q.id);
                  return (
                    <TableRow key={q.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(q.id)}
                          aria-label={`Select quotation`}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        <button
                          onClick={() => viewQuotationDetails(q)}
                          className="font-mono font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {docNo}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => setProfileCustomerId(q.customer_id || null)}
                          className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
                        >
                          {q.customer_name ?? "—"}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        ₹{Number(q.total_amount || q.quotation_amount || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{q.quotation_date}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[q.quotation_status]} className="capitalize">
                          {q.quotation_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{q.created_by_name || "—"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isTrashTab ? (
                              <>
                                <DropdownMenuItem onClick={() => viewQuotationDetails(q)}>
                                  <Printer className="size-4" /> View / Print
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    shareDocumentOnWhatsApp({
                                      docId: q.id,
                                      docType: "Quotation",
                                      docNumber: q.quotation_number || `QT-${q.id}`,
                                      customerName: q.customer_name,
                                      customerPhone: q.customer_phone,
                                      totalAmount: Number(q.total_amount || q.quotation_amount || 0),
                                      date: q.quotation_date,
                                    });
                                  }} 
                                  className="text-emerald-600 dark:text-emerald-400 font-medium"
                                >
                                  <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" /> Share on WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditQuotation(q)}>
                                  <Pencil className="size-4 text-primary" /> Edit Quotation
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateBill(q)}>
                                  <Receipt className="size-4 text-primary" /> Generate Bill
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q, "accepted")}>
                                  <CheckCircle2 className="size-4" /> Mark accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q, "rejected")}>
                                  <XCircle className="size-4" /> Mark rejected
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q, "pending")}>
                                  <Clock className="size-4" /> Mark pending
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(q)}>
                                  <Trash2 className="size-4" /> Move to Trash
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={async () => {
                                  await fetch("/api/quotations/bulk-restore", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ids: [q.id] }),
                                  });
                                  toast.success("Quotation restored.");
                                  refresh();
                                }}>
                                  <RotateCcw className="size-4" /> Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(q)}>
                                  <Trash2 className="size-4" /> Delete Permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          </Card>

          {/* Mobile Card View */}
          <div className="flex flex-col gap-3 md:hidden">
            {quotations.map((q) => {
              const docNo = q.quotation_number || `QT-${q.id}`;
              const isSelected = selectedIds.includes(q.id);
              return (
                <Card key={q.id}>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(q.id)}
                          className="mt-1 shrink-0"
                        />
                        <div>
                          <button
                            onClick={() => viewQuotationDetails(q)}
                            className="font-mono text-xs font-semibold text-primary hover:underline block cursor-pointer"
                          >
                            {docNo}
                          </button>
                          <button
                            onClick={() => setProfileCustomerId(q.customer_id || null)}
                            className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors mt-0.5 block cursor-pointer"
                          >
                            {q.customer_name ?? "—"}
                          </button>
                          <p className="font-mono font-bold text-base text-primary mt-1">
                            ₹{Number(q.total_amount || q.quotation_amount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={statusVariant[q.quotation_status]} className="capitalize text-[10px]">
                          {q.quotation_status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 -mr-2">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isTrashTab ? (
                              <>
                                <DropdownMenuItem onClick={() => viewQuotationDetails(q)}>
                                  <Printer className="size-4" /> View / Print
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    shareDocumentOnWhatsApp({
                                      docId: q.id,
                                      docType: "Quotation",
                                      docNumber: q.quotation_number || `QT-${q.id}`,
                                      customerName: q.customer_name,
                                      customerPhone: q.customer_phone,
                                      totalAmount: Number(q.total_amount || q.quotation_amount || 0),
                                      date: q.quotation_date,
                                    });
                                  }} 
                                  className="text-emerald-600 dark:text-emerald-400 font-medium"
                                >
                                  <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" /> Share on WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditQuotation(q)}>
                                  <Pencil className="size-4 text-primary" /> Edit Quotation
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateBill(q)}>
                                  <Receipt className="size-4 text-primary" /> Generate Bill
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q, "accepted")}>
                                  <CheckCircle2 className="size-4" /> Mark accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q, "rejected")}>
                                  <XCircle className="size-4" /> Mark rejected
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q, "pending")}>
                                  <Clock className="size-4" /> Mark pending
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(q)}>
                                  <Trash2 className="size-4" /> Move to Trash
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={async () => {
                                  await fetch("/api/quotations/bulk-restore", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ids: [q.id] }),
                                  });
                                  toast.success("Quotation restored.");
                                  refresh();
                                }}>
                                  <RotateCcw className="size-4" /> Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(q)}>
                                  <Trash2 className="size-4" /> Delete Permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {q.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/40 ml-7">
                        {q.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 ml-7">
                      <span>Date: {q.quotation_date}</span>
                      <span>By: {q.created_by_name || "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          </div>
        </>
      )}



      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={isTrashTab ? "Delete permanently?" : "Move quotation to trash?"}
          description={
            isTrashTab
              ? "This action cannot be undone. The quotation will be permanently removed."
              : "You can restore this quotation anytime from the Trash tab."
          }
          onConfirm={() => handleDelete(deleting)}
        />
      )}

      {emptyTrashConfirm && (
        <ConfirmDeleteDialog
          open={emptyTrashConfirm}
          onOpenChange={setEmptyTrashConfirm}
          title="Empty Trash?"
          description="This will permanently delete all trashed quotations. This action cannot be undone."
          onConfirm={handleEmptyTrash}
        />
      )}

      <CustomerProfileDialog
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onOpenChange={(open) => !open && setProfileCustomerId(null)}
        onCustomerUpdated={fetchQuotations}
      />
    </div>
  );
}
