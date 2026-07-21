"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import type { Quotation, QuotationStatus } from "@/lib/types";

const statusVariant: Record<QuotationStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  accepted: "success",
  rejected: "destructive",
};

type Counts = { all: number; pending: number; accepted: number; rejected: number };
const PAGE_SIZE_KEY = "nova-crm:pageSize:quotations";

export function QuotationsClient({ initialQuotations }: { initialQuotations: Quotation[] }) {
  const router = useRouter();
  const [quotations, setQuotations] = React.useState(initialQuotations);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ all: 0, pending: 0, accepted: 0, rejected: 0 });
  const [tab, setTab] = React.useState<"all" | QuotationStatus>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [deleting, setDeleting] = React.useState<Quotation | null>(null);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of the saved page-size preference
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
    }
  }, [tab, page, pageSize, dateFilter]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches whenever any filter/pagination input changes
    fetchQuotations();
  }, [fetchQuotations]);

  function changeTab(next: string) {
    setTab(next as "all" | QuotationStatus);
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
    await fetchQuotations();
    router.refresh();
  }

  async function updateStatus(q: Quotation, status: QuotationStatus) {
    const res = await fetch(`/api/quotations/${q.id}`, {
      method: "PUT",
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
    const res = await fetch(`/api/quotations/${q.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete quotation.");
      return;
    }
    toast.success("Quotation deleted.");
    refresh();
  }

  const totalValue = quotations.reduce((sum, q) => sum + Number(q.quotation_amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
        <p className="text-sm text-muted-foreground">
          Track quotations sent from your appointments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total quotations</p>
            <p className="text-2xl font-bold">{counts.all}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Pending / Accepted</p>
            <p className="text-2xl font-bold">
              {counts.pending} / {counts.accepted}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Value on this page</p>
            <p className="text-2xl font-bold">₹{totalValue.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({counts.accepted})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          </TabsList>
          <DateFilter value={dateFilter} onChange={changeDateFilter} />
        </div>
      </Tabs>

      {quotations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No quotations sent yet. Use &quot;Send quotation&quot; from an appointment.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.customer_name ?? "—"}</TableCell>
                  <TableCell>₹{Number(q.quotation_amount).toLocaleString("en-IN")}</TableCell>
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
            onPageSizeChange={changePageSize}
          />
        </Card>
      )}

      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete this quotation?"
          description="This action cannot be undone."
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  );
}
