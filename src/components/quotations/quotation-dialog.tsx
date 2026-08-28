"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, FileText } from "lucide-react";
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
import type { Customer, Product, Appointment, Quotation } from "@/lib/types";

const itemSchema = z.object({
  product_id: z.number().nullable().optional(),
  product_name: z.string().min(1, "Product name required"),
  hsn_code: z.string().optional(),
  quantity: z.number().int().positive("Qty > 0"),
  unit_price: z.number().min(0, "Price >= 0"),
});

const formSchema = z.object({
  appointment_id: z.number().nullable().optional(),
  customer_id: z.number().nullable().optional(),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  customer_gst_number: z.string().optional(),
  tax_type: z.enum(["cgst_sgst", "igst", "none"]),
  tax_percent: z.number().min(0),
  quotation_date: z.string().min(1, "Date is required"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  tax_amount: z.number().min(0),
  discount_amount: z.number().min(0),
  notes: z.string().optional(),
  book_to: z.string().optional(),
  transport: z.string().optional(),
  gr_no: z.string().optional(),
  vehicle_no: z.string().optional(),
  dispute_note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function QuotationDialog({
  open,
  onOpenChange,
  appointment,
  initialCustomer,
  quotationToEdit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  initialCustomer?: Customer | null;
  quotationToEdit?: Quotation | null;
  onSaved?: () => void;
}) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
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
      appointment_id: null,
      customer_id: null,
      customer_name: "",
      customer_phone: "",
      customer_address: "",
      customer_gst_number: "",
      tax_type: "igst",
      tax_percent: 18,
      quotation_date: new Date().toISOString().slice(0, 10),
      items: [
        {
          product_id: null,
          product_name: "",
          hsn_code: "",
          quantity: 1,
          unit_price: 0,
        },
      ],
      tax_amount: 0,
      discount_amount: 0,
      notes: "",
      book_to: "",
      transport: "",
      gr_no: "",
      vehicle_no: "",
      dispute_note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items") || [];
  const watchedTaxType = watch("tax_type") || "igst";
  const watchedTaxPercent = watch("tax_percent") ?? 18;
  const watchedTaxAmount = watch("tax_amount") || 0;
  const watchedDiscountAmount = watch("discount_amount") || 0;
  const watchedCustomerId = watch("customer_id");

  const subtotal = watchedItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return acc + qty * price;
  }, 0);

  const [taxPresetKey, setTaxPresetKey] = React.useState<string>("igst_18");

  function deriveTaxPresetKey(taxType: string | null | undefined, taxPercent: number | null | undefined): string {
    const type = taxType || "igst";
    const rate = Number(taxPercent) || 18;
    if (type === "none") return "none";
    if (type === "cgst_sgst") return `cgst_sgst_${rate}`;
    return `igst_${rate}`;
  }

  function handleSelectTaxPreset(key: string) {
    setTaxPresetKey(key);
    if (key === "none") {
      setValue("tax_type", "none");
      setValue("tax_percent", 0);
      setValue("tax_amount", 0);
    } else if (key === "custom") {
      setValue("tax_type", "igst");
    } else {
      const parts = key.split("_");
      const rate = Number(parts[parts.length - 1]);
      const type = key.startsWith("cgst_sgst") ? "cgst_sgst" : "igst";
      setValue("tax_type", type);
      setValue("tax_percent", rate);
      const calculated = Math.round((subtotal * rate) / 100);
      setValue("tax_amount", calculated);
    }
  }

  React.useEffect(() => {
    if (taxPresetKey !== "none" && taxPresetKey !== "custom") {
      const parts = taxPresetKey.split("_");
      const rate = Number(parts[parts.length - 1]);
      const calculated = Math.round((subtotal * rate) / 100);
      setValue("tax_amount", calculated);
    }
  }, [subtotal, taxPresetKey, setValue]);

  const grandTotal = Math.max(0, subtotal + Number(watchedTaxAmount) - Number(watchedDiscountAmount));

  React.useEffect(() => {
    if (open) {
      setLoadingOptions(true);
      Promise.all([
        fetch("/api/customers?limit=500").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/products?limit=500").then((r) => (r.ok ? r.json() : { data: [] })),
      ])
        .then(([custRes, prodRes]) => {
          const custData: Customer[] = custRes.data || [];
          const prodData: Product[] = prodRes.data || [];
          setCustomers(custData);
          setProducts(prodData);

          if (quotationToEdit) {
            const formattedItems = Array.isArray(quotationToEdit.items) && quotationToEdit.items.length > 0
              ? quotationToEdit.items.map((item: any) => ({
                  product_id: item.product_id ? Number(item.product_id) : null,
                  product_name: item.product_name || "",
                  hsn_code: item.hsn_code || "",
                  quantity: Number(item.quantity) || 1,
                  unit_price: Number(item.unit_price) || 0,
                }))
              : [
                  {
                    product_id: null,
                    product_name: "",
                    hsn_code: "",
                    quantity: 1,
                    unit_price: 0,
                  },
                ];

            reset({
              appointment_id: quotationToEdit.appointment_id ?? null,
              customer_id: quotationToEdit.customer_id ?? null,
              customer_name: quotationToEdit.customer_name ?? "",
              customer_phone: quotationToEdit.customer_phone ?? "",
              customer_address: quotationToEdit.customer_address ?? "",
              customer_gst_number: (quotationToEdit as any).customer_gst_number ?? "",
              tax_type: (quotationToEdit as any).tax_type ?? "igst",
              tax_percent: Number((quotationToEdit as any).tax_percent) || 18,
              quotation_date: quotationToEdit.quotation_date ? String(quotationToEdit.quotation_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
              items: formattedItems,
              tax_amount: Number(quotationToEdit.tax_amount) || 0,
              discount_amount: Number(quotationToEdit.discount_amount) || 0,
              notes: quotationToEdit.notes ?? "",
              book_to: quotationToEdit.book_to ?? "",
              transport: quotationToEdit.transport ?? "",
              gr_no: quotationToEdit.gr_no ?? "",
              vehicle_no: quotationToEdit.vehicle_no ?? "",
              dispute_note: quotationToEdit.dispute_note ?? "",
            });
            setTaxPresetKey(deriveTaxPresetKey((quotationToEdit as any).tax_type, (quotationToEdit as any).tax_percent));
          } else {
            const targetCust = initialCustomer || (appointment ? custData.find((c) => c.id === appointment.customer_id) : null);
            const initialProdName = appointment?.title || appointment?.customer_product || "";
            const foundProd = prodData.find((p) => p.name.toLowerCase() === initialProdName.toLowerCase());

            reset({
              appointment_id: appointment?.id ?? null,
              customer_id: targetCust?.id ?? appointment?.customer_id ?? null,
              customer_name: targetCust?.name ?? appointment?.customer_name ?? "",
              customer_phone: targetCust?.phone ?? appointment?.customer_phone ?? "",
              customer_address: targetCust?.address ?? "",
              customer_gst_number: "",
              tax_type: "igst",
              tax_percent: 18,
              quotation_date: new Date().toISOString().slice(0, 10),
              items: [
                {
                  product_id: foundProd?.id ?? null,
                  product_name: foundProd?.name ?? initialProdName ?? "",
                  hsn_code: foundProd?.hsn_code ?? foundProd?.sku ?? "",
                  quantity: 1,
                  unit_price: Number(foundProd?.price ?? 0),
                },
              ],
              tax_amount: 0,
              discount_amount: 0,
              notes: appointment?.remarks ?? "",
              book_to: "",
              transport: "",
              gr_no: "",
              vehicle_no: "",
              dispute_note: "",
            });
            setTaxPresetKey("igst_18");
          }
        })
        .catch(() => {
          setCustomers([]);
          setProducts([]);
        })
        .finally(() => setLoadingOptions(false));
    }
  }, [open, appointment, initialCustomer, quotationToEdit, reset]);

  function handleSelectCustomer(val: string | null) {
    if (!val) {
      setValue("customer_id", null);
      return;
    }
    const custId = Number(val);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setValue("customer_id", found.id);
      setValue("customer_name", found.name);
      setValue("customer_phone", found.phone || "");
      setValue("customer_address", found.address || "");
    }
  }

  function handleSelectProduct(index: number, val: string | null) {
    if (!val) return;
    const prodId = Number(val);
    const found = products.find((p) => p.id === prodId);
    if (found) {
      setValue(`items.${index}.product_id`, found.id);
      setValue(`items.${index}.product_name`, found.name);
      setValue(`items.${index}.hsn_code`, found.hsn_code || found.sku || "");
      setValue(`items.${index}.unit_price`, Number(found.price || 0));
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const isEditing = !!quotationToEdit;
      const url = isEditing ? `/api/quotations/${quotationToEdit.id}` : "/api/quotations";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? values
            : {
                ...values,
                quotation_status: "pending",
              }
        ),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || `Failed to ${isEditing ? "update" : "create"} quotation.`);
      }

      if (!res.ok) throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} quotation`);

      toast.success(`Quotation ${isEditing ? "updated" : "generated"} successfully!`);
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold text-lg text-foreground">
            <FileText className="size-5 text-primary" />
            {quotationToEdit
              ? `Edit Quotation #${quotationToEdit.quotation_number || quotationToEdit.id}`
              : "Generate Quotation / Proforma Invoice"}
          </DialogTitle>
          <DialogDescription>
            {quotationToEdit
              ? `Updating quotation details for ${quotationToEdit.customer_name}`
              : appointment
              ? `Quotation for ${appointment.customer_name}`
              : "Create an official quotation with line items and transport details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Customer Info Section */}
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer_gst_number">Customer GSTIN (Optional)</Label>
                <Input id="customer_gst_number" className="font-mono uppercase text-xs" {...register("customer_gst_number")} placeholder="e.g. 27AAAAA0000A1Z5" />
              </div>
            </div>

            {/* Transport & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/40">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="book_to" className="text-xs">Book To</Label>
                <Input id="book_to" {...register("book_to")} placeholder="e.g. CITY NAME" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transport" className="text-xs">Transport</Label>
                <Input id="transport" {...register("transport")} placeholder="e.g. VRL CITY" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gr_no" className="text-xs">GR. No.</Label>
                <Input id="gr_no" {...register("gr_no")} placeholder="e.g. GR-1024" className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vehicle_no" className="text-xs">Vehicle No.</Label>
                <Input id="vehicle_no" {...register("vehicle_no")} placeholder="e.g. MH31-1234" className="h-8 text-xs" />
              </div>
            </div>
          </div>

          {/* Product Line Items */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>Product Items</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="quotation_date" className="text-xs">Quotation Date:</Label>
                <DatePicker
                  className="w-36 h-8 text-xs"
                  value={watch("quotation_date")}
                  onChange={(val) => setValue("quotation_date", val, { shouldValidate: true })}
                />
              </div>
            </div>

            {fields.map((field, index) => {
              const qty = watch(`items.${index}.quantity`) || 0;
              const price = watch(`items.${index}.unit_price`) || 0;
              const lineTotal = qty * price;

              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-3 bg-card">
                  <div className="col-span-12 sm:col-span-4 flex flex-col gap-1">
                    <Label className="text-[11px]">Product Item *</Label>
                    <SearchableSelect
                      options={productOptions}
                      value={watch(`items.${index}.product_id`) ? String(watch(`items.${index}.product_id`)) : null}
                      onValueChange={(val) => handleSelectProduct(index, val)}
                      placeholder="Search catalog product..."
                      searchPlaceholder="Search product..."
                      emptyLabel="No product found."
                      disabled={loadingOptions}
                      triggerClassName="h-8 text-xs mb-1"
                    />
                    <Input
                      {...register(`items.${index}.product_name`)}
                      placeholder="Item name"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
                    <Label className="text-[11px]">HSN Code</Label>
                    <Input
                      {...register(`items.${index}.hsn_code`)}
                      placeholder="HSN Code"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-3 sm:col-span-2 flex flex-col gap-1">
                    <Label className="text-[11px]">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
                    <Label className="text-[11px]">Unit Price (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-end pb-1">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="col-span-12 text-right text-xs text-muted-foreground pt-1 border-t border-border/40">
                    Total: <span className="font-semibold text-foreground font-mono">₹{lineTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ product_id: null, product_name: "", hsn_code: "", quantity: 1, unit_price: 0 })}
              className="w-fit text-xs gap-1"
            >
              <Plus className="size-3.5" /> Add Product Line
            </Button>
          </div>

          {/* Tax, Discount & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/20">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dispute_note">Attachment / Dispute Note</Label>
                <Input
                  id="dispute_note"
                  {...register("dispute_note")}
                  placeholder="e.g. ALL DISPUTES SUBJECT TO LOCAL JURISDICTION"
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Textarea id="notes" {...register("notes")} placeholder="Payment terms, delivery timeline..." className="min-h-16 text-xs" />
              </div>
            </div>

            <div className="flex flex-col gap-2 justify-end text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono font-semibold">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {/* Single Simple GST Tax Selector */}
              <div className="flex items-center justify-between gap-2 border-t border-b py-2.5 my-1">
                <Label className="text-xs font-semibold text-foreground">Select GST Tax Rate:</Label>
                <Select value={taxPresetKey} onValueChange={handleSelectTaxPreset}>
                  <SelectTrigger className="h-8 text-xs w-60 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="igst_18">🌐 IGST 18% (Most Cases)</SelectItem>
                    <SelectItem value="cgst_sgst_18">🏢 CGST 9% + SGST 9% (Intra-State)</SelectItem>
                    <SelectItem value="igst_5">🌐 IGST 5%</SelectItem>
                    <SelectItem value="cgst_sgst_5">🏢 CGST 2.5% + SGST 2.5%</SelectItem>
                    <SelectItem value="igst_12">🌐 IGST 12%</SelectItem>
                    <SelectItem value="cgst_sgst_12">🏢 CGST 6% + SGST 6%</SelectItem>
                    <SelectItem value="igst_28">🌐 IGST 28%</SelectItem>
                    <SelectItem value="cgst_sgst_28">🏢 CGST 14% + SGST 14%</SelectItem>
                    <SelectItem value="none">❌ No Tax (0%)</SelectItem>
                    <SelectItem value="custom">✏️ Custom Tax (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center gap-2">
                <Label htmlFor="tax_amount" className="text-xs text-muted-foreground">Tax Total (₹):</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("tax_amount", { valueAsNumber: true })}
                  className="h-8 w-28 text-xs text-right font-mono"
                />
              </div>
              <div className="flex justify-between items-center gap-2">
                <Label htmlFor="discount_amount" className="text-xs text-muted-foreground">Discount / Freight (₹):</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("discount_amount", { valueAsNumber: true })}
                  className="h-8 w-28 text-xs text-right font-mono"
                />
              </div>
              <div className="flex justify-between py-2 border-t border-border/60 text-sm font-bold pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              {quotationToEdit ? "Update Quotation" : "Save Quotation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
