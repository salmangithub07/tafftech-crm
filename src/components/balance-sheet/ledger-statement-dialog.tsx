"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateFilter, dateFilterParams, type DateFilterValue } from "@/components/ui/date-filter";
import {
  Loader2,
  Printer,
  Download,
  Landmark,
  Wallet,
  Users,
  HandCoins,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
} from "lucide-react";
import type { LedgerAccount, LedgerTransaction } from "@/lib/types";

function money(val: number) {
  return `₹${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function LedgerStatementDialog({
  open,
  onOpenChange,
  account,
  onAddTransaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: LedgerAccount | null;
  onAddTransaction?: (accountId: number) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [statementData, setStatementData] = React.useState<{
    openingBalance: number;
    openingBalanceType: string;
    statement: LedgerTransaction[];
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    closingBalanceType: string;
  } | null>(null);

  const fetchStatement = React.useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const params = new URLSearchParams(dateFilterParams(dateFilter));
      const res = await fetch(`/api/ledger-accounts/${account.id}/statement?${params}`);
      if (res.ok) {
        const json = await res.json();
        setStatementData(json);
      }
    } catch (err) {
      console.error("Failed to load account statement:", err);
    } finally {
      setLoading(false);
    }
  }, [account, dateFilter]);

  React.useEffect(() => {
    if (open && account) {
      fetchStatement();
    }
  }, [open, account, fetchStatement]);

  const handlePrint = () => {
    const accName = account?.name?.trim() || "Account";
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

  const typeIcon = {
    cash: <Wallet className="size-4 text-emerald-600" />,
    bank: <Landmark className="size-4 text-blue-600" />,
    creditor: <HandCoins className="size-4 text-amber-600" />,
    debtor: <Users className="size-4 text-purple-600" />,
  }[account?.type || "cash"];

  const typeBadgeLabel = {
    cash: "Cash-in-Hand",
    bank: "Bank Account",
    creditor: "Sundry Creditor (Payable)",
    debtor: "Sundry Debtor (Receivable)",
  }[account?.type || "cash"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-card print:border-b-2 print:border-neutral-800 print:p-0 print:pb-4">
          {/* Printable Official Document Header */}
          <div className="hidden print:block mb-4 text-left">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wider text-black">Statement of Account</h1>
                <p className="text-xs text-neutral-600 font-medium">Tally-Style Running Ledger</p>
              </div>
              <div className="text-right text-[11px] text-neutral-600 font-mono">
                <div>Generated: {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                <div>Period: {dateFilter.period === "all" ? "All Transactions" : `${dateFilter.period.toUpperCase()} (${dateFilter.value || ""})`}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-500 font-medium">Account Name: </span>
                <span className="font-bold text-black text-sm">{account?.name}</span>
                <span className="ml-2 text-neutral-600">({typeBadgeLabel})</span>
              </div>
            </div>
          </div>

          {/* Screen Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  {typeIcon}
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {account?.name}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px]">
                  {typeBadgeLabel}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                Tally Statement of Account • Real-time running balance ledger
              </DialogDescription>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 print:hidden">
              {onAddTransaction && account && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs gap-1"
                  onClick={() => {
                    onOpenChange(false);
                    onAddTransaction(account.id);
                  }}
                >
                  <Plus className="size-3.5" /> Post Entry
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={handlePrint}
                title="Print Statement / Save PDF"
              >
                <Printer className="size-3.5" /> Print / PDF
              </Button>
            </div>
          </div>

          {/* Account Summary Cards */}
          {statementData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t print:mt-2 print:pt-2 print:border-neutral-300">
              <div className="p-2.5 bg-muted/40 rounded-lg border text-xs print:bg-neutral-50 print:border-neutral-300">
                <span className="text-[10px] text-muted-foreground block font-medium print:text-neutral-600">Opening Balance</span>
                <span className="font-bold text-foreground font-mono print:text-black">
                  {money(statementData.openingBalance)}{" "}
                  <span className="text-[10px] text-primary print:text-neutral-700">{statementData.openingBalanceType}</span>
                </span>
              </div>
              <div className="p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-xs print:bg-neutral-50 print:border-neutral-300">
                <span className="text-[10px] text-muted-foreground block font-medium print:text-neutral-600">Total Debit (Dr)</span>
                <span className="font-bold text-emerald-600 font-mono print:text-emerald-700">
                  {money(statementData.totalDebit)}
                </span>
              </div>
              <div className="p-2.5 bg-rose-500/5 rounded-lg border border-rose-500/20 text-xs print:bg-neutral-50 print:border-neutral-300">
                <span className="text-[10px] text-muted-foreground block font-medium print:text-neutral-600">Total Credit (Cr)</span>
                <span className="font-bold text-rose-600 font-mono print:text-rose-700">
                  {money(statementData.totalCredit)}
                </span>
              </div>
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20 text-xs print:bg-neutral-100 print:border-neutral-400">
                <span className="text-[10px] text-muted-foreground block font-medium print:text-neutral-600">Closing Balance</span>
                <span className="font-bold text-primary font-mono text-sm print:text-black">
                  {money(statementData.closingBalance)}{" "}
                  <span className="text-xs print:text-neutral-700">{statementData.closingBalanceType}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={fetchStatement}
              disabled={loading}
              title="Refresh statement"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {statementData?.statement.length || 0} Transactions
          </span>
        </div>

        {/* Statement Table Body */}
        <div className="flex-1 overflow-y-auto p-4 print:p-0 print:overflow-visible print:max-h-none print:h-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground print:hidden">
              <Loader2 className="size-6 animate-spin text-primary" />
              Loading statement records...
            </div>
          ) : !statementData || statementData.statement.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No transactions recorded for this period.
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto print:border-neutral-400 print:rounded-none print:overflow-visible">
              <Table className="text-xs min-w-[720px] w-full print:min-w-0 print:text-[11px]">
                <TableHeader className="bg-muted/50 print:bg-neutral-100">
                  <TableRow className="print:border-b-2 print:border-neutral-400">
                    <TableHead className="w-[95px] print:text-black print:font-bold">Date</TableHead>
                    <TableHead className="w-[105px] print:text-black print:font-bold">Voucher Type</TableHead>
                    <TableHead className="w-[100px] print:text-black print:font-bold">Ref / Vch No</TableHead>
                    <TableHead className="min-w-[180px] print:text-black print:font-bold">Particulars / Narration</TableHead>
                    <TableHead className="text-right w-[125px] print:text-black print:font-bold">Debit (₹ Dr)</TableHead>
                    <TableHead className="text-right w-[125px] print:text-black print:font-bold">Credit (₹ Cr)</TableHead>
                    <TableHead className="text-right w-[140px] print:text-black print:font-bold">Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Opening Balance Row */}
                  <TableRow className="bg-muted/20 font-medium italic text-muted-foreground print:bg-neutral-50 print:text-neutral-700 print:border-b print:border-neutral-300">
                    <TableCell>—</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal print:border-neutral-400 print:text-black">Opening</Badge>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="font-semibold text-foreground print:text-black">Opening Balance b/f</TableCell>
                    <TableCell className="text-right font-mono print:text-black">
                      {statementData.openingBalanceType === "Dr" ? money(statementData.openingBalance) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono print:text-black">
                      {statementData.openingBalanceType === "Cr" ? money(statementData.openingBalance) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground print:text-black">
                      {money(statementData.openingBalance)}{" "}
                      <span className="text-[10px] text-primary print:text-neutral-700">{statementData.openingBalanceType}</span>
                    </TableCell>
                  </TableRow>

                  {/* Transaction Rows */}
                  {statementData.statement.map((row) => {
                    const voucherBadge = {
                      receipt: <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] print:bg-transparent print:border-neutral-400 print:text-black">Receipt</Badge>,
                      payment: <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px] print:bg-transparent print:border-neutral-400 print:text-black">Payment</Badge>,
                      contra: <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] print:bg-transparent print:border-neutral-400 print:text-black">Contra</Badge>,
                      journal: <Badge variant="outline" className="text-[10px] print:text-black print:border-neutral-400">Journal</Badge>,
                    }[row.voucher_type || "journal"];

                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30 print:border-b print:border-neutral-200">
                        <TableCell className="font-mono text-muted-foreground print:text-black">
                          {new Date(row.entry_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{voucherBadge}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground print:text-black">
                          {row.voucher_no || `TX-${row.id}`}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground print:text-black">
                            {row.description || (row.direction === "increase" ? "Received / Inflow" : "Paid out / Outflow")}
                          </div>
                          {row.created_by_name && (
                            <span className="text-[10px] text-muted-foreground print:text-neutral-600">By: {row.created_by_name}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-600 print:text-black">
                          {row.dr_amount && row.dr_amount > 0 ? money(row.dr_amount) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-rose-600 print:text-black">
                          {row.cr_amount && row.cr_amount > 0 ? money(row.cr_amount) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground print:text-black">
                          {money(row.running_balance || 0)}{" "}
                          <span className={`text-[10px] ${row.balance_type === "Dr" ? "text-emerald-600 print:text-neutral-800" : "text-amber-600 print:text-neutral-800"}`}>
                            {row.balance_type}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Closing Balance Row */}
                  <TableRow className="bg-muted/40 font-bold border-t-2 print:bg-neutral-100 print:border-t-2 print:border-b-2 print:border-black">
                    <TableCell colSpan={4} className="text-right text-foreground print:text-black">
                      Grand Total &amp; Closing Balance:
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 font-bold print:text-black">
                      {money(statementData.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-rose-600 font-bold print:text-black">
                      {money(statementData.totalCredit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary font-bold print:text-black">
                      {money(statementData.closingBalance)} {statementData.closingBalanceType}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
