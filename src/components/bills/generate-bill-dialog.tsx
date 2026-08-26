"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Customer, Product, LedgerAccount, Quotation } from "@/lib/types";

const itemSchema = z.object({
  product_id: z.number().optional().nullable(),
  product_name: z.string().min(1, "Product name required"),
  hsn_code: z.string().optional(),
  quantity: z.number().int().positive("Qty > 0"),
  unit_price: z.number().min(0, "Price >= 0"),
});

const formSchema = z.object({
  customer_id: z.number().nullable().optional(),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  customer_address: z.string().optional(),
  bill_date: z.string().min(1, "Date is required"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  tax_amount: z.number().min(0),
  discount_amount: z.number().min(0),
  paid_amount: z.number().min(0),
  payment_status: z.enum(["paid", "unpaid", "partial"]),
  payment_method: z.enum(["cash", "bank", "credit", "other"]),
  notes: z.string().optional(),
  book_to: z.string().optional(),
  transport: z.string().optional(),
  gr_no: z.string().optional(),
  vehicle_no: z.string().optional(),
  dispute_note: z.string().optional(),
  account_id: z.number().nullable().optional(),
  record_stock_out: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function GenerateBillDialog({
  open,
  onOpenChange,
  initialProduct,
  initialQuantity = 1,
  initialQuotation,
  skipStockDeduction = false,
  onSaved,
  onCloseUnsaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProduct?: Product | null;
  initialQuantity?: number;
  initialQuotation?: Quotation | null;
  skipStockDeduction?: boolean;
  onSaved?: () => void;
  onCloseUnsaved?: () => void;
}) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const submittedRef = React.useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: null,
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_address: "",
      bill_date: new Date().toISOString().slice(0, 10),
      items: [
        {
          product_id: initialProduct?.id ?? null,
          product_name: initialProduct?.name ?? "",
          quantity: initialQuantity,
          unit_price: Number(initialProduct?.price ?? 0),
        },
      ],
      tax_amount: 0,
      discount_amount: 0,
      paid_amount: 0,
      payment_status: "paid",
      payment_method: "cash",
      notes: "",
      account_id: null,
      record_stock_out: !skipStockDeduction,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedTax = watch("tax_amount") || 0;
  const watchedDiscount = watch("discount_amount") || 0;
  const watchedStatus = watch("payment_status");

  const subtotal = watchedItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const grandTotal = Math.max(0, subtotal + Number(watchedTax) - Number(watchedDiscount));

  React.useEffect(() => {
    if (open) {
      submittedRef.current = false;
      setLoadingOptions(true);

      const loadQuotation = initialQuotation
        ? (initialQuotation.items && initialQuotation.items.length > 0
            ? Promise.resolve(initialQuotation)
            : fetch(`/api/quotations/${initialQuotation.id}`).then((r) => (r.ok ? r.json() : initialQuotation)))
        : Promise.resolve(null);

      Promise.all([
        fetch("/api/customers?limit=500").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/products?limit=500").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/balance-sheet/summary").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
        loadQuotation,
      ])
        .then(([cRes, pRes, bsRes, sRes, qData]) => {
          setCustomers(cRes.data || []);
          setProducts(pRes.data || []);
          if (bsRes) {
            const accounts = [...(bsRes.cash || []), ...(bsRes.bank || []), ...(bsRes.debtors || [])];
            setLedgerAccounts(accounts);
          }

          if (qData) {
            const qItems = (qData.items && qData.items.length > 0)
              ? qData.items.map((i: any) => ({
                  product_id: i.product_id ?? null,
                  product_name: i.product_name ?? "",
                  hsn_code: i.hsn_code ?? "",
                  quantity: Number(i.quantity) || 1,
                  unit_price: Number(i.unit_price) || 0,
                }))
              : [
                  {
                    product_id: null,
                    product_name: "Quotation Item",
                    hsn_code: "",
                    quantity: 1,
                    unit_price: Number(qData.total_amount || qData.quotation_amount || 0),
                  },
                ];

            const qSubtotal = qItems.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0);
            const qTax = Number(qData.tax_amount) || 0;
            const qDisc = Number(qData.discount_amount) || 0;
            const qTotal = Math.max(0, qSubtotal + qTax - qDisc);

            reset({
              customer_id: qData.customer_id ?? null,
              customer_name: qData.customer_name ?? "",
              customer_phone: qData.customer_phone ?? "",
              customer_email: "",
              customer_address: qData.customer_address ?? "",
              bill_date: new Date().toISOString().slice(0, 10),
              items: qItems,
              tax_amount: qTax,
              discount_amount: qDisc,
              paid_amount: qTotal,
              payment_status: "paid",
              payment_method: "cash",
              notes: qData.notes || (qData.quotation_number ? `Generated from Quotation ${qData.quotation_number}` : ""),
              book_to: qData.book_to || "",
              transport: qData.transport || "",
              gr_no: qData.gr_no || "",
              vehicle_no: qData.vehicle_no || "",
              dispute_note: qData.dispute_note || sRes?.dispute_note || "",
              account_id: null,
              record_stock_out: !skipStockDeduction,
            });
          } else {
            reset({
              customer_id: null,
              customer_name: "",
              customer_phone: "",
              customer_email: "",
              customer_address: "",
              bill_date: new Date().toISOString().slice(0, 10),
              items: [
                {
                  product_id: initialProduct?.id ?? null,
                  product_name: initialProduct?.name ?? "",
                  hsn_code: initialProduct?.hsn_code ?? initialProduct?.sku ?? "",
                  quantity: initialQuantity,
                  unit_price: Number(initialProduct?.price ?? 0),
                },
              ],
              tax_amount: 0,
              discount_amount: 0,
              paid_amount: 0,
              payment_status: "paid",
              payment_method: "cash",
              notes: initialProduct ? `Generated on stock removal for ${initialProduct.name}` : "",
              book_to: "",
              transport: "",
              gr_no: "",
              vehicle_no: "",
              dispute_note: sRes?.dispute_note || "",
              account_id: null,
              record_stock_out: !skipStockDeduction,
            });
          }
        })
        .finally(() => setLoadingOptions(false));
    }
  }, [open, reset, initialProduct, initialQuantity, initialQuotation, skipStockDeduction]);

  // Keep paid amount synced when grandTotal changes if status is "paid"
  React.useEffect(() => {
    if (watchedStatus === "paid") {
      setValue("paid_amount", grandTotal);
    } else if (watchedStatus === "unpaid") {
      setValue("paid_amount", 0);
    }
  }, [grandTotal, watchedStatus, setValue]);

  // Derive selected customer_id as string for SearchableSelect
  const watchedCustomerId = watch("customer_id");

  function handleSelectCustomer(val: string | null) {
    if (!val) {
      setValue("customer_id", null);
      return;
    }
    const custId = parseInt(val, 10);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setValue("customer_id", found.id);
      setValue("customer_name", found.name);
      setValue("customer_phone", found.phone || "");
      setValue("customer_email", found.email || "");
      setValue("customer_address", found.address || "");
    }
  }

  // Track selected product per item for SearchableSelect
  function handleSelectProduct(index: number, val: string | null) {
    if (!val) {
      setValue(`items.${index}.product_id`, null);
      return;
    }
    const pId = parseInt(val, 10);
    const found = products.find((p) => p.id === pId);
    if (found) {
      setValue(`items.${index}.product_id`, found.id);
      setValue(`items.${index}.product_name`, found.name);
      if (found.hsn_code || found.sku) {
        setValue(`items.${index}.hsn_code`, found.hsn_code || found.sku || "");
      }
      setValue(`items.${index}.unit_price`, Number(found.price));
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        tax_amount: Number(values.tax_amount) || 0,
        discount_amount: Number(values.discount_amount) || 0,
        paid_amount: Number(values.paid_amount) || 0,
        items: values.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          total_price: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
        })),
      };
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate bill");

      if (initialQuotation?.id) {
        await fetch(`/api/quotations/${initialQuotation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quotation_status: "accepted" }),
        }).catch(() => {});
      }

      toast.success(`Bill #${data.bill_number} generated successfully!`);
      submittedRef.current = true;
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen && !submittedRef.current && initialProduct && onCloseUnsaved) {
      onCloseUnsaved();
    }
    onOpenChange(newOpen);
  }

  // Build options for SearchableSelect
  const customerOptions = customers.map((c) => ({
    value: String(c.id),
    label: c.name,
    sublabel: c.phone || undefined,
  }));

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: p.name,
    sublabel: `₹${p.price}`,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold text-lg text-foreground">
            <Receipt className="size-5 text-primary" /> Generate Bill / Invoice
          </DialogTitle>
          <DialogDescription>
            Record customer purchase details, generate an official bill, and optionally sync with Balance Sheet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 py-2">
          {/* Customer Selection */}
          <div className="rounded-lg border p-4 bg-muted/20 flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>Customer Info</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="existing_customer">Select Existing Customer</Label>
                <SearchableSelect
                  options={customerOptions}
                  value={watchedCustomerId ? String(watchedCustomerId) : null}
                  onValueChange={handleSelectCustomer}
                  placeholder={loadingOptions ? "Loading customers..." : "Search & choose customer..."}
                  searchPlaceholder="Type name or phone..."
                  emptyLabel="No customer found."
                  disabled={loadingOptions}
                  triggerClassName="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input id="customer_name" {...register("customer_name")} placeholder="Full Name" />
                {errors.customer_name && <p className="text-xs text-destructive">{errors.customer_name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer_phone">Phone</Label>
                <Input id="customer_phone" {...register("customer_phone")} placeholder="+91..." />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer_address">Billing Address</Label>
                <Input id="customer_address" {...register("customer_address")} placeholder="City, State, Pin Code..." />
              </div>
            </div>

            {/* Transport & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/40">
              <div className="flex flex-col gap-1">
                <Label htmlFor="book_to" className="text-xs font-medium">Book To</Label>
                <Input id="book_to" {...register("book_to")} placeholder="e.g. GUWAHATI CITY (GWTCTY-6818)" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="transport" className="text-xs font-medium">Transport</Label>
                <Input id="transport" {...register("transport")} placeholder="e.g. VRL GUWAHATI CITY" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="gr_no" className="text-xs font-medium">GR. No.</Label>
                <Input id="gr_no" {...register("gr_no")} placeholder="e.g. INV-2026-0030" className="h-8 text-xs font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="vehicle_no" className="text-xs font-medium">Vehicle No.</Label>
                <Input id="vehicle_no" {...register("vehicle_no")} placeholder="e.g. MH31-1234" className="h-8 text-xs font-mono" />
              </div>
            </div>
          </div>

          {/* Date & Line Items */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>Product Items</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="bill_date" className="text-xs">Bill Date:</Label>
                <DatePicker
                  className="w-36 h-8 text-xs"
                  value={watch("bill_date")}
                  onChange={(val) => setValue("bill_date", val, { shouldValidate: true })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const qty = watch(`items.${index}.quantity`) || 0;
                const price = watch(`items.${index}.unit_price`) || 0;
                const rowTotal = qty * price;
                const currentProductId = watch(`items.${index}.product_id`);

                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end rounded-md border p-3 bg-card">
                    <div className="col-span-12 sm:col-span-4 flex flex-col gap-1">
                      <Label className="text-[11px]">Product Item *</Label>
                      <div className="flex gap-2">
                        <SearchableSelect
                          options={productOptions}
                          value={currentProductId ? String(currentProductId) : null}
                          onValueChange={(val) => handleSelectProduct(index, val)}
                          placeholder={loadingOptions ? "Loading..." : "Search catalog product..."}
                          searchPlaceholder="Type product name..."
                          emptyLabel="No product found."
                          disabled={loadingOptions}
                          triggerClassName="h-9 text-xs"
                        />
                      </div>
                      <Input className="h-9 text-xs mt-1" {...register(`items.${index}.product_name`)} placeholder="Item name" />
                    </div>

                    <div className="col-span-6 sm:col-span-2 flex flex-col gap-1">
                      <Label className="text-[11px]">HSN Code</Label>
                      <Input
                        className="h-9 text-xs font-mono uppercase"
                        {...register(`items.${index}.hsn_code`)}
                        placeholder="87341000"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2 flex flex-col gap-1">
                      <Label className="text-[11px]">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 text-xs"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2 flex flex-col gap-1">
                      <Label className="text-[11px]">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        className="h-9 text-xs"
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2 flex items-center justify-between gap-1 pb-1">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className="font-mono text-xs font-semibold">₹{rowTotal.toLocaleString("en-IN")}</p>
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1 text-xs"
              onClick={() => append({ product_id: null, product_name: "", hsn_code: "", quantity: 1, unit_price: 0 })}
            >
              <Plus className="size-3.5" /> Add Product Line
            </Button>
          </div>

          {/* Payment & Totals */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-t pt-4">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>Payment Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Payment Status</Label>
                  <Select
                    value={watchedStatus}
                    onValueChange={(val) => setValue("payment_status", val as any)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid / Credit</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Payment Method</Label>
                  <Select
                    defaultValue="cash"
                    onValueChange={(val) => setValue("payment_method", val as any)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank / UPI</SelectItem>
                      <SelectItem value="credit">Credit / Debtor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {ledgerAccounts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Sync with Balance Sheet Account</Label>
                  <Select onValueChange={(val) => setValue("account_id", val === "none" ? null : parseInt(val, 10))}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Record in Ledger... (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Don't record in Ledger --</SelectItem>
                      {ledgerAccounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name} ({a.type.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes" className="text-xs">Notes / Terms</Label>
                <Textarea id="notes" className="text-xs" {...register("notes")} placeholder="Thank you for your business..." />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dispute_note" className="text-xs font-medium">Attachment / Jurisdiction Note</Label>
                <Input id="dispute_note" className="text-xs" {...register("dispute_note")} placeholder="ALL DISPUTES SUBJECT TO NAGPUR JURISDICTION" />
              </div>
            </div>

            {/* Calculations Box */}
            <div className="rounded-lg border p-4 bg-muted/10 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium text-foreground">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="tax_amount" className="text-xs text-muted-foreground">Tax / GST (₹):</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    min={0}
                    className="w-28 h-8 text-xs text-right font-mono"
                    {...register("tax_amount", { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="discount_amount" className="text-xs text-muted-foreground">Discount (₹):</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    min={0}
                    className="w-28 h-8 text-xs text-right font-mono"
                    {...register("discount_amount", { valueAsNumber: true })}
                  />
                </div>

                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary text-base">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>

                {watchedStatus === "partial" && (
                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <Label htmlFor="paid_amount" className="text-xs text-muted-foreground">Amount Paid (₹):</Label>
                    <Input
                      id="paid_amount"
                      type="number"
                      min={0}
                      className="w-28 h-8 text-xs text-right font-mono"
                      {...register("paid_amount", { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Create &amp; Issue Bill
                </Button>
              </DialogFooter>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
