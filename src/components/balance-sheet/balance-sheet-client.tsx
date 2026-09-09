"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Landmark,
  Wallet,
  Users,
  HandCoins,
  Factory,
  ExternalLink,
  MoreHorizontal,
  Download,
  Search,
  ArrowRightLeft,
  ArrowUpRight,
  BookOpen,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateFilter, dateFilterParams, type DateFilterValue } from "@/components/ui/date-filter";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { LedgerAccountDialog } from "@/components/balance-sheet/ledger-account-dialog";
import { LedgerTransactionDialog } from "@/components/balance-sheet/ledger-transaction-dialog";
import { ContraVoucherDialog } from "@/components/balance-sheet/contra-voucher-dialog";
import { FixedAssetDialog } from "@/components/balance-sheet/fixed-asset-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import type { BalanceSheetSummary, LedgerAccount, LedgerAccountType, LedgerTransaction, FixedAsset } from "@/lib/types";

function money(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function BalanceSheetClient({ initialSummary }: { initialSummary: BalanceSheetSummary }) {
  const router = useRouter();
  const [summary, setSummary] = React.useState(initialSummary);
  const [transactions, setTransactions] = React.useState<LedgerTransaction[]>([]);
  const [txTotal, setTxTotal] = React.useState(0);
  const [txStats, setTxStats] = React.useState({ totalInflow: 0, totalOutflow: 0, netFlow: 0 });
  const [loadingTx, setLoadingTx] = React.useState(false);

  // Filter & Pagination state for All Transactions
  const [txPage, setTxPage] = React.useState(1);
  const [txPageSize, setTxPageSize] = React.useState(10);
  const [txSearch, setTxSearch] = React.useState("");
  const [txAccountId, setTxAccountId] = React.useState("all");
  const [txDirection, setTxDirection] = React.useState("all");
  const [txVoucherType, setTxVoucherType] = React.useState("all");
  const [txYear, setTxYear] = React.useState("all");
  const [txDateFilter, setTxDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });

  const [accountDialog, setAccountDialog] = React.useState<{
    type: LedgerAccountType;
    account?: LedgerAccount | null;
  } | null>(null);
  const [txDialogOpen, setTxDialogOpen] = React.useState(false);
  const [txDefaultAccount, setTxDefaultAccount] = React.useState<number | null>(null);
  const [contraDialogOpen, setContraDialogOpen] = React.useState(false);
  const [assetDialog, setAssetDialog] = React.useState<{ asset?: FixedAsset | null } | null>(null);
  const [deleteAccount, setDeleteAccount] = React.useState<LedgerAccount | null>(null);
  const [deleteAsset, setDeleteAsset] = React.useState<FixedAsset | null>(null);

  const allAccounts = [...summary.cash, ...summary.bank, ...summary.creditors, ...summary.debtors];

  async function refreshSummary() {
    const res = await fetch("/api/balance-sheet/summary");
    if (res.ok) setSummary(await res.json());
    router.refresh();
  }

  const loadTransactions = React.useCallback(async () => {
    setLoadingTx(true);
    setTxTotal(0);
    try {
      const params = new URLSearchParams({
        page: String(txPage),
        limit: String(txPageSize),
        ...(txSearch ? { search: txSearch } : {}),
        ...(txAccountId !== "all" ? { account_id: txAccountId } : {}),
        ...(txDirection !== "all" ? { direction: txDirection } : {}),
        ...(txVoucherType !== "all" ? { voucher_type: txVoucherType } : {}),
        ...(txYear !== "all" ? { year: txYear } : {}),
        ...dateFilterParams(txDateFilter),
      });
      const res = await fetch(`/api/ledger-transactions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        setTxTotal(json.total ?? 0);
        setTxStats(json.stats || { totalInflow: 0, totalOutflow: 0, netFlow: 0 });
      }
    } finally {
      setLoadingTx(false);
    }
  }, [txPage, txPageSize, txSearch, txAccountId, txDirection, txVoucherType, txYear, txDateFilter]);

  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function handleDeleteAccount(account: LedgerAccount) {
    const res = await fetch(`/api/ledger-accounts/${account.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete account.");
      return;
    }
    toast.success("Account deleted.");
    refreshSummary();
  }

  async function handleDeleteAsset(asset: FixedAsset) {
    const res = await fetch(`/api/fixed-assets/${asset.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete asset.");
      return;
    }
    toast.success("Asset deleted.");
    refreshSummary();
  }

  async function handleDeleteTransaction(id: number) {
    const res = await fetch(`/api/ledger-transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete transaction.");
      return;
    }
    toast.success("Transaction removed.");
    refreshSummary();
    loadTransactions();
  }

  const balanced = Math.abs(summary.totals.totalAssets - summary.totals.totalLiabilities) < 0.5;

  const exportTxUrl = React.useMemo(() => {
    const params = new URLSearchParams({
      ...(txSearch ? { search: txSearch } : {}),
      ...(txAccountId !== "all" ? { account_id: txAccountId } : {}),
      ...(txDirection !== "all" ? { direction: txDirection } : {}),
      ...(txYear !== "all" ? { year: txYear } : {}),
      ...dateFilterParams(txDateFilter),
    });
    return `/api/ledger-transactions/export?${params}`;
  }, [txSearch, txAccountId, txDirection, txYear, txDateFilter]);

  const exportTxLabel = React.useMemo(() => {
    const parts: string[] = [];
    if (txAccountId !== "all") parts.push("Filtered Account");
    if (txDirection !== "all") parts.push(txDirection.charAt(0).toUpperCase() + txDirection.slice(1));
    if (txYear !== "all") parts.push(txYear);
    if (txDateFilter.period && txDateFilter.period !== "all") parts.push(txDateFilter.period);
    if (txSearch) parts.push(`"${txSearch}"`);
    return parts.length ? parts.join(" · ") : "All";
  }, [txSearch, txAccountId, txDirection, txYear, txDateFilter]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Balance Sheet &amp; Ledger Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Tally-style double-entry accounting with real-time Dr/Cr running balances &amp; asset tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={balanced ? "success" : "destructive"} className="gap-1 py-1.5 text-xs">
            {balanced ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            {balanced ? "Balanced" : "Out of balance"}
          </Badge>
          
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={() => setContraDialogOpen(true)}
            disabled={summary.cash.length === 0 && summary.bank.length === 0}
            title="Transfer money between Bank & Cash (Contra Voucher)"
          >
            <ArrowRightLeft className="size-3.5 text-primary" /> Fund Transfer (Contra)
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setTxDefaultAccount(null);
              setTxDialogOpen(true);
            }}
            disabled={allAccounts.length === 0}
            className="text-xs gap-1.5"
          >
            <Plus className="size-3.5" /> Record Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-6">
        {/* ------------------------------- Assets ------------------------------- */}
        <Card className="order-1 md:order-2 border-emerald-500/20 dark:border-emerald-500/30 overflow-hidden shadow-xs">
          <CardHeader className="bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-emerald-500/15 py-3 px-3.5 sm:py-4 sm:px-6">
            <CardTitle className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center gap-2 text-base font-bold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="size-4" />
                </span>
                Assets
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-mono text-xs">
                {money(summary.totals.totalAssets)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5 sm:gap-6 pt-3.5 sm:pt-6 px-3.5 sm:px-6 pb-4 sm:pb-6">
            <AccountSection
              icon={<Wallet className="size-3.5" />}
              iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              title="Cash"
              subtitle="Click any account to view Tally statement ledger"
              accounts={summary.cash}
              onAdd={() => setAccountDialog({ type: "cash" })}
              onEdit={(a) => setAccountDialog({ type: "cash", account: a })}
              onViewStatement={(a) => router.push(`/balance-sheet/${a.id}`)}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            <AccountSection
              icon={<Landmark className="size-3.5" />}
              iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-400"
              title="Bank"
              subtitle="Click any account to view Tally statement ledger"
              accounts={summary.bank}
              onAdd={() => setAccountDialog({ type: "bank" })}
              onEdit={(a) => setAccountDialog({ type: "bank", account: a })}
              onViewStatement={(a) => router.push(`/balance-sheet/${a.id}`)}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            <AccountSection
              icon={<HandCoins className="size-3.5" />}
              iconBg="bg-amber-500/15 text-amber-600 dark:text-amber-400"
              title="Debtors / Outstanding"
              subtitle="Money owed to you (Click row to view Tally ledger)"
              accounts={summary.debtors}
              extraValue={summary.billsOutstandingValue}
              extraLabel="Bills & Invoices Outstanding"
              extraSubtitle="Live from Bills — uncollected pending balance"
              extraLink="/bills"
              onAdd={() => setAccountDialog({ type: "debtor" })}
              onEdit={(a) => setAccountDialog({ type: "debtor", account: a })}
              onViewStatement={(a) => router.push(`/balance-sheet/${a.id}`)}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            {/* Raw Material Card */}
            <div className="flex items-center justify-between rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-2.5 sm:p-3.5">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  <span className="flex size-6 items-center justify-center rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Boxes className="size-3.5" />
                  </span>
                  Raw Material
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Live from Products &amp; Stock — quantity × price
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-bold text-indigo-900 dark:text-indigo-200">{money(summary.rawMaterialValue)}</p>
                <Button variant="ghost" size="icon" className="size-7 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer" asChild>
                  <Link href="/products" className="cursor-pointer" title="View Products">
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Fixed Assets Card */}
            <div className="flex flex-col gap-2 rounded-lg border border-teal-500/20 bg-teal-500/5 p-2.5 sm:p-3.5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-teal-900 dark:text-teal-200">
                  <span className="flex size-6 items-center justify-center rounded bg-teal-500/15 text-teal-600 dark:text-teal-400">
                    <Factory className="size-3.5" />
                  </span>
                  Fixed Assets
                </p>
                <Button variant="outline" size="sm" className="h-7 text-xs border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10" onClick={() => setAssetDialog({})}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
              {summary.fixedAssets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No fixed assets recorded yet.</p>
              ) : (
                summary.fixedAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between rounded-md px-2.5 py-1.5 hover:bg-teal-500/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-teal-950 dark:text-teal-100">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.quantity} × {money(asset.unit_value)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-teal-900 dark:text-teal-200">
                        {money(asset.quantity * Number(asset.unit_value))}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setAssetDialog({ asset })}>
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteAsset(asset)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4 text-emerald-900 dark:text-emerald-200">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Total Assets</span>
              <span className="font-heading text-base sm:text-lg font-bold">{money(summary.totals.totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------- Liabilities ---------------------------- */}
        <Card className="order-2 md:order-1 border-rose-500/20 dark:border-rose-500/30 overflow-hidden shadow-xs">
          <CardHeader className="bg-rose-500/5 dark:bg-rose-500/10 border-b border-rose-500/15 py-3 px-3.5 sm:py-4 sm:px-6">
            <CardTitle className="flex items-center justify-between text-rose-700 dark:text-rose-300">
              <div className="flex items-center gap-2 text-base font-bold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <Landmark className="size-4" />
                </span>
                Liabilities
              </div>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-mono text-xs">
                {money(summary.totals.totalLiabilities)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5 sm:gap-6 pt-3.5 sm:pt-6 px-3.5 sm:px-6 pb-4 sm:pb-6">
            <AccountSection
              icon={<Users className="size-3.5" />}
              iconBg="bg-rose-500/15 text-rose-600 dark:text-rose-400"
              title="Creditors"
              subtitle="Parties you owe money to (Click row to view Tally ledger)"
              accounts={summary.creditors}
              onAdd={() => setAccountDialog({ type: "creditor" })}
              onEdit={(a) => setAccountDialog({ type: "creditor", account: a })}
              onViewStatement={(a) => router.push(`/balance-sheet/${a.id}`)}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            <Separator />

            {/* Capital & Reserves Box */}
            <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Capital &amp; Reserves</p>
                  <p className="text-[11px] sm:text-xs text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                    Total Assets minus Creditors — auto tallies both sides
                  </p>
                </div>
                <p className="font-mono text-sm sm:text-base font-bold text-purple-900 dark:text-purple-200">{money(summary.totals.equity)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 sm:p-4 text-rose-900 dark:text-rose-200">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Total Liabilities</span>
              <span className="font-heading text-base sm:text-lg font-bold">{money(summary.totals.totalLiabilities)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------- All Transactions Tally Ledger --------------------------- */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 px-3.5 sm:py-4 sm:px-6">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-primary" /> All Transactions Ledger
            </CardTitle>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Complete historical record of all Debits (Dr), Credits (Cr) &amp; voucher movements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild title={`Export: ${exportTxLabel}`}>
              <Link href={exportTxUrl}>
                <Download className="size-3.5" /> Export CSV
                {exportTxLabel !== "All" && (
                  <span className="ml-1 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-medium text-primary leading-none">{exportTxLabel}</span>
                )}
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 sm:gap-4 px-3.5 sm:px-6 pb-4 sm:pb-6">
          {/* Summary stats bar for filtered view */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3 bg-muted/20 text-xs">
            <div className="flex justify-between items-center sm:flex-col sm:items-start">
              <span className="text-muted-foreground uppercase font-semibold text-[10px]">Total Debit / Inflow (Dr):</span>
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {money(txStats.totalInflow)}
              </span>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:items-start">
              <span className="text-muted-foreground uppercase font-semibold text-[10px]">Total Credit / Outflow (Cr):</span>
              <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                {money(txStats.totalOutflow)}
              </span>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:items-start">
              <span className="text-muted-foreground uppercase font-semibold text-[10px]">Net Cash Movement:</span>
              <span className={`font-mono text-sm font-bold ${txStats.netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {txStats.netFlow >= 0 ? "+" : ""}{money(txStats.netFlow)}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search narration, ref no, account..."
                value={txSearch}
                onChange={(e) => { setTxSearch(e.target.value); setTxPage(1); }}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={txAccountId} onValueChange={(val) => { setTxAccountId(val); setTxPage(1); }}>
                <SelectTrigger className="h-9 text-xs w-[140px]">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {allAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={txVoucherType} onValueChange={(val) => { setTxVoucherType(val); setTxPage(1); }}>
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="All Vouchers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vouchers</SelectItem>
                  <SelectItem value="receipt">🟢 Receipt</SelectItem>
                  <SelectItem value="payment">🔴 Payment</SelectItem>
                  <SelectItem value="contra">🔁 Contra</SelectItem>
                  <SelectItem value="journal">📝 Journal</SelectItem>
                </SelectContent>
              </Select>

              <div className="w-full sm:w-auto">
                <DateFilter
                  value={txDateFilter}
                  onChange={(df) => {
                    if (df.period !== "all") setTxYear("all");
                    setTxDateFilter(df);
                    setTxPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table / Cards */}
          {!loadingTx && transactions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-0">
              No ledger transactions match the selected filters.
            </p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-hidden rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="w-[90px]">Date</TableHead>
                      <TableHead className="w-[140px]">Account</TableHead>
                      <TableHead className="w-[95px]">Vch Type</TableHead>
                      <TableHead className="w-[90px]">Vch No</TableHead>
                      <TableHead>Particulars / Narration</TableHead>
                      <TableHead className="text-right w-[110px]">Debit (₹ Dr)</TableHead>
                      <TableHead className="text-right w-[110px]">Credit (₹ Cr)</TableHead>
                      <TableHead className="w-[90px]">By</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {transactions.map((t) => {
                      const voucherBadge = {
                        receipt: <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Receipt</Badge>,
                        payment: <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">Payment</Badge>,
                        contra: <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">Contra</Badge>,
                        journal: <Badge variant="outline" className="text-[10px]">Journal</Badge>,
                      }[t.voucher_type || "journal"];

                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30">
                          <TableCell className="text-muted-foreground font-mono">{t.entry_date}</TableCell>
                          <TableCell className="font-semibold text-foreground">
                            <Link
                              href={`/balance-sheet/${t.account_id}`}
                              className="hover:underline hover:text-primary transition-colors inline-flex items-center gap-1"
                              title="View Account Statement"
                            >
                              {t.account_name}
                            </Link>
                          </TableCell>
                          <TableCell>{voucherBadge}</TableCell>
                          <TableCell className="font-mono text-muted-foreground text-[11px]">
                            {t.voucher_no || `TX-${t.id}`}
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate text-muted-foreground">
                            {t.description || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600">
                            {t.dr_amount && t.dr_amount > 0 ? money(t.dr_amount) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-rose-600">
                            {t.cr_amount && t.cr_amount > 0 ? money(t.cr_amount) : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px]">{t.created_by_name || "—"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleDeleteTransaction(t.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <PaginationBar
                  page={txPage}
                  pageSize={txPageSize}
                  total={txTotal}
                  onPageChange={setTxPage}
                  onPageSizeChange={(sz) => { setTxPageSize(sz); setTxPage(1); }}
                />
              </div>

              {/* Mobile Card View */}
              <div className="flex flex-col gap-3 md:hidden">
                {transactions.map((t) => {
                  const voucherBadge = {
                    receipt: <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Receipt</Badge>,
                    payment: <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">Payment</Badge>,
                    contra: <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">Contra</Badge>,
                    journal: <Badge variant="outline" className="text-[10px]">Journal</Badge>,
                  }[t.voucher_type || "journal"];

                  return (
                    <Card key={t.id}>
                      <CardContent className="flex flex-col gap-2.5 py-3.5 px-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/balance-sheet/${t.account_id}`}
                              className="font-semibold text-sm text-foreground hover:underline hover:text-primary transition-colors block"
                            >
                              {t.account_name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {voucherBadge}
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {t.voucher_no || `TX-${t.id}`}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            {t.dr_amount && t.dr_amount > 0 ? (
                              <p className="font-mono font-bold text-sm text-emerald-600">
                                +{money(t.dr_amount)} <span className="text-[10px]">Dr</span>
                              </p>
                            ) : (
                              <p className="font-mono font-bold text-sm text-rose-600">
                                -{money(t.cr_amount || t.amount)} <span className="text-[10px]">Cr</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {t.description && (
                          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/40">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>📅 {t.entry_date}</span>
                          <div className="flex items-center gap-2">
                            <span>By: {t.created_by_name || "—"}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 -mr-1"
                              onClick={() => handleDeleteTransaction(t.id)}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <PaginationBar
                  page={txPage}
                  pageSize={txPageSize}
                  total={txTotal}
                  onPageChange={setTxPage}
                  onPageSizeChange={(sz) => { setTxPageSize(sz); setTxPage(1); }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Create/Edit Dialog */}
      {accountDialog && (
        <LedgerAccountDialog
          open={!!accountDialog}
          onOpenChange={(open) => !open && setAccountDialog(null)}
          account={accountDialog.account}
          type={accountDialog.type}
          onSaved={refreshSummary}
        />
      )}

      {/* Record Transaction Dialog */}
      <LedgerTransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        accounts={allAccounts}
        defaultAccountId={txDefaultAccount}
        onSaved={() => {
          refreshSummary();
          loadTransactions();
        }}
      />

      {/* Contra Voucher Fund Transfer Dialog */}
      <ContraVoucherDialog
        open={contraDialogOpen}
        onOpenChange={setContraDialogOpen}
        cashAccounts={summary.cash}
        bankAccounts={summary.bank}
        onSaved={() => {
          refreshSummary();
          loadTransactions();
        }}
      />

      {/* Fixed Asset Dialog */}
      {assetDialog && (
        <FixedAssetDialog
          open={!!assetDialog}
          onOpenChange={(open) => !open && setAssetDialog(null)}
          asset={assetDialog.asset}
          onSaved={refreshSummary}
        />
      )}

      {/* Confirm Deletions */}
      {deleteAccount && (
        <ConfirmDeleteDialog
          open={!!deleteAccount}
          onOpenChange={(open) => !open && setDeleteAccount(null)}
          title={`Delete ${deleteAccount.name}?`}
          description="Its full transaction history will also be deleted. This action cannot be undone."
          onConfirm={() => handleDeleteAccount(deleteAccount)}
        />
      )}

      {deleteAsset && (
        <ConfirmDeleteDialog
          open={!!deleteAsset}
          onOpenChange={(open) => !open && setDeleteAsset(null)}
          title={`Delete ${deleteAsset.name}?`}
          description="This action cannot be undone."
          onConfirm={() => handleDeleteAsset(deleteAsset)}
        />
      )}
    </div>
  );
}

function AccountSection({
  icon,
  iconBg = "bg-muted text-muted-foreground",
  title,
  subtitle,
  accounts,
  extraValue = 0,
  extraLabel,
  extraSubtitle,
  extraLink,
  onAdd,
  onEdit,
  onViewStatement,
  onTransact,
  onDelete,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  accounts: LedgerAccount[];
  extraValue?: number;
  extraLabel?: string;
  extraSubtitle?: string;
  extraLink?: string;
  onAdd: () => void;
  onEdit: (account: LedgerAccount) => void;
  onViewStatement: (account: LedgerAccount) => void;
  onTransact: (account: LedgerAccount) => void;
  onDelete: (account: LedgerAccount) => void;
}) {
  const manualTotal = accounts.reduce((s, a) => s + Number(a.balance ?? a.opening_balance), 0);
  const grandTotal = manualTotal + extraValue;
  const hasItems = accounts.length > 0 || extraValue > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className={cn("flex size-6 items-center justify-center rounded", iconBg)}>
              {icon}
            </span>
            {title}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground ml-8">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {hasItems && (
            <span className="font-mono text-sm font-bold text-foreground">{money(grandTotal)}</span>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAdd}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
      </div>
      {!hasItems ? (
        <p className="text-xs text-muted-foreground ml-8">None added yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5 mt-1">
          {extraValue > 0 && extraLabel && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-amber-900 dark:text-amber-200">{extraLabel}</p>
                {extraSubtitle && <p className="truncate text-[11px] text-muted-foreground">{extraSubtitle}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {money(extraValue)}
                </span>
                {extraLink && (
                  <Button variant="ghost" size="icon" className="size-7 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 cursor-pointer" asChild>
                    <Link href={extraLink} className="cursor-pointer" title="View Bills">
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 px-3 py-2.5 transition-all group shadow-2xs"
            >
              <Link
                href={`/balance-sheet/${a.id}`}
                className="cursor-pointer min-w-0 text-left flex-1 pr-2.5 focus:outline-hidden"
                title={`Click to view ${a.name} Tally Ledger Statement`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="cursor-pointer font-semibold text-sm text-foreground group-hover:text-primary group-hover:underline transition-colors flex items-center gap-1.5">
                    {a.name}
                    <ArrowUpRight className="size-3.5 text-primary/70 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {a.notes && <span className="truncate text-xs text-muted-foreground">{a.notes}</span>}
                  <span className="text-[10px] text-muted-foreground/70 group-hover:text-primary transition-colors flex items-center gap-1 font-medium">
                    <BookOpen className="size-2.5" /> Ledger Statement
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {money(a.balance ?? a.opening_balance)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 cursor-pointer hover:bg-muted">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onViewStatement(a)}>
                      <BookOpen className="size-4" /> View Ledger Statement
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onTransact(a)}>
                      <Plus className="size-4" /> Record transaction
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(a)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={() => onDelete(a)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
