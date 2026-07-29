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

type FilterTab = "all" | "today" | "tomorrow" | "past";
type Counts = { all: number; today: number; tomorrow: number; past: number };

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
  const [counts, setCounts] = React.useState<Counts>({ all: 0, today: 0, tomorrow: 0, past: 0 });
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(!!defaultCustomerId);
  const [editing, setEditing] = React.useState<Appointment | null>(null);
  const [deleting, setDeleting] = React.useState<Appointment | null>(null);
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
    await fetchAppointments();
    router.refresh();
  }

  async function handleDelete(appointment: Appointment) {
    const res = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Could not delete appointment.");
      return;
    }
    toast.success("Appointment deleted.");
    refresh();
  }

  async function quickStatus(appointment: Appointment, status: AppointmentStatus) {
    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Could not update status.");
      return;
    }
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
        if (!res.ok) {
          toast.error(data.error || "Import failed.");
          return;
        }
        toast.success(
          `${data.inserted} appointments imported${data.skipped ? `, ${data.skipped} rows skipped` : ""}.`
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
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">Schedule follow-ups and visits.</p>
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
            <Link href="/api/appointments/export">
              <Download className="size-4" /> Export
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRemindersOpen(true)}
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 gap-1.5"
          >
            <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
            Today&apos;s Reminders {counts.today > 0 && `(${counts.today})`}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add Appointment
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="today">Today ({counts.today})</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow ({counts.tomorrow})</TabsTrigger>
            <TabsTrigger value="past">Past ({counts.past})</TabsTrigger>
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

      {loading && appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No appointments match this filter.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Title / Product</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <button
                          onClick={() => setProfileCustomerId(a.customer_id)}
                          className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {a.customer_name ?? "—"}
                        </button>
                        {a.customer_phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="size-3" /> {a.customer_phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.title || a.customer_product || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.appointment_date}
                      {a.appointment_time ? ` · ${a.appointment_time.slice(0, 5)}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[a.status]} className="capitalize">
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {a.remarks || "—"}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        appointment={a}
                        onEdit={() => {
                          setEditing(a);
                          setFormOpen(true);
                        }}
                        onDelete={() => setDeleting(a)}
                        onComplete={() => quickStatus(a, "completed")}
                        onCancel={() => quickStatus(a, "cancelled")}
                        onQuote={() => setQuoting(a)}
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
            {appointments.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        onClick={() => setProfileCustomerId(a.customer_id)}
                        className="text-left font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {a.customer_name ?? "—"}
                      </button>
                      <p className="text-xs text-muted-foreground">{a.title || a.customer_product || "—"}</p>
                    </div>
                    <RowActions
                      appointment={a}
                      onEdit={() => {
                        setEditing(a);
                        setFormOpen(true);
                      }}
                      onDelete={() => setDeleting(a)}
                      onComplete={() => quickStatus(a, "completed")}
                      onCancel={() => quickStatus(a, "cancelled")}
                      onQuote={() => setQuoting(a)}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {a.appointment_date}
                      {a.appointment_time ? ` · ${a.appointment_time.slice(0, 5)}` : ""}
                    </span>
                    <Badge variant={statusVariant[a.status]} className="capitalize">
                      {a.status}
                    </Badge>
                  </div>
                  {a.remarks && <p className="text-xs text-muted-foreground">{a.remarks}</p>}
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

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editing}
        customers={customers}
        defaultCustomerId={defaultCustomerId}
        onSaved={() => refresh()}
      />

      <QuotationDialog
        open={!!quoting}
        onOpenChange={(open) => !open && setQuoting(null)}
        appointment={quoting}
        onSaved={() => refresh()}
      />

      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete this appointment?"
          description="This action cannot be undone."
          onConfirm={() => handleDelete(deleting)}
        />
      )}

      <CustomerProfileDialog
        customerId={profileCustomerId}
        open={!!profileCustomerId}
        onOpenChange={(open) => !open && setProfileCustomerId(null)}
        onCustomerUpdated={() => refresh()}
      />

      <TodayRemindersDialog
        open={remindersOpen}
        onOpenChange={setRemindersOpen}
      />
    </div>
  );
}

function RowActions({
  appointment,
  onEdit,
  onDelete,
  onComplete,
  onCancel,
  onQuote,
}: {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onQuote: () => void;
}) {
  const isPending = appointment.status === "pending";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isPending && (
          <>
            <DropdownMenuItem onClick={onQuote}>
              <FileText className="size-4" /> Send quotation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onComplete}>
              <CheckCircle2 className="size-4" /> Mark complete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCancel}>
              <XCircle className="size-4" /> Cancel
            </DropdownMenuItem>
          </>
        )}
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
