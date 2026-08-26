"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import type { Appointment, Customer, Product } from "@/lib/types";

const formSchema = z.object({
  title: z.string().optional().or(z.literal("")),
  customer_id: z.string().min(1, "Select a customer"),
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().optional().or(z.literal("")),
  status: z.enum(["pending", "completed", "cancelled"]),
  remarks: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

function emptyValues(defaultCustomerId?: string): FormValues {
  return {
    title: "",
    customer_id: defaultCustomerId ?? "",
    appointment_date: new Date().toISOString().slice(0, 10),
    appointment_time: "",
    status: "pending",
    remarks: "",
  };
}

const CUSTOM_TITLE = "__custom__";

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  customers,
  defaultCustomerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  customers: Customer[];
  defaultCustomerId?: string;
  onSaved: () => void;
}) {
  const isEdit = !!appointment;

  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);

  // Separate state for the title/product SearchableSelect
  const [selectedTitleValue, setSelectedTitleValue] = React.useState<string | null>(null);
  const [isCustomTitle, setIsCustomTitle] = React.useState(false);
  const [customTitleText, setCustomTitleText] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(defaultCustomerId),
  });

  // Fetch products when dialog opens
  React.useEffect(() => {
    if (open) {
      setLoadingProducts(true);
      fetch("/api/products?limit=500")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((res) => {
          setProducts(res.data || []);
        })
        .catch(() => setProducts([]))
        .finally(() => setLoadingProducts(false));
    }
  }, [open]);

  // Resolve selected title state when products are ready or form resets
  React.useEffect(() => {
    if (!open) return;

    const existingTitle = appointment?.title ?? "";

    if (existingTitle) {
      const matchedProd = products.find(
        (p) => p.name.toLowerCase() === existingTitle.toLowerCase()
      );
      if (matchedProd) {
        setSelectedTitleValue(matchedProd.name);
        setIsCustomTitle(false);
        setCustomTitleText("");
      } else {
        setSelectedTitleValue(CUSTOM_TITLE);
        setIsCustomTitle(true);
        setCustomTitleText(existingTitle);
      }
    } else {
      setSelectedTitleValue(null);
      setIsCustomTitle(false);
      setCustomTitleText("");
    }
  }, [open, appointment, products]);

  React.useEffect(() => {
    if (open) {
      reset(
        appointment
          ? {
              title: appointment.title ?? "",
              customer_id: String(appointment.customer_id),
              appointment_date: appointment.appointment_date,
              appointment_time: appointment.appointment_time ?? "",
              status: appointment.status,
              remarks: appointment.remarks ?? "",
            }
          : emptyValues(defaultCustomerId)
      );
      if (!appointment) {
        setSelectedTitleValue(null);
        setIsCustomTitle(false);
        setCustomTitleText("");
      }
    }
  }, [open, appointment, defaultCustomerId, reset]);

  function handleTitleSelect(val: string | null) {
    if (!val) {
      setSelectedTitleValue(null);
      setIsCustomTitle(false);
      setValue("title", "");
      return;
    }
    if (val === CUSTOM_TITLE) {
      setSelectedTitleValue(CUSTOM_TITLE);
      setIsCustomTitle(true);
      setValue("title", customTitleText);
    } else {
      setSelectedTitleValue(val);
      setIsCustomTitle(false);
      setValue("title", val);
    }
  }

  function handleCustomTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setCustomTitleText(text);
    if (isCustomTitle) setValue("title", text);
  }

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(
        isEdit ? `/api/appointments/${appointment!.id}` : "/api/appointments",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, customer_id: Number(values.customer_id) }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      toast.success(isEdit ? "Appointment updated." : "New appointment added.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // Customer options for SearchableSelect
  const customerOptions: SearchableOption[] = customers.map((c) => ({
    value: String(c.id),
    label: c.name,
    sublabel: [c.phone, c.product].filter(Boolean).join(" · "),
  }));

  // Title/Product options for SearchableSelect
  const titleOptions: SearchableOption[] = [
    { value: CUSTOM_TITLE, label: "-- Custom Title / Manual Entry --" },
    ...products.map((p) => ({
      value: p.name,
      label: `${p.name} (${p.stock ?? 0})`,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Appointment" : "Add New Appointment"}</DialogTitle>
          <DialogDescription>Select a customer and fill in the appointment details.</DialogDescription>
        </DialogHeader>

        {customers.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
            Add a customer from the Customers page first, then create the appointment.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Customer — Searchable */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Customer *</Label>
                <SearchableSelect
                  options={customerOptions}
                  value={watch("customer_id") || null}
                  onValueChange={(v) => {
                    setValue("customer_id", v ?? "");
                    if (v) {
                      const selectedCust = customers.find((c) => String(c.id) === v);
                      if (selectedCust?.product && (!watch("title") || !isEdit)) {
                        // Auto-fill title from customer product
                        const matchedProd = products.find(
                          (p) => p.name.toLowerCase() === (selectedCust.product ?? "").toLowerCase()
                        );
                        if (matchedProd) {
                          setSelectedTitleValue(matchedProd.name);
                          setIsCustomTitle(false);
                          setValue("title", matchedProd.name);
                        } else if (selectedCust.product) {
                          setSelectedTitleValue(CUSTOM_TITLE);
                          setIsCustomTitle(true);
                          setCustomTitleText(selectedCust.product);
                          setValue("title", selectedCust.product);
                        }
                      }
                    }
                  }}
                  placeholder="Search & select customer..."
                  searchPlaceholder="Search by name, phone, product..."
                  emptyLabel="No customer found."
                  triggerClassName="h-9 text-xs"
                />
                {errors.customer_id && (
                  <p className="text-xs text-destructive">{errors.customer_id.message}</p>
                )}
              </div>

              {/* Title / Product — Searchable */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Title / Product</Label>
                <SearchableSelect
                  options={titleOptions}
                  value={selectedTitleValue}
                  onValueChange={handleTitleSelect}
                  placeholder={loadingProducts ? "Loading products..." : "Search & select product..."}
                  searchPlaceholder="Search catalog product..."
                  emptyLabel="No product found."
                  disabled={loadingProducts}
                  triggerClassName="h-9 text-xs"
                />
                {isCustomTitle && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    <Input
                      value={customTitleText}
                      onChange={handleCustomTitleChange}
                      placeholder="Enter custom title..."
                      className="h-9 text-xs"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Custom title will be saved for this appointment.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appointment_date">Date *</Label>
                <DatePicker
                  value={watch("appointment_date")}
                  onChange={(val) => setValue("appointment_date", val, { shouldValidate: true })}
                />
                {errors.appointment_date && (
                  <p className="text-xs text-destructive">{errors.appointment_date.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appointment_time">Time</Label>
                <Input id="appointment_time" type="time" {...register("appointment_time")} />
              </div>

              {isEdit && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Status</Label>
                  <Select
                    value={watch("status")}
                    onValueChange={(v) => setValue("status", v as FormValues["status"])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" {...register("remarks")} placeholder="Koi remarks..." />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save changes" : "Add appointment"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
