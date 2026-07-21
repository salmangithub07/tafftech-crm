"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Plus, MoreVertical, Pencil, Trash2, PackagePlus, PackageMinus, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import type { Product, StockTransaction } from "@/lib/types";

type Counts = { all: number; in: number; out: number };
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
  const [counts, setCounts] = React.useState<Counts>({ all: 0, in: 0, out: 0 });
  const [tab, setTab] = React.useState<"all" | "in" | "out">("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ period: "all", value: "" });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState<Product | null>(null);
  const [stockDialog, setStockDialog] = React.useState<{ product: Product; type: "in" | "out" } | null>(null);
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
      ...dateFilterParams(dateFilter),
    });
    const [pRes, sRes] = await Promise.all([fetch(`/api/products?${params}`), fetch("/api/stock")]);
    if (pRes.ok) {
      const json = await pRes.json();
      setProducts(json.data);
      setTotal(json.total);
      setCounts(json.counts);
    }
    if (sRes.ok) setTransactions(await sRes.json());
  }, [tab, page, pageSize, dateFilter]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches whenever any filter/pagination input changes
    fetchProducts();
  }, [fetchProducts]);

  function changeTab(next: string) {
    setTab(next as "all" | "in" | "out");
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

  async function handleDelete(product: Product) {
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete product.");
      return;
    }
    toast.success("Product deleted.");
    refresh();
  }

  const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products &amp; Stock</h1>
          <p className="text-sm text-muted-foreground">Manage inventory and stock movement.</p>
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
            <Link href="/api/products/export">
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
            <Plus className="size-4" /> Add Product
          </Button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="py-3 text-sm text-warning">
            ⚠ {lowStock.length} product{lowStock.length > 1 ? "s" : ""} running low (≤ 5 units):{" "}
            {lowStock.map((p) => p.name).join(", ")}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="report">Stock Report</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 flex flex-col gap-4">
          <Tabs value={tab} onValueChange={changeTab}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="in">In Stock ({counts.in})</TabsTrigger>
                <TabsTrigger value="out">Out of Stock ({counts.out})</TabsTrigger>
              </TabsList>
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
            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell>₹{Number(p.price).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge variant={(p.stock ?? 0) <= 5 ? "warning" : "secondary"}>{p.stock ?? 0}</Badge>
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
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No stock movement recorded yet.
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden py-0">
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
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.product_name}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === "in" ? "success" : "destructive"} className="uppercase">
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{t.note || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{t.created_by_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
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
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          description="Its stock history will also be deleted. This action cannot be undone."
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  );
}
