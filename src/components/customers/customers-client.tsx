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
  ShieldAlert,
  Loader2,
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
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CustomerProfileDialog } from "@/components/customers/customer-profile-dialog";
import type { Customer, CustomerStatus } from "@/lib/types";

const statusVariant: Record<CustomerStatus, "success" | "warning" | "secondary" | "info" | "outline"> = {
  active: "success",
  lead: "warning",
  progress: "info",
  inactive: "secondary",
};

const PAGE_SIZE_KEY = "nova-crm:pageSize:customers";

type Counts = { all: number; lead: number; progress: number; active: number; inactive: number; trash: number };

export function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const router = useRouter();
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ all: 0, lead: 0, progress: 0, active: 0, inactive: 0, trash: 0 });
  const [loading, setLoading] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"all" | "lead" | "progress" | "active" | "inactive" | "trash">("all");
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
        ...(tab !== "all" ? { status: tab } : {}),
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

          toast.success(
            `Imported ${data.importedCount} customers.${data.skippedCount ? ` Skipped ${data.skippedCount}.` : ""}`
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            Customers {isTrashTab && <Badge variant="destructive" className="text-xs font-normal">Trash Bin</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTrashTab
              ? "Manage trashed customers, restore records, or purge permanently."
              : "Manage all your customers in one place."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
            <Upload className="size-4" /> Import
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/api/customers/export">
              <Download className="size-4" /> Export
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add Customer
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="lead">Lead ({counts.lead})</TabsTrigger>
            <TabsTrigger value="progress">Progress ({counts.progress})</TabsTrigger>
            <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
            <TabsTrigger
              value="trash"
              className="gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white dark:data-[state=active]:bg-rose-600"
            >
              <Trash2 className="size-3.5" /> Trash ({counts.trash})
            </TabsTrigger>
          </TabsList>
          <DateFilter value={dateFilter} onChange={changeDateFilter} />
        </div>
      </Tabs>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone, or product..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visited</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <TableRow key={c.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => setProfileCustomerId(c.id)}
                          className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col gap-0.5 text-xs">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                          {!c.email && !c.phone && <span>—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.product || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[c.status]} className="capitalize">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleVisited(c)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {c.visited ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : (
                            <Circle className="size-4" />
                          )}
                          {c.visited ? "Visited" : "Mark visited"}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.created_by_name || "—"}</TableCell>
                      <TableCell>
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
          <div className="flex flex-col gap-3 md:hidden">
            {customers.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <Card key={c.id} className={isSelected ? "border-primary bg-primary/5" : ""}>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(c.id)}
                        />
                        <div>
                          <button
                            onClick={() => setProfileCustomerId(c.id)}
                            className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                          >
                            {c.name}
                          </button>
                          {c.product && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Package className="size-3" /> {c.product}
                            </p>
                          )}
                        </div>
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
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3" /> {c.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={statusVariant[c.status]} className="w-fit capitalize">
                        {c.status}
                      </Badge>
                      <button
                        onClick={() => toggleVisited(c)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        {c.visited ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <Circle className="size-4" />
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
