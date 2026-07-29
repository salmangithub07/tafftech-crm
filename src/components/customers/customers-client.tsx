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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { CustomerProfileDialog } from "@/components/customers/customer-profile-dialog";
import type { Customer, CustomerStatus } from "@/lib/types";

const statusVariant: Record<CustomerStatus, "success" | "warning" | "secondary"> = {
  active: "success",
  lead: "warning",
  inactive: "secondary",
};

const PAGE_SIZE_KEY = "nova-crm:pageSize:customers";

type Counts = { all: number; lead: number; active: number; inactive: number };

export function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const router = useRouter();
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [total, setTotal] = React.useState(initialCustomers.length);
  const [counts, setCounts] = React.useState<Counts>({ all: 0, lead: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"all" | CustomerStatus>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [deleting, setDeleting] = React.useState<Customer | null>(null);
  const [profileCustomerId, setProfileCustomerId] = React.useState<number | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of the saved page-size preference
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches whenever any filter/pagination input changes
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
    setTab(next as "all" | CustomerStatus);
    setPage(1);
  }

  function changeDateFilter(next: DateFilterValue) {
    setDateFilter(next);
    setPage(1);
  }

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
    window.localStorage.setItem(PAGE_SIZE_KEY, String(size));
  }

  async function refresh() {
    await fetchCustomers();
    router.refresh();
  }

  async function handleDelete(customer: Customer) {
    const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Could not delete customer.");
      return;
    }
    toast.success("Customer deleted.");
    refresh();
  }

  async function toggleVisited(customer: Customer) {
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customer.name,
        product: customer.product ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        status: customer.status,
        visited: !customer.visited,
        address: customer.address ?? "",
        notes: customer.notes ?? "",
      }),
    });
    if (!res.ok) {
      toast.error("Could not update customer.");
      return;
    }
    toast.success(customer.visited ? "Marked as not visited." : "Marked as visited.");
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
        const res = await fetch("/api/customers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Import failed.");
          return;
        }
        toast.success(
          `${data.inserted} customers imported${data.skipped ? `, ${data.skipped} rows skipped` : ""}.`
        );
        refresh();
      },
      error: () => toast.error("Could not read the file."),
    });
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage all your customers in one place.</p>
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
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="lead">Lead ({counts.lead})</TabsTrigger>
            <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
          </TabsList>
          <DateFilter value={dateFilter} onChange={changeDateFilter} />
        </div>
      </Tabs>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone, or product..."
          className="pl-9"
        />
      </div>

      {!loading && customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No customers found. Add a new customer to get started.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
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
                {customers.map((c) => (
                  <TableRow key={c.id}>
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
                        customerId={c.id}
                        onViewProfile={() => setProfileCustomerId(c.id)}
                        onEdit={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                        onDelete={() => setDeleting(c)}
                      />
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
              onPageSizeChange={changePageSize}
            />
          </Card>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {customers.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
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
                    <RowActions
                      customerId={c.id}
                      onViewProfile={() => setProfileCustomerId(c.id)}
                      onEdit={() => {
                        setEditing(c);
                        setFormOpen(true);
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
            ))}
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
          title={`Delete ${deleting.name}?`}
          description="This customer and all their related appointments/quotations will be permanently deleted. This action cannot be undone."
          onConfirm={() => handleDelete(deleting)}
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
  customerId,
  onViewProfile,
  onEdit,
  onDelete,
}: {
  customerId: number;
  onViewProfile: () => void;
  onEdit: () => void;
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
        <DropdownMenuItem asChild>
          <Link href={`/appointments?cid=${customerId}`}>
            <CalendarPlus className="size-4" /> Add appointment
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
