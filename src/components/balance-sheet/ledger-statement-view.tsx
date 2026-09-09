"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Download,
  Landmark,
  Wallet,
  Users,
  HandCoins,
  RefreshCw,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateFilter, dateFilterParams, type DateFilterValue } from "@/components/ui/date-filter";
import { LedgerTransactionDialog } from "@/components/balance-sheet/ledger-transaction-dialog";
import type { LedgerAccount, LedgerTransaction } from "@/lib/types";

function money(val: number) {
  return `₹${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function LedgerStatementView({ accountId }: { accountId: string | number }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [search, setSearch] = React.useState("");
  const [voucherFilter, setVoucherFilter] = React.useState("all");
  const [txDialogOpen, setTxDialogOpen] = React.useState(false);

  const [statementData, setStatementData] = React.useState<{
    account: LedgerAccount;
    openingBalance: number;
    openingBalanceType: string;
    statement: LedgerTransaction[];
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    closingBalanceType: string;
  } | null>(null);

  const fetchStatement = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(dateFilterParams(dateFilter));
      const res = await fetch(`/api/ledger-accounts/${accountId}/statement?${params}`);
      if (res.ok) {
        const json = await res.json();
        setStatementData(json);
      } else {
        console.error("Statement not found");
      }
    } catch (err) {
      console.error("Failed to load account statement:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId, dateFilter]);

  React.useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  React.useEffect(() => {
    if (statementData?.account) {
      document.title = `${statementData.account.name} — Statement of Account`;
    }
  }, [statementData]);

  const handlePrint = () => {
    if (!statementData?.account) {
      window.print();
      return;
    }
    const accName = statementData.account.name.trim();
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/ /g, "-");

    const pdfFileName = `Statement - ${accName} (${dateStr})`;

    const originalTitle = document.title;
    document.title = pdfFileName;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 2500);
  };

  const handleExportCSV = () => {
    if (!statementData) return;
    const { account, openingBalance, openingBalanceType, statement, totalDebit, totalCredit, closingBalance, closingBalanceType } = statementData;

    const rows = [
      ["STATEMENT OF ACCOUNT", account.name],
      ["Account Type", account.type.toUpperCase()],
      ["Generated On", new Date().toLocaleString("en-IN")],
      ["Period", dateFilter.period === "all" ? "All Time" : `${dateFilter.period.toUpperCase()} (${dateFilter.value || ""})`],
      [],
      ["Date", "Voucher Type", "Voucher No", "Particulars / Narration", "Created By", "Debit (₹ Dr)", "Credit (₹ Cr)", "Balance (₹)", "Dr/Cr"],
      ["—", "Opening", "—", "Opening Balance b/f", "—", String(openingBalanceType === "Dr" ? openingBalance : 0), String(openingBalanceType === "Cr" ? openingBalance : 0), String(openingBalance), openingBalanceType],
    ];

    statement.forEach((row) => {
      rows.push([
        new Date(row.entry_date).toLocaleDateString("en-IN"),
        (row.voucher_type || "journal").toUpperCase(),
        row.voucher_no || `TX-${row.id}`,
        `"${(row.description || "").replace(/"/g, '""')}"`,
        row.created_by_name || "—",
        String(row.dr_amount || 0),
        String(row.cr_amount || 0),
        String(row.running_balance || 0),
        row.balance_type || "Dr",
      ]);
    });

    rows.push([
      "GRAND TOTAL",
      "—",
      "—",
      "Closing Balance",
      "—",
      String(totalDebit),
      String(totalCredit),
      String(closingBalance),
      closingBalanceType,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateFormatted = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Statement_${account.name.replace(/[^a-zA-Z0-9]/g, "_")}_${dateFormatted}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const account = statementData?.account;

  const typeIcon = {
    cash: <Wallet className="size-5 text-emerald-600 dark:text-emerald-400" />,
    bank: <Landmark className="size-5 text-blue-600 dark:text-blue-400" />,
    creditor: <HandCoins className="size-5 text-amber-600 dark:text-amber-400" />,
    debtor: <Users className="size-5 text-purple-600 dark:text-purple-400" />,
  }[account?.type || "cash"];

  const typeBadgeLabel = {
    cash: "Cash-in-Hand",
    bank: "Bank Account",
    creditor: "Sundry Creditor (Payable)",
    debtor: "Sundry Debtor (Receivable)",
  }[account?.type || "cash"];

  // Filter transactions client-side for search & voucher type
  const filteredStatement = React.useMemo(() => {
    if (!statementData?.statement) return [];
    return statementData.statement.filter((row) => {
      if (voucherFilter !== "all" && row.voucher_type !== voucherFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const descMatch = (row.description || "").toLowerCase().includes(q);
        const vchMatch = (row.voucher_no || "").toLowerCase().includes(q);
        const userMatch = (row.created_by_name || "").toLowerCase().includes(q);
        const typeMatch = (row.voucher_type || "").toLowerCase().includes(q);
        if (!descMatch && !vchMatch && !userMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [statementData, voucherFilter, search]);

  if (loading && !statementData) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link href="/balance-sheet" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Balance Sheet
          </Link>
        </div>
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span>Loading ledger statement...</span>
        </div>
      </div>
    );
  }

  if (!statementData || !account) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link href="/balance-sheet" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Balance Sheet
          </Link>
        </div>
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-base font-medium">Account Not Found</p>
          <p className="text-xs mt-1">This ledger account does not exist or has been removed.</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/balance-sheet">Return to Balance Sheet</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-4 md:p-6 space-y-3.5 sm:space-y-5 max-w-7xl mx-auto">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between gap-2 print:hidden px-1 sm:px-0">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Link href="/balance-sheet">
            <ArrowLeft className="size-3.5" /> Back to Balance Sheet
          </Link>
        </Button>
      </div>

      {/* Printable Document Header (Appears only on Print / PDF) */}
      <div className="hidden print:block text-left mb-4">
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-black">Statement of Account</h1>
            <p className="text-xs text-neutral-600 font-medium">Tally Running Balance Ledger • Tafftech CRM</p>
          </div>
          <div className="text-right text-[11px] text-neutral-600 font-mono">
            <div>Generated: {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
            <div>Period: {dateFilter.period === "all" ? "All Transactions" : `${dateFilter.period.toUpperCase()} (${dateFilter.value || ""})`}</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs pb-1">
          <div>
            <span className="text-neutral-500 font-medium">Account: </span>
            <span className="font-bold text-black text-base">{account.name}</span>
            <span className="ml-2 text-neutral-600">({typeBadgeLabel})</span>
          </div>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 print:hidden px-1 sm:px-0">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1.5 sm:p-2 rounded-xl bg-primary/10 border border-primary/20">
              {typeIcon}
            </span>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              {account.name}
            </h1>
            <Badge variant="outline" className="text-[11px] sm:text-xs font-medium py-0.5">
              {typeBadgeLabel}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tally Statement of Account • Real-time running balance ledger
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 print:hidden">
          <Button
            size="sm"
            variant="default"
            className="h-8 sm:h-9 text-xs gap-1 sm:gap-1.5 cursor-pointer flex-1 sm:flex-none"
            onClick={() => setTxDialogOpen(true)}
          >
            <Plus className="size-3.5" /> Post Entry
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 sm:h-9 text-xs gap-1 sm:gap-1.5 cursor-pointer flex-1 sm:flex-none"
            onClick={handleExportCSV}
            title="Download CSV Spreadsheet"
          >
            <Download className="size-3.5" /> Export CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 sm:h-9 text-xs gap-1 sm:gap-1.5 shadow-xs cursor-pointer flex-1 sm:flex-none"
            onClick={handlePrint}
            title="Print Statement / Save PDF"
          >
            <Printer className="size-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Account KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:grid-cols-4 print:gap-2 print:border-neutral-300">
        <Card className="border-border/60 shadow-xs print:bg-neutral-50 print:border-neutral-300 print:shadow-none">
          <CardContent className="p-2.5 sm:p-4">
            <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium print:text-neutral-600">
              Opening Balance
            </span>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-sm sm:text-lg font-bold font-mono text-foreground print:text-black">
                {money(statementData.openingBalance)}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-primary print:text-neutral-700">
                {statementData.openingBalanceType}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 block print:hidden">
              Balance before period
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-xs print:bg-neutral-50 print:border-neutral-300 print:shadow-none">
          <CardContent className="p-2.5 sm:p-4">
            <span className="text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 block font-medium print:text-neutral-600">
              Total Debit (Dr)
            </span>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-sm sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                {money(statementData.totalDebit)}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 block print:hidden">
              Inflows &amp; deposits
            </span>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-rose-500/5 shadow-xs print:bg-neutral-50 print:border-neutral-300 print:shadow-none">
          <CardContent className="p-2.5 sm:p-4">
            <span className="text-[11px] sm:text-xs text-rose-800 dark:text-rose-300 block font-medium print:text-neutral-600">
              Total Credit (Cr)
            </span>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-sm sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 print:text-rose-700">
                {money(statementData.totalCredit)}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-0.5 block print:hidden">
              Outflows &amp; expenses
            </span>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5 shadow-xs print:bg-neutral-100 print:border-neutral-400 print:shadow-none">
          <CardContent className="p-2.5 sm:p-4">
            <span className="text-[11px] sm:text-xs text-primary block font-medium print:text-neutral-600">
              Closing Balance
            </span>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-sm sm:text-xl font-bold font-mono text-primary print:text-black">
                {money(statementData.closingBalance)}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-primary print:text-neutral-700">
                {statementData.closingBalanceType}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 block print:hidden">
              Net balance at end
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Ledger Table & Card List Card */}
      <Card className="shadow-xs border-border/60 overflow-hidden print:border-neutral-400 print:shadow-none print:rounded-none">
        {/* Filter Bar */}
        <div className="p-2.5 sm:p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <DateFilter value={dateFilter} onChange={setDateFilter} />

            <div className="relative flex-1 min-w-[140px] sm:max-w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search narration, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pl-8 pr-2"
              />
            </div>

            <Select value={voucherFilter} onValueChange={setVoucherFilter}>
              <SelectTrigger className="h-8 text-xs w-[110px] sm:w-[125px]">
                <SelectValue placeholder="Voucher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vouchers</SelectItem>
                <SelectItem value="receipt">Receipts</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="contra">Contra</SelectItem>
                <SelectItem value="journal">Journals</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 cursor-pointer shrink-0"
              onClick={fetchStatement}
              disabled={loading}
              title="Refresh ledger"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>

          <span className="text-[11px] sm:text-xs text-muted-foreground font-mono shrink-0">
            {filteredStatement.length} of {statementData.statement.length} Records
          </span>
        </div>

        {/* 1. Desktop & Print Full Table View */}
        <div className="hidden md:block print:block w-full print:overflow-visible">
          <Table className="text-xs w-full min-w-[700px] print:min-w-0 print:w-full print:table-fixed print:text-[10px]">
            <TableHeader className="bg-muted/40 print:bg-neutral-100">
              <TableRow className="print:border-b-2 print:border-neutral-400">
                <TableHead className="w-[95px] print:w-[13%] print:text-black print:font-bold print:p-1.5">Date</TableHead>
                <TableHead className="w-[100px] print:w-[12%] print:text-black print:font-bold print:p-1.5">Voucher Type</TableHead>
                <TableHead className="w-[95px] print:w-[12%] print:text-black print:font-bold print:p-1.5">Ref / Vch No</TableHead>
                <TableHead className="min-w-[170px] print:w-[27%] print:text-black print:font-bold print:p-1.5">Particulars / Narration</TableHead>
                <TableHead className="text-right w-[115px] print:w-[12%] print:text-black print:font-bold print:p-1.5">Debit (₹ Dr)</TableHead>
                <TableHead className="text-right w-[115px] print:w-[12%] print:text-black print:font-bold print:p-1.5">Credit (₹ Cr)</TableHead>
                <TableHead className="text-right w-[125px] print:w-[12%] print:text-black print:font-bold print:p-1.5">Balance (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Opening Balance Row */}
              <TableRow className="bg-muted/15 font-medium italic text-muted-foreground print:bg-neutral-50 print:text-neutral-700 print:border-b print:border-neutral-300">
                <TableCell className="print:p-1.5">—</TableCell>
                <TableCell className="print:p-1.5">
                  <Badge variant="outline" className="text-[10px] font-normal print:border-neutral-400 print:text-black print:px-1 print:py-0">
                    Opening
                  </Badge>
                </TableCell>
                <TableCell className="font-mono print:p-1.5">—</TableCell>
                <TableCell className="font-semibold text-foreground print:text-black print:p-1.5 print:whitespace-normal">
                  Opening Balance b/f
                </TableCell>
                <TableCell className="text-right font-mono print:text-black print:p-1.5">
                  {statementData.openingBalanceType === "Dr" ? money(statementData.openingBalance) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono print:text-black print:p-1.5">
                  {statementData.openingBalanceType === "Cr" ? money(statementData.openingBalance) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-foreground print:text-black print:p-1.5">
                  {money(statementData.openingBalance)}{" "}
                  <span className="text-[10px] text-primary print:text-neutral-700">
                    {statementData.openingBalanceType}
                  </span>
                </TableCell>
              </TableRow>

              {/* Transactions List */}
              {filteredStatement.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    {search || voucherFilter !== "all"
                      ? "No transactions match your search filter."
                      : "No transactions recorded for this period."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStatement.map((row) => {
                  const voucherBadge = {
                    receipt: <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] print:bg-transparent print:border-neutral-400 print:text-black print:px-1 print:py-0">Receipt</Badge>,
                    payment: <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] print:bg-transparent print:border-neutral-400 print:text-black print:px-1 print:py-0">Payment</Badge>,
                    contra: <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] print:bg-transparent print:border-neutral-400 print:text-black print:px-1 print:py-0">Contra</Badge>,
                    journal: <Badge variant="outline" className="text-[10px] print:text-black print:border-neutral-400 print:px-1 print:py-0">Journal</Badge>,
                  }[row.voucher_type || "journal"];

                  return (
                    <TableRow key={row.id} className="hover:bg-muted/30 print:border-b print:border-neutral-200">
                      <TableCell className="font-mono text-muted-foreground print:text-black print:p-1.5">
                        {new Date(row.entry_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="print:p-1.5">{voucherBadge}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground print:text-black print:p-1.5">
                        {row.voucher_no || `TX-${row.id}`}
                      </TableCell>
                      <TableCell className="print:p-1.5 print:whitespace-normal">
                        <div className="font-medium text-foreground print:text-black break-words">
                          {row.description || (row.direction === "increase" ? "Received / Inflow" : "Paid out / Outflow")}
                        </div>
                        {row.created_by_name && (
                          <span className="text-[10px] text-muted-foreground print:text-neutral-600 block">
                            By: {row.created_by_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-600 print:text-black print:p-1.5">
                        {row.dr_amount && row.dr_amount > 0 ? money(row.dr_amount) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-rose-600 print:text-black print:p-1.5">
                        {row.cr_amount && row.cr_amount > 0 ? money(row.cr_amount) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground print:text-black print:p-1.5">
                        {money(row.running_balance || 0)}{" "}
                        <span
                          className={`text-[10px] ${
                            row.balance_type === "Dr"
                              ? "text-emerald-600 print:text-neutral-800"
                              : "text-amber-600 print:text-neutral-800"
                          }`}
                        >
                          {row.balance_type}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {/* Grand Total & Closing Balance Row */}
              <TableRow className="bg-muted/40 font-bold border-t-2 print:bg-neutral-100 print:border-t-2 print:border-b-2 print:border-black">
                <TableCell colSpan={4} className="text-right text-foreground font-semibold print:text-black print:p-1.5">
                  Grand Total &amp; Closing Balance:
                </TableCell>
                <TableCell className="text-right font-mono text-emerald-600 font-bold print:text-black print:p-1.5">
                  {money(statementData.totalDebit)}
                </TableCell>
                <TableCell className="text-right font-mono text-rose-600 font-bold print:text-black print:p-1.5">
                  {money(statementData.totalCredit)}
                </TableCell>
                <TableCell className="text-right font-mono text-primary font-bold print:text-black print:p-1.5">
                  {money(statementData.closingBalance)} {statementData.closingBalanceType}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* 2. Mobile Responsive Card View (Appears on Mobile only) */}
        <div className="flex flex-col gap-2 p-2.5 md:hidden print:hidden">
          {/* Mobile Opening Balance Card */}
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Opening Balance
              </span>
              <span className="text-xs text-muted-foreground italic">Balance brought forward</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-xs text-foreground">
                {money(statementData.openingBalance)}
              </span>
              <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 font-semibold text-primary">
                {statementData.openingBalanceType}
              </Badge>
            </div>
          </div>

          {/* Transactions Cards */}
          {filteredStatement.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {search || voucherFilter !== "all"
                ? "No transactions match your search filter."
                : "No transactions recorded for this period."}
            </div>
          ) : (
            filteredStatement.map((row) => {
              const voucherBadge = {
                receipt: <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Receipt</Badge>,
                payment: <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">Payment</Badge>,
                contra: <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">Contra</Badge>,
                journal: <Badge variant="outline" className="text-[10px]">Journal</Badge>,
              }[row.voucher_type || "journal"];

              return (
                <div
                  key={row.id}
                  className="rounded-lg border border-border/60 bg-card p-3 flex flex-col gap-2 shadow-2xs"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {new Date(row.entry_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                      {voucherBadge}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
                      {row.voucher_no || `TX-${row.id}`}
                    </span>
                  </div>

                  {/* Narration */}
                  {row.description && (
                    <p className="text-xs text-foreground bg-muted/30 p-2 rounded border border-border/40">
                      {row.description}
                    </p>
                  )}

                  {/* Amounts Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                    <div>
                      {row.dr_amount && row.dr_amount > 0 ? (
                        <span className="font-mono font-bold text-emerald-600">
                          +{money(row.dr_amount)} <span className="text-[10px]">Dr</span>
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-rose-600">
                          -{money(row.cr_amount || 0)} <span className="text-[10px]">Cr</span>
                        </span>
                      )}
                      {row.created_by_name && (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          By: {row.created_by_name}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block font-medium">Balance</span>
                      <span className="font-mono font-bold text-xs text-foreground">
                        {money(row.running_balance || 0)}{" "}
                        <span className={`text-[10px] ${row.balance_type === "Dr" ? "text-emerald-600" : "text-amber-600"}`}>
                          {row.balance_type}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Mobile Grand Total & Closing Balance Card */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between text-xs border-b pb-1.5 border-primary/10">
              <span className="text-muted-foreground font-medium">Total Debit (Dr):</span>
              <span className="font-mono font-bold text-emerald-600">{money(statementData.totalDebit)}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b pb-1.5 border-primary/10">
              <span className="text-muted-foreground font-medium">Total Credit (Cr):</span>
              <span className="font-mono font-bold text-rose-600">{money(statementData.totalCredit)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="font-bold text-foreground">Grand Closing Balance:</span>
              <span className="font-mono font-bold text-xs text-primary">
                {money(statementData.closingBalance)} {statementData.closingBalanceType}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Entry Dialog directly on this page */}
      <LedgerTransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        accounts={[account]}
        defaultAccountId={account.id}
        onSaved={() => {
          fetchStatement();
        }}
      />
    </div>
  );
}
