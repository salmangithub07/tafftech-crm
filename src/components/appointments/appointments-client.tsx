"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Upload,
  Phone,
  MessageSquare,
  RotateCcw,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import { QuotationDialog } from "@/components/quotations/quotation-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CustomerProfileDialog } from "@/components/customers/customer-profile-dialog";
import { TodayRemindersDialog } from "@/components/appointments/today-reminders-dialog";
import type { Appointment, AppointmentStatus, Customer } from "@/lib/types";

const statusVariant: Record<AppointmentStatus, "warning" | "success" | "secondary"> = {
  pending: "warning",
  completed: "success",
  cancelled: "secondary",
};

type FilterTab = "all" | "today" | "tomorrow" | "past" | "trash";
type Counts = { all: number; today: number; tomorrow: number; past: number; trash: number };

const PAGE_SIZE_KEY = "nova-crm:pageSize:appointments";

export function AppointmentsClient({
  initialAppointments,
  customers,
}: {
  initialAppointments: Appointment[];
  customers: Customer[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCustomerId = searchParams.get("cid") ?? undefined;

  const [appointments, setAppointments] = React.useState(initialAppointments);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ all: 0, today: 0, tomorrow: 0, past: 0, trash: 0 });
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(!!defaultCustomerId);
  const [editing, setEditing] = React.useState<Appointment | null>(null);
  const [deleting, setDeleting] = React.useState<Appointment | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = React.useState(false);
  const [quoting, setQuoting] = React.useState<Appointment | null>(null);
  const [profileCustomerId, setProfileCustomerId] = React.useState<number | null>(null);
  const [remindersOpen, setRemindersOpen] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of the saved page-size preference
    if (saved) setPageSize(Number(saved));
  }, []);

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter: tab,
        page: String(page),
        limit: String(pageSize),
        ...(search ? { search } : {}),
        ...dateFilterParams(dateFilter),
      });
      const res = await fetch(`/api/appointments?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.data);
        setTotal(json.total);
        setCounts(json.counts);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, page, pageSize, search, dateFilter]);

  React.useEffect(() => {
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches whenever any filter/pagination input changes
    fetchAppointments();
  }, [fetchAppointments]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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
    setSelectedIds([]);
    await fetchAppointments();
    router.refresh();
  }

  // Selection helpers
  const allVisibleIds = appointments.map((a) => a.id);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  function toggleSelectAll() {
    setSelectedIds(isAllSelected ? [] : allVisibleIds);
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  // Bulk actions
  async function handleBulkTrash() {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/appointments/bulk-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${selectedIds.length} appointment(s) moved to Trash.`);
      refresh();
    } catch {
      toast.error("Could not move appointments to trash.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkRestore() {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/appointments/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${selectedIds.length} appointment(s) restored.`);
      refresh();
    } catch {
      toast.error("Could not restore appointments.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkPermanentDelete(emptyAll = false) {
    if (!emptyAll && !selectedIds.length) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/appointments/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emptyAll ? { empty_all: true } : { appointment_ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      toast.success(emptyAll ? `Trash emptied (${json.count} deleted).` : `${selectedIds.length} appointment(s) deleted.`);
      setEmptyTrashConfirm(false);
      refresh();
    } catch {
      toast.error("Could not delete appointments.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function quickStatus(appointment: Appointment, status: AppointmentStatus) {
    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error("Could not update status."); return; }
    toast.success(status === "completed" ? "Marked as completed." : "Appointment cancelled.");
    refresh();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const res = await fetch("/api/appointments/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || "Import failed."); return; }
        toast.success(`${data.inserted} appointments imported${data.skipped ? `, ${data.skipped} rows skipped` : ""}.`);
        refresh();
      },
      error: () => toast.error("Could not read the file."),
    });
    e.target.value = "";
  }

  const isTrashTab = tab === "trash";

  // Build filter-aware export URL from current UI state
  const exportUrl = React.useMemo(() => {
    const p = new URLSearchParams();
    if (tab !== "all") p.set("filter", tab);
    if (search) p.set("search", search);
    if (dateFilter.period && dateFilter.period !== "all") {
      p.set("period", dateFilter.period);
      if (dateFilter.value) p.set("date", dateFilter.value);
    }
    const qs = p.toString();
    return `/api/appointments/export${qs ? `?${qs}` : ""}`;
  }, [tab, search, dateFilter]);

  // Human-readable label for export tooltip
  const exportLabel = React.useMemo(() => {
    const parts: string[] = [];
    if (tab !== "all") parts.push(tab.charAt(0).toUpperCase() + tab.slice(1));
    if (dateFilter.period && dateFilter.period !== "all") parts.push(dateFilter.period);
    if (search) parts.push(`"${search}"`);
    return parts.length ? parts.join(" · ") : "All";
  }, [tab, search, dateFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2 sm:text-2xl">
            Appointments {isTrashTab && <Badge variant="destructive" className="text-xs font-normal">Trash Bin</Badge>}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isTrashTab ? "Manage trashed appointments, restore or purge." : "Schedule follow-ups and visits."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          {/* Mobile icon-only */}
          <Button variant="outline" size="icon" className="size-8 sm:hidden" onClick={() => importInputRef.current?.click()} title="Import"><Upload className="size-4" /></Button>
          <Button variant="outline" size="icon" className="size-8 sm:hidden" asChild title={`Export: ${exportLabel}`}><Link href={exportUrl}><Download className="size-4" /></Link></Button>
          <Button variant="outline" size="icon" className="size-8 sm:hidden border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" onClick={() => setRemindersOpen(true)} title="Today's Reminders"><MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" /></Button>
          <Button size="icon" className="size-8 sm:hidden" onClick={() => { setEditing(null); setFormOpen(true); }} title="Add Appointment"><Plus className="size-4" /></Button>
          {/* Desktop full buttons */}
          <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => importInputRef.current?.click()}><Upload className="size-4" /> Import</Button>
          <Button variant="outline" size="sm" className="hidden sm:flex" asChild title={`Export: ${exportLabel}`}>
            <Link href={exportUrl}>
              <Download className="size-4" /> Export
              {exportLabel !== "All" && (
                <span className="ml-1 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-medium text-primary leading-none">{exportLabel}</span>
              )}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 gap-1.5" onClick={() => setRemindersOpen(true)}>
            <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
            Today&apos;s Reminders {counts.today > 0 && `(${counts.today})`}
          </Button>
          <Button size="sm" className="hidden sm:flex" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" /> Add Appointment</Button>
        </div>
      </div>

      {/* Tabs + Date Filter */}
      <Tabs value={tab} onValueChange={changeTab}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="today" className="text-xs sm:text-sm">Today ({counts.today})</TabsTrigger>
            <TabsTrigger value="tomorrow" className="text-xs sm:text-sm">Tomorrow ({counts.tomorrow})</TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm">Past ({counts.past})</TabsTrigger>
            <TabsTrigger
              value="trash"
              className="gap-1 text-xs sm:text-sm data-[state=active]:bg-rose-600 data-[state=active]:text-white dark:data-[state=active]:bg-rose-600"
            >
              <Trash2 className="size-3" /> Trash ({counts.trash})
            </TabsTrigger>
          </TabsList>
          <DateFilter value={dateFilter} onChange={changeDateFilter} />
        </div>
      </Tabs>

      {/* Search + Bulk Action Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name, phone, or product..." className="pl-9" />
        </div>

        {(selectedIds.length > 0 || (isTrashTab && counts.trash > 0)) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 dark:bg-primary/10 shadow-xs animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 ? (
                <Badge variant="default" className="font-mono text-xs">{selectedIds.length} Selected</Badge>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">Trash Management ({counts.trash} items)</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isTrashTab && selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" disabled={bulkLoading} onClick={handleBulkTrash} className="h-8 text-xs gap-1.5">
                  {bulkLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  Move to Trash ({selectedIds.length})
                </Button>
              )}
              {isTrashTab && selectedIds.length > 0 && (
                <>
                  <Button variant="outline" size="sm" disabled={bulkLoading} onClick={handleBulkRestore} className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                    {bulkLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                    Restore Selected ({selectedIds.length})
                  </Button>
                  <Button variant="destructive" size="sm" disabled={bulkLoading} onClick={() => handleBulkPermanentDelete(false)} className="h-8 text-xs gap-1.5">
                    {bulkLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Delete Permanently ({selectedIds.length})
                  </Button>
                </>
              )}
              {isTrashTab && counts.trash > 0 && (
                <Button variant="outline" size="sm" disabled={bulkLoading} onClick={() => setEmptyTrashConfirm(true)} className="h-8 text-xs gap-1.5 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10">
                  <Trash2 className="size-3.5" /> Empty Trash
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && appointments.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {isTrashTab ? "Trash is empty." : "No appointments match this filter."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Title / Product</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => {
                  const isSelected = selectedIds.includes(a.id);
                  return (
                    <TableRow key={a.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell className="text-center">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectOne(a.id)} aria-label={`Select appointment`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <button onClick={() => setProfileCustomerId(a.customer_id)} className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors">
                            {a.customer_name ?? "—"}
                          </button>
                          {a.customer_phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="size-3" /> {a.customer_phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.title || a.customer_product || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.appointment_date}{a.appointment_time ? ` · ${a.appointment_time.slice(0, 5)}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[a.status]} className="capitalize">{a.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">{a.remarks || "—"}</TableCell>
                      <TableCell>
                        <RowActions
                          appointment={a}
                          isTrashTab={isTrashTab}
                          onEdit={() => { setEditing(a); setFormOpen(true); }}
                          onMoveToTrash={async () => {
                            const res = await fetch("/api/appointments/bulk-trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_ids: [a.id] }) });
                            if (res.ok) { toast.success("Moved to Trash."); refresh(); }
                          }}
                          onRestore={async () => {
                            const res = await fetch("/api/appointments/bulk-restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_ids: [a.id] }) });
                            if (res.ok) { toast.success("Appointment restored."); refresh(); }
                          }}
                          onDelete={() => setDeleting(a)}
                          onComplete={() => quickStatus(a, "completed")}
                          onCancel={() => quickStatus(a, "cancelled")}
                          onQuote={() => setQuoting(a)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={changePageSize} />
          </Card>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {appointments.map((a) => {
              const isSelected = selectedIds.includes(a.id);
              return (
                <Card key={a.id} className={`transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}>
                  <CardContent className="px-4 py-3">
                    {/* Row 1: checkbox + customer name + menu */}
                    <div className="flex items-center gap-2.5">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectOne(a.id)} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setProfileCustomerId(a.customer_id)} className="block w-full text-left text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors leading-snug">
                          {a.customer_name ?? "—"}
                        </button>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <CalendarClock className="size-3 shrink-0" />
                          <span>{a.appointment_date}{a.appointment_time ? ` · ${a.appointment_time.slice(0, 5)}` : ""}</span>
                        </span>
                      </div>
                      <RowActions
                        appointment={a}
                        isTrashTab={isTrashTab}
                        onEdit={() => { setEditing(a); setFormOpen(true); }}
                        onMoveToTrash={async () => {
                          const res = await fetch("/api/appointments/bulk-trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_ids: [a.id] }) });
                          if (res.ok) { toast.success("Moved to Trash."); refresh(); }
                        }}
                        onRestore={async () => {
                          const res = await fetch("/api/appointments/bulk-restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_ids: [a.id] }) });
                          if (res.ok) { toast.success("Appointment restored."); refresh(); }
                        }}
                        onDelete={() => setDeleting(a)}
                        onComplete={() => quickStatus(a, "completed")}
                        onCancel={() => quickStatus(a, "cancelled")}
                        onQuote={() => setQuoting(a)}
                      />
                    </div>

                    {/* Row 2: title/product + phone */}
                    {(a.title || a.customer_product || a.customer_phone) && (
                      <div className="ml-[26px] mt-2 flex flex-col gap-0.5 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                        {(a.title || a.customer_product) && <span className="truncate">{a.title || a.customer_product}</span>}
                        {a.customer_phone && (
                          <span className="flex items-center gap-1.5"><Phone className="size-3 shrink-0" />{a.customer_phone}</span>
                        )}
                        {a.remarks && <span className="truncate italic">{a.remarks}</span>}
                      </div>
                    )}

                    {/* Row 3: status badge */}
                    <div className="ml-[26px] mt-2">
                      <Badge variant={statusVariant[a.status]} className="capitalize text-[11px] h-5 px-2">{a.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="py-0">
              <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={changePageSize} />
            </Card>
          </div>
        </>
      )}

      <AppointmentFormDialog open={formOpen} onOpenChange={setFormOpen} appointment={editing} customers={customers} defaultCustomerId={defaultCustomerId} onSaved={() => refresh()} />
      <QuotationDialog open={!!quoting} onOpenChange={(open) => !open && setQuoting(null)} appointment={quoting} onSaved={() => refresh()} />

      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete this appointment permanently?"
          description="This action cannot be undone."
          onConfirm={() => handleBulkPermanentDelete(false)}
        />
      )}

      {emptyTrashConfirm && (
        <ConfirmDeleteDialog
          open={emptyTrashConfirm}
          onOpenChange={setEmptyTrashConfirm}
          title="Empty Appointment Trash?"
          description={`Are you sure you want to permanently purge all ${counts.trash} trashed appointment(s)? This action cannot be undone.`}
          onConfirm={() => handleBulkPermanentDelete(true)}
        />
      )}

      <CustomerProfileDialog customerId={profileCustomerId} open={!!profileCustomerId} onOpenChange={(open) => !open && setProfileCustomerId(null)} onCustomerUpdated={() => refresh()} />
      <TodayRemindersDialog open={remindersOpen} onOpenChange={setRemindersOpen} />
    </div>
  );
}

function RowActions({
  appointment,
  isTrashTab,
  onEdit,
  onMoveToTrash,
  onRestore,
  onDelete,
  onComplete,
  onCancel,
  onQuote,
}: {
  appointment: Appointment;
  isTrashTab?: boolean;
  onEdit: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onQuote: () => void;
}) {
  const isPending = appointment.status === "pending";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0"><MoreVertical className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isTrashTab ? (
          <>
            {isPending && (
              <>
                <DropdownMenuItem onClick={onQuote}><FileText className="size-4" /> Send quotation</DropdownMenuItem>
                <DropdownMenuItem onClick={onComplete}><CheckCircle2 className="size-4" /> Mark complete</DropdownMenuItem>
                <DropdownMenuItem onClick={onCancel}><XCircle className="size-4" /> Cancel</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={onEdit}><Pencil className="size-4" /> Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onMoveToTrash}><Trash2 className="size-4" /> Move to Trash</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={onRestore} className="text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="size-4 text-emerald-600" /> Restore Appointment
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 className="size-4" /> Delete Permanently</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
