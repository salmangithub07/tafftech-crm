"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  FileText,
  User,
  Truck,
  Calculator,
  Receipt,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Customer, Product, Quotation } from "@/lib/types";

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

export function QuotationForm({ quotationId }: { quotationId?: string | number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams?.get("customer_id");
  const prefillAppointmentId = searchParams?.get("appointment_id");

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [editingQuotation, setEditingQuotation] = React.useState<Quotation | null>(null);

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
      appointment_id: prefillAppointmentId ? Number(prefillAppointmentId) : null,
      customer_id: prefillCustomerId ? Number(prefillCustomerId) : null,
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

  const prevSubtotalRef = React.useRef<number>(subtotal);
  const prevPresetRef = React.useRef<string>(taxPresetKey);

  React.useEffect(() => {
    if (prevSubtotalRef.current !== subtotal || prevPresetRef.current !== taxPresetKey) {
      prevSubtotalRef.current = subtotal;
      prevPresetRef.current = taxPresetKey;
      if (taxPresetKey !== "none") {
        const parts = taxPresetKey.split("_");
        const rate = Number(parts[parts.length - 1]);
        const calculated = Math.round((subtotal * rate) / 100);
        setValue("tax_amount", calculated);
      }
    }
  }, [subtotal, taxPresetKey, setValue]);

  const grandTotal = Math.max(0, subtotal + Number(watchedTaxAmount) - Number(watchedDiscountAmount));

  // Load initial data (customers, products, and quotation if editing)
  React.useEffect(() => {
    setLoadingOptions(true);
    const promises: Promise<any>[] = [
      fetch("/api/customers?limit=500").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/products?limit=500").then((r) => (r.ok ? r.json() : { data: [] })),
    ];

    if (quotationId) {
      promises.push(fetch(`/api/quotations/${quotationId}`).then((r) => (r.ok ? r.json() : null)));
    }

    Promise.all(promises)
      .then(([custRes, prodRes, qData]) => {
        const custData: Customer[] = custRes.data || [];
        const prodData: Product[] = prodRes.data || [];
        setCustomers(custData);
        setProducts(prodData);

        if (qData) {
          setEditingQuotation(qData);
          const formattedItems =
            Array.isArray(qData.items) && qData.items.length > 0
              ? qData.items.map((item: any) => ({
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
            appointment_id: qData.appointment_id ?? null,
            customer_id: qData.customer_id ?? null,
            customer_name: qData.customer_name ?? "",
            customer_phone: qData.customer_phone ?? "",
            customer_address: qData.customer_address ?? "",
            customer_gst_number: qData.customer_gst_number ?? "",
            tax_type: qData.tax_type ?? "igst",
            tax_percent: Number(qData.tax_percent) || 18,
            quotation_date: qData.quotation_date
              ? String(qData.quotation_date).slice(0, 10)
              : new Date().toISOString().slice(0, 10),
            items: formattedItems,
            tax_amount: Number(qData.tax_amount) || 0,
            discount_amount: Number(qData.discount_amount) || 0,
            notes: qData.notes ?? "",
            book_to: qData.book_to ?? "",
            transport: qData.transport ?? "",
            gr_no: qData.gr_no ?? "",
            vehicle_no: qData.vehicle_no ?? "",
            dispute_note: qData.dispute_note ?? "",
          });
          setTaxPresetKey(deriveTaxPresetKey(qData.tax_type, qData.tax_percent));
        } else if (prefillCustomerId) {
          const targetCust = custData.find((c) => c.id === Number(prefillCustomerId));
          if (targetCust) {
            setValue("customer_id", targetCust.id);
            setValue("customer_name", targetCust.name);
            setValue("customer_phone", targetCust.phone || "");
            setValue("customer_address", targetCust.address || "");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load options:", err);
      })
      .finally(() => setLoadingOptions(false));
  }, [quotationId, prefillCustomerId, reset, setValue]);

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
    if (!val) {
      setValue(`items.${index}.product_id`, null);
      setValue(`items.${index}.product_name`, "");
      setValue(`items.${index}.hsn_code`, "");
      setValue(`items.${index}.unit_price`, 0);
      return;
    }
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
      const isEditing = !!quotationId;
      const url = isEditing ? `/api/quotations/${quotationId}` : "/api/quotations";
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save quotation");
      }

      const savedData = await res.json();
      toast.success(isEditing ? "Quotation updated successfully!" : "Quotation created successfully!");
      
      const targetId = savedData.id || quotationId;
      if (targetId) {
        router.push(`/quotations/${targetId}`);
      } else {
        router.push("/quotations");
      }
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save quotation.");
    }
  }

  const isEditing = !!quotationId;

  if (loadingOptions) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {isEditing ? "Loading quotation details..." : "Preparing quotation form..."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-1.5 h-9">
            <Link href={isEditing ? `/quotations/${quotationId}` : "/quotations"}>
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isEditing ? `Edit Quotation ${editingQuotation?.quotation_number || ""}` : "Create New Quotation"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEditing ? "Modify items, pricing or customer details" : "Generate a proforma quotation for your client"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="h-9"
          >
            <Link href={isEditing ? `/quotations/${quotationId}` : "/quotations"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="gap-1.5 h-9 shadow-sm">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{isEditing ? "Update Quotation" : "Save Quotation"}</span>
          </Button>
        </div>
      </div>

      {/* Grid: Customer & Logistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" /> Customer Details
            </CardTitle>
            <CardDescription className="text-xs">Select an existing customer or enter details manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Existing Customer (Optional)</Label>
              <SearchableSelect
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: `${c.name}${c.phone ? ` (${c.phone})` : ""}`,
                }))}
                value={watchedCustomerId ? String(watchedCustomerId) : ""}
                onValueChange={handleSelectCustomer}
                placeholder="Search and select customer..."
                searchPlaceholder="Search customer by name or phone..."
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Customer Name *</Label>
                <Input
                  {...register("customer_name")}
                  placeholder="e.g. Acme Corp"
                  className="mt-1 h-9 text-xs"
                />
                {errors.customer_name && (
                  <p className="text-[11px] text-destructive mt-1">{errors.customer_name.message}</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input
                  {...register("customer_phone")}
                  placeholder="e.g. 9876543210"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">GSTIN / Tax ID</Label>
                <Input
                  {...register("customer_gst_number")}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="mt-1 h-9 text-xs uppercase"
                />
              </div>
              <div>
                <Label className="text-xs">Billing Address</Label>
                <Input
                  {...register("customer_address")}
                  placeholder="City, State, Pincode"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotation & Dispatch Metadata Card */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="size-4 text-primary" /> Quotation & Transport
            </CardTitle>
            <CardDescription className="text-xs">Date, destination and logistics details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quotation Date *</Label>
                <div className="mt-1">
                  <DatePicker
                    value={watch("quotation_date")}
                    onChange={(val) => setValue("quotation_date", val)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Book To / Destination</Label>
                <Input
                  {...register("book_to")}
                  placeholder="e.g. Mumbai, Maharashtra"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Transport / Courier</Label>
                <Input
                  {...register("transport")}
                  placeholder="e.g. VRL Logistics"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Vehicle No.</Label>
                <Input
                  {...register("vehicle_no")}
                  placeholder="e.g. MH 12 AB 1234"
                  className="mt-1 h-9 text-xs uppercase"
                />
              </div>
              <div>
                <Label className="text-xs">GR / LR No.</Label>
                <Input
                  {...register("gr_no")}
                  placeholder="e.g. GR-9081"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotation Items Table Card */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileCheck className="size-4 text-primary" /> Quotation Items
            </CardTitle>
            <CardDescription className="text-xs">Add products, quantities and rates</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                product_id: null,
                product_name: "",
                hsn_code: "",
                quantity: 1,
                unit_price: 0,
              })
            }
            className="gap-1 text-xs h-8"
          >
            <Plus className="size-3.5" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground border-y font-semibold">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4 min-w-[220px]">Product / Service</th>
                  <th className="py-2.5 px-3 w-32">HSN / SKU</th>
                  <th className="py-2.5 px-3 w-24 text-right">Qty</th>
                  <th className="py-2.5 px-3 w-32 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-4 w-32 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((field, index) => {
                  const qty = Number(watchedItems[index]?.quantity) || 0;
                  const price = Number(watchedItems[index]?.unit_price) || 0;
                  const lineTotal = qty * price;

                  return (
                    <tr key={field.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4 min-w-[260px]">
                        <div className="space-y-1.5">
                          {products.length > 0 && (
                            <SearchableSelect
                              options={products.map((p) => ({
                                value: String(p.id),
                                label: p.name,
                                sublabel: `₹${Number(p.price || 0).toLocaleString("en-IN")}${p.sku ? ` • SKU: ${p.sku}` : ""}`,
                              }))}
                              value={watchedItems[index]?.product_id ? String(watchedItems[index]?.product_id) : ""}
                              onValueChange={(val) => handleSelectProduct(index, val)}
                              placeholder="Pick from catalog..."
                              searchPlaceholder="Search catalog products..."
                              triggerClassName="h-8 text-xs bg-background"
                            />
                          )}
                          <Input
                            {...register(`items.${index}.product_name`)}
                            placeholder="Or enter custom item name / description"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          {...register(`items.${index}.hsn_code`)}
                          placeholder="HSN / SAC"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                        ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="size-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t bg-muted/10 flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  product_id: null,
                  product_name: "",
                  hsn_code: "",
                  quantity: 1,
                  unit_price: 0,
                })
              }
              className="gap-1 text-xs h-8"
            >
              <Plus className="size-3.5" /> Add Another Row
            </Button>
            <p className="text-xs text-muted-foreground">
              Total Items: <span className="font-semibold text-foreground">{fields.length}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid: Taxes, Discounts & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Taxes & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tax & Discount Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calculator className="size-4 text-primary" /> Tax & Discounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">GST / Tax Preset</Label>
                  <Select value={taxPresetKey} onValueChange={handleSelectTaxPreset}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="Select Tax Rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igst_18">18% IGST (Inter-State)</SelectItem>
                      <SelectItem value="cgst_sgst_18">18% CGST + SGST (9% + 9%)</SelectItem>
                      <SelectItem value="igst_12">12% IGST</SelectItem>
                      <SelectItem value="cgst_sgst_12">12% CGST + SGST (6% + 6%)</SelectItem>
                      <SelectItem value="igst_5">5% IGST</SelectItem>
                      <SelectItem value="cgst_sgst_5">5% CGST + SGST (2.5% + 2.5%)</SelectItem>
                      <SelectItem value="igst_28">28% IGST</SelectItem>
                      <SelectItem value="none">No Tax (0%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Tax Amount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("tax_amount", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Special Discount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("discount_amount", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="mt-1 h-9 text-xs font-mono max-w-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes & Remarks Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Notes & Special Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register("notes")}
                placeholder="Enter quotation terms, delivery timeframe, payment schedule or warranty notes..."
                rows={3}
                className="text-xs"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Grand Total Summary Card */}
        <div>
          <Card className="shadow-md border-primary/20 bg-card sticky top-20">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="size-4 text-primary" /> Amount Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal ({watchedItems.length} items)</span>
                <span className="font-mono font-medium text-foreground">
                  ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tax Amount</span>
                <span className="font-mono font-medium text-foreground">
                  ₹{Number(watchedTaxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {Number(watchedDiscountAmount) > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono font-medium">
                    - ₹{Number(watchedDiscountAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="border-t pt-3 flex justify-between items-baseline">
                <span className="font-bold text-sm">Grand Total</span>
                <span className="font-heading text-xl sm:text-2xl font-extrabold text-primary font-mono">
                  ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-full gap-2 shadow-sm font-semibold">
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  <span>{isEditing ? "Update Quotation" : "Save & Generate Quotation"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
