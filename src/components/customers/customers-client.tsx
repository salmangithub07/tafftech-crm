"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Package,
  CalendarPlus,
  Download,
  Upload,
  CheckCircle2,
  Circle,
  User,
  RotateCcw,
  Loader2,
  Calendar,
  ChevronDown,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateFilter, dateFilterParams, type DateFilterValue } from "@/components/ui/date-filter";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CustomerProfileDialog } from "@/components/customers/customer-profile-dialog";
import type { Customer, CustomerStatus } from "@/lib/types";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const statusStyleMap: Record<CustomerStatus, { variant: "success" | "warning" | "secondary" | "info" | "outline"; className: string; label: string }> = {
  active: {
    variant: "success",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold",
    label: "Active",
  },
  lead: {
    variant: "warning",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold",
    label: "Lead",
  },
  progress: {
    variant: "info",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 font-semibold",
    label: "Progress",
  },
  order_soon: {
    variant: "outline",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 font-semibold",
    label: "Order Soon",
  },
  completed: {
    variant: "secondary",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40 font-bold shadow-xs",
    label: "Final",
  },
};

const PAGE_SIZE_KEY = "nova-crm:pageSize:customers";

type Counts = { all: number; lead: number; progress: number; active: number; order_soon: number; completed: number; trash: number };

export function CustomersClient({
  initialCustomers,
  maxCustomers = -1,
  planType = "trial",
}: {
  initialCustomers: Customer[];
  maxCustomers?: number;
  planType?: string;
}) {
  const router = useRouter();
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ all: 0, lead: 0, progress: 0, active: 0, order_soon: 0, completed: 0, trash: 0 });
  const [loading, setLoading] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"all" | "lead" | "progress" | "active" | "order_soon" | "completed" | "trash">("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [deleting, setDeleting] = React.useState<Customer | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = React.useState(false);
  const [profileCustomerId, setProfileCustomerId] = React.useState<number | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    if (saved) setPageSize(Number(saved));
  }, []);

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(search ? { search } : {}),
        ...(tab !== "all" ? { filter: tab, status: tab } : {}),
        ...dateFilterParams(dateFilter),
      });
      const res = await fetch(`/api/customers?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data);
        setTotal(json.total);
        setCounts(json.counts);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, tab, dateFilter]);

  React.useEffect(() => {
    setSelectedIds([]);
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounce search input
  const [searchInput, setSearchInput] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function changeTab(next: string) {
    setTab(next as any);
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
    await fetchCustomers();
    router.refresh();
  }

  // Selection handlers
  const allVisibleIds = customers.map((c) => c.id);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allVisibleIds);
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Bulk Actions
  async function handleBulkTrash() {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/customers/bulk-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Could not move customers to trash");
      toast.success(`${selectedIds.length} customer(s) moved to Trash.`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to trash customers.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkChangeStatus(targetStatus: CustomerStatus) {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/customers/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_ids: selectedIds, status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer status.");

      toast.success(`${selectedIds.length} customer(s) moved to '${data.statusLabel}'.`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk status update failed.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkRestore() {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/customers/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Could not restore customers");
      toast.success(`${selectedIds.length} customer(s) restored from Trash.`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore customers.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkPermanentDelete(emptyAll = false) {
    if (!emptyAll && selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/customers/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emptyAll ? { empty_all: true } : { customer_ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Could not delete customers");
      const json = await res.json();
      toast.success(emptyAll ? `Trash emptied (${json.count} deleted).` : `${selectedIds.length} customer(s) deleted permanently.`);
      setEmptyTrashConfirm(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customers.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function toggleVisited(customer: Customer) {
    const next = customer.visited ? 0 : 1;
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...customer, visited: !!next }),
    });
    if (!res.ok) {
      toast.error("Could not update visited status.");
      return;
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, visited: next } : c))
    );
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((r) => ({
          name: r.name || r.Name || "",
          product: r.product || r.Product || r.product_interest || "",
          email: r.email || r.Email || "",
          phone: r.phone || r.Phone || "",
          address: r.address || r.Address || "",
          notes: r.notes || r.Notes || "",
          status: (r.status || r.Status || "lead").toLowerCase(),
          visited: (r.visited || r.Visited || "").toString().toLowerCase() === "true",
        }));

        const valid = rows.filter((r) => r.name);
        if (valid.length === 0) {
          toast.error("No valid customer rows found in CSV. 'name' is required.");
          return;
        }

        try {
          const res = await fetch("/api/customers/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customers: valid }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Import failed");

          const importedCount = data.importedCount ?? data.inserted ?? 0;
          const skippedCount = data.skippedCount ?? data.skipped ?? 0;
          toast.success(
            `Imported ${importedCount} customer(s).${skippedCount ? ` Skipped ${skippedCount}.` : ""}`
          );
          refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Import failed");
        }
      },
    });
    e.target.value = "";
  }

  const isTrashTab = tab === "trash";

  // Build filter-aware export URL from current UI state
  const exportUrl = React.useMemo(() => {
    const p = new URLSearchParams();
    if (tab !== "all") p.set("status", tab);
    if (search) p.set("search", search);
    if (dateFilter.period && dateFilter.period !== "all") {
      p.set("period", dateFilter.period);
      if (dateFilter.value) p.set("date", dateFilter.value);
    }
    const qs = p.toString();
    return `/api/customers/export${qs ? `?${qs}` : ""}`;
  }, [tab, search, dateFilter]);

  // Human-readable label for export tooltip
  const exportLabel = React.useMemo(() => {
    const parts: string[] = [];
    if (tab !== "all") parts.push(tab.charAt(0).toUpperCase() + tab.slice(1));
    if (dateFilter.period && dateFilter.period !== "all") parts.push(dateFilter.period);
    if (search) parts.push(`"${search}"`);
    return parts.length ? parts.join(" · ") : "All";
  }, [tab, search, dateFilter]);

  const isLimitReached = maxCustomers !== -1 && counts.all >= maxCustomers;

  function handleAddCustomerClick() {
    if (isLimitReached) {
      toast.error(
        `Customer/Lead limit reached (${maxCustomers}) for your current ${planType} plan. Please upgrade your subscription plan to add more customers.`
      );
      return;
    }
    setEditing(null);
    setFormOpen(true);
  }

  function handleImportClick() {
    if (isLimitReached) {
      toast.error(
        `Customer/Lead limit reached (${maxCustomers}) for your current ${planType} plan. Please upgrade your subscription plan to import more customers.`
      );
      return;
    }
    importInputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Customers
            </h1>
            {isTrashTab ? (
              <Badge variant="destructive" className="text-xs font-normal">Trash Bin</Badge>
            ) : (
              <Badge
                variant={isLimitReached ? "destructive" : "secondary"}
                className="text-xs font-medium"
              >
                Leads: {counts.all} / {maxCustomers === -1 ? "∞ Unlimited" : maxCustomers}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isTrashTab
              ? "Manage trashed customers, restore or purge."
              : "Manage all your customers in one place."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          {/* Mobile: icon-only buttons */}
          <Button variant="outline" size="icon" className="size-8 sm:hidden" onClick={handleImportClick} title="Import">
            <Upload className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8 sm:hidden" asChild title={`Export: ${exportLabel}`}>
            <Link href={exportUrl}>
              <Download className="size-4" />
            </Link>
          </Button>
          <Button size="icon" className="size-8 sm:hidden" onClick={handleAddCustomerClick} disabled={isLimitReached} title="Add Customer">
            <Plus className="size-4" />
          </Button>
          {/* Desktop: full buttons */}
          <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleImportClick}>
            <Upload className="size-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex" asChild title={`Export: ${exportLabel}`}>
            <Link href={exportUrl}>
              <Download className="size-4" /> Export CSV
            </Link>
          </Button>
          <Button size="sm" className="hidden sm:flex" onClick={handleAddCustomerClick} disabled={isLimitReached}>
            <Plus className="size-4" /> Add customer
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full">
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-none py-0.5">
            <TabsList className="w-max sm:w-fit justify-start sm:justify-center h-9 sm:h-10 p-1 gap-1">
              <TabsTrigger value="all" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="lead" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">Lead ({counts.lead})</TabsTrigger>
              <TabsTrigger value="progress" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">Progress ({counts.progress})</TabsTrigger>
              <TabsTrigger value="active" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">Active ({counts.active})</TabsTrigger>
              <TabsTrigger value="order_soon" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">Order Soon ({counts.order_soon})</TabsTrigger>
              <TabsTrigger value="completed" className="px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap">Final ({counts.completed})</TabsTrigger>
              <TabsTrigger
                value="trash"
                className="gap-1 px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-rose-600 data-[state=active]:text-white dark:data-[state=active]:bg-rose-600"
              >
                <Trash2 className="size-3" /> Trash ({counts.trash})
              </TabsTrigger>
            </TabsList>
          </div>
          <DateFilter value={dateFilter} onChange={changeDateFilter} />
        </div>
      </Tabs>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone, product, or added by..."
            className="pl-9"
          />
        </div>

        {/* Floating / Sticky Bulk Action Bar */}
        {(selectedIds.length > 0 || (isTrashTab && counts.trash > 0)) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 dark:bg-primary/10 shadow-xs animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 ? (
                <Badge variant="default" className="font-mono text-xs">
                  {selectedIds.length} Selected
                </Badge>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  Trash Management ({counts.trash} items)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isTrashTab && selectedIds.length > 0 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={bulkActionLoading}
                        className="h-8 text-xs gap-1.5 font-semibold bg-background hover:bg-accent border-primary/30 text-primary shadow-xs"
                      >
                        {bulkActionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Tag className="size-3.5" />}
                        Update Status ({selectedIds.length}) <ChevronDown className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground font-semibold">
                        Move {selectedIds.length} Customers To:
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleBulkChangeStatus("lead")} className="text-xs font-semibold cursor-pointer">
                        📌 Lead
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkChangeStatus("progress")} className="text-xs font-semibold cursor-pointer">
                        🔄 In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkChangeStatus("active")} className="text-xs font-semibold cursor-pointer">
                        🟢 Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkChangeStatus("order_soon")} className="text-xs font-semibold cursor-pointer">
                        ⏳ Order Soon
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkChangeStatus("completed")} className="text-xs font-semibold cursor-pointer">
                        ✅ Final / Completed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={handleBulkTrash}
                    className="h-8 text-xs gap-1.5"
                  >
                    {bulkActionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Move to Trash ({selectedIds.length})
                  </Button>
                </>
              )}

              {isTrashTab && selectedIds.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={handleBulkRestore}
                    className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    {bulkActionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                    Restore Selected ({selectedIds.length})
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={() => handleBulkPermanentDelete(false)}
                    className="h-8 text-xs gap-1.5"
                  >
                    {bulkActionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Delete Permanently ({selectedIds.length})
                  </Button>
                </>
              )}

              {isTrashTab && counts.trash > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActionLoading}
                  onClick={() => setEmptyTrashConfirm(true)}
                  className="h-8 text-xs gap-1.5 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="size-3.5" /> Empty Trash
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {!loading && customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {isTrashTab
              ? "Trash is empty."
              : "No customers found. Add a new customer to get started."}
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
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-8 px-1.5 2xl:px-3">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="px-1.5 2xl:px-3 text-[10px] 2xl:text-[11px]">Name</TableHead>
                  <TableHead className="px-1.5 2xl:px-3 text-[10px] 2xl:text-[11px]">Contact</TableHead>
                  <TableHead className="px-1.5 2xl:px-3 text-[10px] 2xl:text-[11px]">Product</TableHead>
                  <TableHead className="px-1.5 2xl:px-3 text-[10px] 2xl:text-[11px]">Status</TableHead>
                  <TableHead className="px-1.5 2xl:px-3 text-[10px] 2xl:text-[11px]">Visited</TableHead>
                  <TableHead className="px-1.5 2xl:px-3 text-[10px] 2xl:text-[11px]">Added by</TableHead>
                  <TableHead className="px-1.5 2xl:px-3 text-[10px] 2xl:text-[11px]">Date</TableHead>
                  <TableHead className="w-8 px-1 2xl:px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <TableRow key={c.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell className="px-1.5 py-2 2xl:px-3 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-2 2xl:px-3 font-medium max-w-[150px] 2xl:max-w-none">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => setProfileCustomerId(c.id)}
                            className="text-left font-semibold text-xs 2xl:text-sm text-foreground hover:text-primary hover:underline transition-colors cursor-pointer truncate"
                            title={c.name}
                          >
                            {c.name}
                          </button>
                          {c.appointment_date && (
                            <span className="flex items-center gap-1 text-[10px] 2xl:text-[11px] text-primary font-medium">
                              <Calendar className="size-3 shrink-0 text-primary" />
                              {formatDate(c.appointment_date)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-1.5 py-2 2xl:px-3 text-muted-foreground">
                        <div className="flex flex-col gap-0.5 text-[11px] 2xl:text-xs">
                          {c.phone ? (
                            <span className="font-medium text-primary flex items-center gap-1"><Phone className="size-3 text-primary shrink-0" />{c.phone}</span>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-1.5 py-2 2xl:px-3">
                        {c.product ? (
                          <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[11px] 2xl:text-xs font-medium text-foreground shadow-2xs max-w-[130px] 2xl:max-w-[180px] truncate" title={c.product}>
                            {c.product}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1.5 py-2 2xl:px-3">
                        {(() => {
                          const isFinal = c.status === "completed" || (c.status as string) === "inactive";
                          const st = isFinal ? "completed" : c.status;
                          const conf = statusStyleMap[st] || { variant: "secondary", className: "", label: c.status };
                          return (
                            <Badge variant={conf.variant} className={cn("capitalize px-1.5 py-0 text-[10px] 2xl:text-xs", conf.className)}>
                              {conf.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="px-1.5 py-2 2xl:px-3">
                        <button
                          onClick={() => toggleVisited(c)}
                          className="flex items-center gap-1 text-[11px] 2xl:text-xs transition-all"
                        >
                          {c.visited ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] 2xl:text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 shadow-2xs">
                              <CheckCircle2 className="size-3 shrink-0" /> Visited
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] 2xl:text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground shadow-2xs">
                              <Circle className="size-3 shrink-0" /> Mark visited
                            </span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="px-1.5 py-2 2xl:px-3 text-muted-foreground text-[11px] 2xl:text-xs truncate max-w-[90px]" title={c.created_by_name || ""}>{c.created_by_name || "—"}</TableCell>
                      <TableCell className="px-1.5 py-2 2xl:px-3 text-muted-foreground whitespace-nowrap text-[11px] 2xl:text-xs">
                        {formatDate(c.created_at)}
                      </TableCell>
                      <TableCell className="px-1 py-2 2xl:px-2">
                        <RowActions
                          customer={c}
                          isTrashTab={isTrashTab}
                          onViewProfile={() => setProfileCustomerId(c.id)}
                          onEdit={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                          onMoveToTrash={async () => {
                            setSelectedIds([c.id]);
                            const res = await fetch("/api/customers/bulk-trash", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ customer_ids: [c.id] }),
                            });
                            if (res.ok) {
                              toast.success(`${c.name} moved to Trash.`);
                              refresh();
                            }
                          }}
                          onRestore={async () => {
                            const res = await fetch("/api/customers/bulk-restore", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ customer_ids: [c.id] }),
                            });
                            if (res.ok) {
                              toast.success(`${c.name} restored.`);
                              refresh();
                            }
                          }}
                          onDelete={() => setDeleting(c)}
                        />
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

          {/* Mobile cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {customers.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <Card
                  key={c.id}
                  className={`transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}
                >
                  <CardContent className="px-4 py-3">
                    {/* Row 1: checkbox + name/product + menu */}
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectOne(c.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => setProfileCustomerId(c.id)}
                          className="block w-full text-left text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors leading-snug cursor-pointer"
                        >
                          {c.name}
                        </button>
                        {c.appointment_date && (
                          <span className="flex items-center gap-1 text-[11px] text-primary font-medium mt-0.5">
                            <Calendar className="size-3 shrink-0 text-primary" />
                            {formatDate(c.appointment_date)}
                          </span>
                        )}
                        {c.product && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Package className="size-3 shrink-0" />
                            <span className="truncate">{c.product}</span>
                          </span>
                        )}
                      </div>
                      <RowActions
                        customer={c}
                        isTrashTab={isTrashTab}
                        onViewProfile={() => setProfileCustomerId(c.id)}
                        onEdit={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                        onMoveToTrash={async () => {
                          const res = await fetch("/api/customers/bulk-trash", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ customer_ids: [c.id] }),
                          });
                          if (res.ok) {
                            toast.success(`${c.name} moved to Trash.`);
                            refresh();
                          }
                        }}
                        onRestore={async () => {
                          const res = await fetch("/api/customers/bulk-restore", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ customer_ids: [c.id] }),
                          });
                          if (res.ok) {
                            toast.success(`${c.name} restored.`);
                            refresh();
                          }
                        }}
                        onDelete={() => setDeleting(c)}
                      />
                    </div>

                    {/* Row 2: contact info (only if present) — indented to align with name */}
                    {(c.phone || c.created_by_name) && (
                      <div className="ml-[26px] mt-2 flex flex-col gap-0.5 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                        {c.phone && (
                          <span className="flex items-center gap-1.5 text-primary font-medium">
                            <Phone className="size-3 shrink-0 text-primary" />
                            <span>{c.phone}</span>
                          </span>
                        )}
                        {c.created_at && (
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="size-3 shrink-0 text-muted-foreground" />
                            <span>Date: {formatDate(c.created_at)}</span>
                          </span>
                        )}
                        {c.created_by_name && (
                          <span className="truncate">Added by: {c.created_by_name}</span>
                        )}
                      </div>
                    )}

                    {/* Row 3: status badge + visited toggle */}
                    <div className="ml-[26px] mt-2 flex items-center justify-between">
                      {(() => {
                        const isFinal = c.status === "completed" || (c.status as string) === "inactive";
                        const st = isFinal ? "completed" : c.status;
                        const conf = statusStyleMap[st] || { variant: "secondary", className: "", label: c.status };
                        return (
                          <Badge variant={conf.variant} className={cn("capitalize text-[11px] h-5 px-2", conf.className)}>
                            {conf.label}
                          </Badge>
                        );
                      })()}
                      <button
                        onClick={() => toggleVisited(c)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {c.visited ? (
                          <CheckCircle2 className="size-3.5 text-success" />
                        ) : (
                          <Circle className="size-3.5" />
                        )}
                        {c.visited ? "Visited" : "Mark visited"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="py-0">
              <PaginationBar
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={changePageSize}
              />
            </Card>
          </div>
        </>
      )}

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSaved={refresh}
      />

      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Delete ${deleting.name} permanently?`}
          description="This customer and all their related appointments/quotations will be permanently deleted from the database. This action cannot be undone."
          onConfirm={() => handleBulkPermanentDelete(false)}
        />
      )}

      {emptyTrashConfirm && (
        <ConfirmDeleteDialog
          open={emptyTrashConfirm}
          onOpenChange={setEmptyTrashConfirm}
          title="Empty Customer Trash?"
          description={`Are you sure you want to permanently purge all ${counts.trash} trashed customer(s)? This action cannot be undone.`}
          onConfirm={() => handleBulkPermanentDelete(true)}
        />
      )}

      <CustomerProfileDialog
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onOpenChange={(open) => !open && setProfileCustomerId(null)}
        onCustomerUpdated={refresh}
      />
    </div>
  );
}

function RowActions({
  customer,
  isTrashTab,
  onViewProfile,
  onEdit,
  onMoveToTrash,
  onRestore,
  onDelete,
}: {
  customer: Customer;
  isTrashTab?: boolean;
  onViewProfile: () => void;
  onEdit: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewProfile}>
          <User className="size-4 text-primary" /> View 360° Profile
        </DropdownMenuItem>

        {!isTrashTab ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/appointments?cid=${customer.id}`}>
                <CalendarPlus className="size-4" /> Add appointment
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onMoveToTrash}>
              <Trash2 className="size-4" /> Move to Trash
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={onRestore} className="text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="size-4 text-emerald-600" /> Restore Customer
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" /> Delete Permanently
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
