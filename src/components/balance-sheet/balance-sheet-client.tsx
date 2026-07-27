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
} from "lucide-react";
import { toast } from "sonner";
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
  const [txYear, setTxYear] = React.useState("all");
  const [txDateFilter, setTxDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });

  const [accountDialog, setAccountDialog] = React.useState<{
    type: LedgerAccountType;
    account?: LedgerAccount | null;
  } | null>(null);
  const [txDialogOpen, setTxDialogOpen] = React.useState(false);
  const [txDefaultAccount, setTxDefaultAccount] = React.useState<number | null>(null);
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
  }, [txPage, txPageSize, txSearch, txAccountId, txDirection, txYear, txDateFilter]);

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

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">
            Assets and liabilities, always tallied — visible to Admin only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={balanced ? "success" : "destructive"} className="gap-1 py-1.5">
            {balanced ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            {balanced ? "Balanced" : "Out of balance"}
          </Badge>
          <Button
            size="sm"
            onClick={() => {
              setTxDefaultAccount(null);
              setTxDialogOpen(true);
            }}
            disabled={allAccounts.length === 0}
          >
            <Plus className="size-4" /> Record Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---------------------------- Liabilities ---------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="size-4" /> Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <AccountSection
              icon={<Users className="size-3.5" />}
              title="Creditors"
              subtitle="Parties you owe money to"
              accounts={summary.creditors}
              onAdd={() => setAccountDialog({ type: "creditor" })}
              onEdit={(a) => setAccountDialog({ type: "creditor", account: a })}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Capital &amp; Reserves</p>
                <p className="text-xs text-muted-foreground">
                  Computed automatically — Total Assets minus Creditors, so both sides always match.
                </p>
              </div>
              <p className="font-mono text-sm font-semibold">{money(summary.totals.equity)}</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total Liabilities</span>
              <span className="font-mono">{money(summary.totals.totalLiabilities)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------- Assets ------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4" /> Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <AccountSection
              icon={<Wallet className="size-3.5" />}
              title="Cash"
              accounts={summary.cash}
              onAdd={() => setAccountDialog({ type: "cash" })}
              onEdit={(a) => setAccountDialog({ type: "cash", account: a })}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            <AccountSection
              icon={<Landmark className="size-3.5" />}
              title="Bank"
              accounts={summary.bank}
              onAdd={() => setAccountDialog({ type: "bank" })}
              onEdit={(a) => setAccountDialog({ type: "bank", account: a })}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            <AccountSection
              icon={<HandCoins className="size-3.5" />}
              title="Debtors / Outstanding"
              subtitle="Money owed to you"
              accounts={summary.debtors}
              onAdd={() => setAccountDialog({ type: "debtor" })}
              onEdit={(a) => setAccountDialog({ type: "debtor", account: a })}
              onTransact={(a) => {
                setTxDefaultAccount(a.id);
                setTxDialogOpen(true);
              }}
              onDelete={setDeleteAccount}
            />

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Boxes className="size-3.5" /> Raw Material
                </p>
                <p className="text-xs text-muted-foreground">
                  Live from Products &amp; Stock — quantity × price, updates automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-semibold">{money(summary.rawMaterialValue)}</p>
                <Button variant="ghost" size="icon" className="size-7" asChild>
                  <Link href="/products" title="View Products">
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Factory className="size-3.5" /> Fixed Assets
                </p>
                <Button variant="ghost" size="sm" onClick={() => setAssetDialog({})}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
              {summary.fixedAssets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No fixed assets recorded yet.</p>
              ) : (
                summary.fixedAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent">
                    <div>
                      <p className="text-sm">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.quantity} × {money(asset.unit_value)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{money(asset.quantity * Number(asset.unit_value))}</p>
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

            <Separator />

            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total Assets</span>
              <span className="font-mono">{money(summary.totals.totalAssets)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------- All Transactions Ledger --------------------------- */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle className="text-lg">All Transactions Ledger</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete historical record of all account increases &amp; decreases with year &amp; date filters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={exportTxUrl}>
                <Download className="size-4" /> Export CSV
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Summary stats bar for filtered view */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3 bg-muted/20 text-xs">
            <div className="flex justify-between items-center sm:flex-col sm:items-start">
              <span className="text-muted-foreground uppercase font-semibold">Total Inflow (+):</span>
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {money(txStats.totalInflow)}
              </span>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:items-start">
              <span className="text-muted-foreground uppercase font-semibold">Total Outflow (-):</span>
              <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                {money(txStats.totalOutflow)}
              </span>
            </div>
            <div className="flex justify-between items-center sm:flex-col sm:items-start">
              <span className="text-muted-foreground uppercase font-semibold">Net Flow:</span>
              <span className={`font-mono text-sm font-bold ${txStats.netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {txStats.netFlow >= 0 ? "+" : ""}{money(txStats.netFlow)}
              </span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search description..."
                className="pl-9 h-9 text-xs"
                value={txSearch}
                onChange={(e) => { setTxSearch(e.target.value); setTxPage(1); }}
              />
            </div>

            <Select value={txYear} onValueChange={(val) => {
              // Reset DateFilter when year dropdown is used to avoid conflicting filters
              if (val !== "all") setTxDateFilter({ period: "all", value: "" });
              setTxYear(val);
              setTxPage(1);
            }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Year Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>Year {yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={txAccountId} onValueChange={(val) => { setTxAccountId(val); setTxPage(1); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Account Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {allAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={txDirection} onValueChange={(val) => { setTxDirection(val); setTxPage(1); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="increase">Increase (+)</SelectItem>
                <SelectItem value="decrease">Decrease (-)</SelectItem>
              </SelectContent>
            </Select>

            <DateFilter
              value={txDateFilter}
              onChange={(df) => {
                // Reset txYear when DateFilter is set to avoid conflicting filters
                if (df.period !== "all") setTxYear("all");
                setTxDateFilter(df);
                setTxPage(1);
              }}
            />
          </div>

          {/* Table */}
          {!loadingTx && transactions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-0">
              No transactions match the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">{t.entry_date}</TableCell>
                      <TableCell className="font-medium">{t.account_name}</TableCell>
                      <TableCell>
                        {t.direction === "increase" ? (
                          <Badge variant="success" className="gap-1">
                            <ArrowUpCircle className="size-3" /> Increase
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <ArrowDownCircle className="size-3" /> Decrease
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{money(t.amount)}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {t.description || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.created_by_name || "—"}</TableCell>
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
                  ))}
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
          )}
        </CardContent>
      </Card>

      {accountDialog && (
        <LedgerAccountDialog
          open={!!accountDialog}
          onOpenChange={(open) => !open && setAccountDialog(null)}
          account={accountDialog.account}
          type={accountDialog.type}
          onSaved={refreshSummary}
        />
      )}

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

      {assetDialog && (
        <FixedAssetDialog
          open={!!assetDialog}
          onOpenChange={(open) => !open && setAssetDialog(null)}
          asset={assetDialog.asset}
          onSaved={refreshSummary}
        />
      )}

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
  title,
  subtitle,
  accounts,
  onAdd,
  onEdit,
  onTransact,
  onDelete,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accounts: LedgerAccount[];
  onAdd: () => void;
  onEdit: (account: LedgerAccount) => void;
  onTransact: (account: LedgerAccount) => void;
  onDelete: (account: LedgerAccount) => void;
}) {
  const total = accounts.reduce((s, a) => s + Number(a.balance ?? a.opening_balance), 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {icon} {title}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 0 && <span className="font-mono text-sm">{money(total)}</span>}
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
      </div>
      {accounts.length === 0 ? (
        <p className="text-xs text-muted-foreground">None added yet.</p>
      ) : (
        accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent">
            <div className="min-w-0">
              <p className="truncate text-sm">{a.name}</p>
              {a.notes && <p className="truncate text-xs text-muted-foreground">{a.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{money(a.balance ?? a.opening_balance)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTransact(a)}>
                    <Plus className="size-4" /> Record transaction
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(a)}>
                    <Pencil className="size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(a)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
