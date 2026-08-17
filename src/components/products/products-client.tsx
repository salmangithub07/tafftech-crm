"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { AlertTriangle, Plus, MoreVertical, Pencil, Trash2, PackagePlus, PackageMinus, Upload, Download, Search, TrendingUp, DollarSign, PiggyBank, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { StockDialog } from "@/components/products/stock-dialog";
import { GenerateBillDialog } from "@/components/bills/generate-bill-dialog";
import { ProductDeleteDialog } from "@/components/products/product-delete-dialog";
import { StockOutReasonDialog } from "@/components/products/stock-out-reason-dialog";
import type { Product, StockTransaction } from "@/lib/types";

type Counts = { all: number; in: number; low: number; out: number };
const PAGE_SIZE_KEY = "nova-crm:pageSize:products";

export function ProductsClient({
  initialProducts,
  initialTransactions,
}: {
  initialProducts: Product[];
  initialTransactions: StockTransaction[];
}) {
  const router = useRouter();
  const [products, setProducts] = React.useState(initialProducts);
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<Counts>({ all: 0, in: 0, low: 0, out: 0 });
  const [tab, setTab] = React.useState<"all" | "in" | "low" | "out">("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [profitSummary, setProfitSummary] = React.useState({
    total_cost_value: 0,
    total_sell_value: 0,
    potential_profit: 0,
    realized_profit: 0,
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState<Product | null>(null);
  const [stockDialog, setStockDialog] = React.useState<{ product: Product; type: "in" | "out" } | null>(null);
  const [generateBillPrompt, setGenerateBillPrompt] = React.useState<{ product: Product; quantity: number } | null>(null);
  const [auditReasonProduct, setAuditReasonProduct] = React.useState<{ product: Product; quantity: number } | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);


  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of the saved page-size preference
    if (saved) setPageSize(Number(saved));
  }, []);

  const fetchProducts = React.useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...(tab !== "all" ? { stock: tab } : {}),
      ...(search ? { search } : {}),
      ...dateFilterParams(dateFilter),
    });
    const [pRes, sRes] = await Promise.all([fetch(`/api/products?${params}`), fetch("/api/stock")]);
    if (pRes.ok) {
      const json = await pRes.json();
      setProducts(json.data);
      setTotal(json.total);
      setCounts(json.counts);
      if (json.profit_summary) setProfitSummary(json.profit_summary);
    }
    if (sRes.ok) setTransactions(await sRes.json());
  }, [tab, page, pageSize, search, dateFilter]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches whenever any filter/pagination input changes
    fetchProducts();
  }, [fetchProducts]);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function changeTab(next: string) {
    setTab(next as "all" | "in" | "low" | "out");
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
    await fetchProducts();
    router.refresh();
  }

  async function handleDelete(product: Product, reason: string, creditorAccountId?: number | null) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, creditor_account_id: creditorAccountId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Could not delete product.");
      return;
    }
    toast.success("Product deleted.");
    refresh();
  }

  const lowStock = products.filter(
    (p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.min_stock_level ?? 5)
  );

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const res = await fetch("/api/products/import", {
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
          `${data.inserted} products imported${data.skipped ? `, ${data.skipped} rows skipped` : ""}.`
        );
        refresh();
      },
      error: () => toast.error("Could not read the file."),
    });
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header - 50/50 2 Columns on Mobile */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        {/* Left Column (50%) */}
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Products &amp; Stock</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">Manage inventory, reorder alerts, and stock movement.</p>
        </div>

        {/* Right Column (50%) */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[135px] sm:min-w-0 sm:flex-row sm:items-center sm:gap-2">
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="w-full sm:w-auto h-9 px-3 text-xs font-semibold gap-1 shadow-sm">
            <Plus className="size-4" /> Add Product
          </Button>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()} className="flex-1 sm:flex-initial h-8 px-2 text-[11px] font-medium justify-center gap-1" title="Import CSV">
              <Upload className="size-3" /> Import
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-initial h-8 px-2 text-[11px] font-medium justify-center gap-1" title="Export CSV">
              <Link href="/api/products/export">
                <Download className="size-3" /> Export
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <CardContent className="flex items-center gap-2 py-3 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>{lowStock.length} product{lowStock.length > 1 ? "s" : ""}</strong> at or below reorder level:{" "}
              <span className="font-medium">{lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ")}</span>
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="report">Stock Report</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 flex flex-col gap-4">
          {/* Profit & Valuation Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-3.5 min-w-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="truncate pr-1">Stock Cost Value</span>
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <p className="text-sm xs:text-base sm:text-lg font-bold font-mono text-foreground mt-1 truncate" title={`₹${profitSummary.total_cost_value.toLocaleString("en-IN")}`}>
                ₹{profitSummary.total_cost_value.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">Total purchase value</p>
            </Card>

            <Card className="p-3.5 min-w-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="truncate pr-1">Stock Selling Value</span>
                <Receipt className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <p className="text-sm xs:text-base sm:text-lg font-bold font-mono text-foreground mt-1 truncate" title={`₹${profitSummary.total_sell_value.toLocaleString("en-IN")}`}>
                ₹{profitSummary.total_sell_value.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">Total selling value</p>
            </Card>

            <Card className="p-3.5 border-emerald-500/30 bg-emerald-500/5 min-w-0">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <span className="truncate pr-1">Potential Profit</span>
                <TrendingUp className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm xs:text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 truncate" title={`₹${profitSummary.potential_profit.toLocaleString("en-IN")}`}>
                ₹{profitSummary.potential_profit.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 truncate">If 100% stock is sold</p>
            </Card>

            <Card className="p-3.5 border-blue-500/30 bg-blue-500/5 min-w-0">
              <div className="flex items-center justify-between text-xs font-medium text-blue-800 dark:text-blue-300">
                <span className="truncate pr-1">Realized Profit</span>
                <PiggyBank className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm xs:text-base sm:text-lg font-bold font-mono text-blue-700 dark:text-blue-400 mt-1 truncate" title={`₹${profitSummary.realized_profit.toLocaleString("en-IN")}`}>
                ₹{profitSummary.realized_profit.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 truncate">From Stock Out / Bills</p>
            </Card>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products by name..."
              className="pl-9"
            />
          </div>
          <Tabs value={tab} onValueChange={changeTab}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
              <div className="w-full sm:w-auto overflow-x-auto scrollbar-none py-0.5">
                <TabsList className="w-max sm:w-fit justify-start sm:justify-center h-9 sm:h-10">
                  <TabsTrigger value="all" className="px-2.5 sm:px-3 text-xs sm:text-sm">All ({counts.all})</TabsTrigger>
                  <TabsTrigger value="in" className="px-2.5 sm:px-3 text-xs sm:text-sm">In Stock ({counts.in})</TabsTrigger>
                  <TabsTrigger value="low" className="px-2.5 sm:px-3 text-xs sm:text-sm">Low Stock ({counts.low})</TabsTrigger>
                  <TabsTrigger value="out" className="px-2.5 sm:px-3 text-xs sm:text-sm">Out of Stock ({counts.out})</TabsTrigger>
                </TabsList>
              </div>
              <DateFilter value={dateFilter} onChange={changeDateFilter} />
            </div>
          </Tabs>

          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No products found. Add a new product to get started.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table View */}
              <Card className="hidden overflow-hidden py-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Profit / Unit</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Stock Valuation</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const currentStock = p.stock ?? 0;
                      const minLevel = p.min_stock_level ?? 5;
                      const unitStr = p.unit || "Pcs";
                      const costPrice = Number(p.cost_price || 0);
                      const sellPrice = Number(p.price || 0);
                      const unitProfit = sellPrice - costPrice;
                      const marginPct = sellPrice > 0 && costPrice > 0 ? Math.round((unitProfit / sellPrice) * 100) : 0;
                      const totalCostVal = currentStock * costPrice;
                      const totalSellVal = currentStock * sellPrice;
                      const totalPotentialProfit = Math.max(0, totalSellVal - totalCostVal);
                      const isOut = currentStock <= 0;
                      const isLow = !isOut && currentStock <= minLevel;

                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{p.name}</span>
                              {p.supplier_name && (
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  Supplier: {p.supplier_name}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <Badge variant="outline" className="font-normal text-xs">{unitStr}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">₹{costPrice.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="font-mono font-medium">₹{sellPrice.toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={`font-mono font-medium ${unitProfit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                ₹{unitProfit.toLocaleString("en-IN")}
                              </span>
                              {marginPct > 0 && (
                                <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 font-medium">
                                  {marginPct}% margin
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isOut ? (
                              <Badge variant="destructive">Out of stock (0 {unitStr})</Badge>
                            ) : isLow ? (
                              <Badge variant="warning" className="gap-1 font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                                Low: {currentStock} {unitStr}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{currentStock} {unitStr}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-foreground">₹{totalSellVal.toLocaleString("en-IN")}</span>
                              {totalPotentialProfit > 0 && currentStock > 0 && (
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                  Profit: +₹{totalPotentialProfit.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setStockDialog({ product: p, type: "in" })}>
                                  <PackagePlus className="size-4" /> Add stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStockDialog({ product: p, type: "out" })}>
                                  <PackageMinus className="size-4" /> Remove stock
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditing(p);
                                    setFormOpen(true);
                                  }}
                                >
                                  <Pencil className="size-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                                  <Trash2 className="size-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

              {/* Mobile Card View */}
              <div className="flex flex-col gap-3 md:hidden">
                {products.map((p) => {
                  const currentStock = p.stock ?? 0;
                  const minLevel = p.min_stock_level ?? 5;
                  const unitStr = p.unit || "Pcs";
                  const costPrice = Number(p.cost_price || 0);
                  const sellPrice = Number(p.price || 0);
                  const unitProfit = sellPrice - costPrice;
                  const marginPct = sellPrice > 0 && costPrice > 0 ? Math.round((unitProfit / sellPrice) * 100) : 0;
                  const totalSellVal = currentStock * sellPrice;
                  const isOut = currentStock <= 0;
                  const isLow = !isOut && currentStock <= minLevel;

                  return (
                    <Card key={p.id}>
                      <CardContent className="flex flex-col gap-3 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground">{p.name}</p>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{unitStr}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>Cost: ₹{costPrice.toLocaleString("en-IN")}</span>
                              <span>Sell: ₹{sellPrice.toLocaleString("en-IN")}</span>
                            </div>
                            {unitProfit > 0 && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                                Profit/unit: ₹{unitProfit.toLocaleString("en-IN")} {marginPct > 0 ? `(${marginPct}% margin)` : ""}
                              </p>
                            )}
                            {p.supplier_name && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                                Supplier: {p.supplier_name}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 -mr-2">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setStockDialog({ product: p, type: "in" })}>
                                <PackagePlus className="size-4" /> Add stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStockDialog({ product: p, type: "out" })}>
                                <PackageMinus className="size-4" /> Remove stock
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(p);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Stock Value</span>
                            <span className="font-mono font-bold text-foreground">₹{totalSellVal.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            {isOut ? (
                              <Badge variant="destructive">Out of stock (0 {unitStr})</Badge>
                            ) : isLow ? (
                              <Badge variant="warning" className="gap-1 font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                                Low: {currentStock} {unitStr}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{currentStock} {unitStr} in stock</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <PaginationBar
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={changePageSize}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No stock movement recorded yet.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden overflow-hidden py-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => {
                      const isDeleted = t.note?.startsWith("[DELETED]");
                      let displayName = t.product_name;
                      let displayNote = t.note || "—";

                      if (isDeleted) {
                        if (!displayName && t.note) {
                          const match = t.note.match(/^\[DELETED\]\s*(.*?)\s*—\s*Reason:/);
                          displayName = match && match[1] ? match[1].trim() : t.note.replace("[DELETED] ", "").split("—")[0]?.trim() || "Deleted product";
                        }
                        if (t.note?.includes("— Reason:")) {
                          const parts = t.note.split("— Reason:");
                          displayNote = `Reason: ${parts[1].trim()}`;
                        } else if (t.note) {
                          displayNote = t.note.replace("[DELETED] ", "");
                        }
                      }

                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{displayName || "Deleted product"}</span>
                              {isDeleted && (
                                <span className="text-[10px] text-muted-foreground italic">(Deleted)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isDeleted ? (
                              <Badge variant="outline" className="uppercase border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-semibold">
                                Deleted
                              </Badge>
                            ) : (
                              <Badge variant={t.type === "in" ? "success" : "destructive"} className="uppercase">
                                {t.type}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{t.quantity}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[260px] truncate">{displayNote}</TableCell>
                          <TableCell className="text-muted-foreground">{t.created_by_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString("en-IN")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {transactions.map((t) => {
                  const isDeleted = t.note?.startsWith("[DELETED]");
                  let displayName = t.product_name;
                  let displayNote = t.note;

                  if (isDeleted) {
                    if (!displayName && t.note) {
                      const match = t.note.match(/^\[DELETED\]\s*(.*?)\s*—\s*Reason:/);
                      displayName = match && match[1] ? match[1].trim() : t.note.replace("[DELETED] ", "").split("—")[0]?.trim() || "Deleted product";
                    }
                    if (t.note?.includes("— Reason:")) {
                      const parts = t.note.split("— Reason:");
                      displayNote = `Reason: ${parts[1].trim()}`;
                    } else if (t.note) {
                      displayNote = t.note.replace("[DELETED] ", "");
                    }
                  }

                  return (
                    <Card key={t.id}>
                      <CardContent className="flex flex-col gap-2 py-3.5 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {displayName || "Deleted product"}
                          </span>
                          {isDeleted ? (
                            <Badge variant="outline" className="uppercase text-[10px] border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-semibold">
                              DELETED
                            </Badge>
                          ) : (
                            <Badge variant={t.type === "in" ? "success" : "destructive"} className="uppercase text-[10px]">
                              {t.type === "in" ? `+${t.quantity} IN` : `-${t.quantity} OUT`}
                            </Badge>
                          )}
                        </div>
                        {displayNote && (
                          <p className="text-xs text-muted-foreground">{displayNote}</p>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>By: {t.created_by_name || "System"}</span>
                          <span>{new Date(t.created_at).toLocaleDateString("en-IN")}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} onSaved={refresh} />

      {stockDialog && (
        <StockDialog
          open={!!stockDialog}
          onOpenChange={(open) => !open && setStockDialog(null)}
          product={stockDialog.product}
          type={stockDialog.type}
          onSaved={refresh}
          onGenerateBill={(product, quantity) => setGenerateBillPrompt({ product, quantity })}
          onCloseWithoutBill={(product, quantity) => setAuditReasonProduct({ product, quantity })}
        />
      )}

      {generateBillPrompt && (
        <GenerateBillDialog
          open={!!generateBillPrompt}
          onOpenChange={(open) => !open && setGenerateBillPrompt(null)}
          initialProduct={generateBillPrompt.product}
          initialQuantity={generateBillPrompt.quantity}
          skipStockDeduction={true}
          onSaved={refresh}
          onCloseUnsaved={() => {
            setAuditReasonProduct({
              product: generateBillPrompt.product,
              quantity: generateBillPrompt.quantity,
            });
          }}
        />
      )}

      <StockOutReasonDialog
        open={!!auditReasonProduct}
        product={auditReasonProduct?.product ?? null}
        quantity={auditReasonProduct?.quantity ?? 1}
        onSaved={() => {
          setAuditReasonProduct(null);
          refresh();
        }}
      />

      <ProductDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        product={deleting}
        onConfirm={(reason, creditorAccountId) => handleDelete(deleting!, reason, creditorAccountId)}
      />
    </div>
  );
}

