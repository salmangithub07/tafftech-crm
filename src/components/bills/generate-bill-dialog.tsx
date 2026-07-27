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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer, Product, LedgerAccount } from "@/lib/types";

const itemSchema = z.object({
  product_id: z.number().optional().nullable(),
  product_name: z.string().min(1, "Product name required"),
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
  account_id: z.number().nullable().optional(),
  record_stock_out: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function GenerateBillDialog({
  open,
  onOpenChange,
  initialProduct,
  initialQuantity = 1,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProduct?: Product | null;
  initialQuantity?: number;
  onSaved?: () => void;
}) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(false);

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
      record_stock_out: false,
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
      setLoadingOptions(true);
      Promise.all([
        fetch("/api/customers?limit=100").then((r) => r.ok ? r.json() : { data: [] }),
        fetch("/api/products?limit=100").then((r) => r.ok ? r.json() : { data: [] }),
        fetch("/api/balance-sheet/summary").then((r) => r.ok ? r.json() : null),
      ]).then(([cRes, pRes, bsRes]) => {
        setCustomers(cRes.data || []);
        setProducts(pRes.data || []);
        if (bsRes) {
          const accounts = [...(bsRes.cash || []), ...(bsRes.bank || []), ...(bsRes.debtors || [])];
          setLedgerAccounts(accounts);
        }
      }).finally(() => setLoadingOptions(false));

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
            quantity: initialQuantity,
            unit_price: Number(initialProduct?.price ?? 0),
          },
        ],
        tax_amount: 0,
        discount_amount: 0,
        paid_amount: grandTotal,
        payment_status: "paid",
        payment_method: "cash",
        notes: initialProduct ? `Generated on stock removal for ${initialProduct.name}` : "",
        account_id: null,
        record_stock_out: false,
      });
    }
  }, [open, reset, initialProduct, initialQuantity]);

  // Keep paid amount synced when grandTotal changes if status is "paid"
  React.useEffect(() => {
    if (watchedStatus === "paid") {
      setValue("paid_amount", grandTotal);
    } else if (watchedStatus === "unpaid") {
      setValue("paid_amount", 0);
    }
  }, [grandTotal, watchedStatus, setValue]);

  function handleSelectCustomer(val: string) {
    if (!val || val === "none") {
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

  function handleSelectProduct(index: number, val: string) {
    if (!val || val === "custom") return;
    const pId = parseInt(val, 10);
    const found = products.find((p) => p.id === pId);
    if (found) {
      setValue(`items.${index}.product_id`, found.id);
      setValue(`items.${index}.product_name`, found.name);
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
      toast.success(`Bill #${data.bill_number} generated successfully!`);
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" /> Generate Bill / Invoice
          </DialogTitle>
          <DialogDescription>
            Record customer purchase details, generate an official bill, and optionally sync with Balance Sheet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 py-2">
          {/* Customer Selection */}
          <div className="rounded-lg border p-4 bg-muted/20 flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Info</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="existing_customer">Select Existing Customer</Label>
                <Select onValueChange={handleSelectCustomer}>
                  <SelectTrigger id="existing_customer">
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Manual Entry --</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="customer_email">Email</Label>
                <Input id="customer_email" type="email" {...register("customer_email")} placeholder="customer@example.com" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer_address">Billing Address</Label>
              <Input id="customer_address" {...register("customer_address")} placeholder="City, State, Pin Code..." />
            </div>
          </div>

          {/* Date & Line Items */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Items</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="bill_date" className="text-xs">Bill Date:</Label>
                <Input id="bill_date" type="date" className="w-36 h-8 text-xs" {...register("bill_date")} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const qty = watch(`items.${index}.quantity`) || 0;
                const price = watch(`items.${index}.unit_price`) || 0;
                const rowTotal = qty * price;

                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end rounded-md border p-3 bg-card">
                    <div className="col-span-12 sm:col-span-5 flex flex-col gap-1">
                      <Label className="text-[11px]">Product Item *</Label>
                      <div className="flex gap-2">
                        <Select onValueChange={(val) => handleSelectProduct(index, val)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Pick catalog product..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">-- Custom Product --</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name} (₹{p.price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input className="h-9 text-xs mt-1" {...register(`items.${index}.product_name`)} placeholder="Item name" />
                    </div>

                    <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
                      <Label className="text-[11px]">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 text-xs"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-3 flex flex-col gap-1">
                      <Label className="text-[11px]">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        className="h-9 text-xs"
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2 flex items-center justify-between gap-1 pb-1">
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
              onClick={() => append({ product_id: null, product_name: "", quantity: 1, unit_price: 0 })}
            >
              <Plus className="size-3.5" /> Add Product Line
            </Button>
          </div>

          {/* Payment & Totals */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-t pt-4">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Details</h3>
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
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
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
