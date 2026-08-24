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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import type { Customer, Product } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  product: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  status: z.enum(["lead", "progress", "active", "completed", "order_soon"]),
  visited: z.boolean(),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  created_by: z.number().int().positive().optional().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = {
  name: "",
  product: "",
  email: "",
  phone: "",
  status: "lead",
  visited: false,
  address: "",
  notes: "",
  created_by: null,
};

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved: () => void;
}) {
  const isEdit = !!customer;

  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [selectedProductValue, setSelectedProductValue] = React.useState<string | null>(null);
  const [isCustomProduct, setIsCustomProduct] = React.useState(false);
  const [customProductText, setCustomProductText] = React.useState("");

  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [loadingTeam, setLoadingTeam] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues,
  });

  React.useEffect(() => {
    if (open) {
      setLoadingProducts(true);
      setLoadingTeam(true);

      // Fetch products and team members concurrently
      Promise.all([
        fetch("/api/products?limit=500").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/team/members").then((r) => (r.ok ? r.json() : { data: [], current_user_id: null })),
      ])
        .then(([prodRes, teamRes]) => {
          const prodList: Product[] = prodRes.data || [];
          setProducts(prodList);

          const members: TeamMember[] = teamRes.data || [];
          const curUserId: number | null = teamRes.current_user_id ?? null;
          setTeamMembers(members);
          setCurrentUserId(curUserId);

          const existingProd = customer?.product ?? "";
          if (existingProd) {
            const matched = prodList.find((p) => p.name.toLowerCase() === existingProd.toLowerCase());
            if (matched) {
              setSelectedProductValue(matched.name);
              setIsCustomProduct(false);
              setCustomProductText("");
            } else {
              setSelectedProductValue("__custom__");
              setIsCustomProduct(true);
              setCustomProductText(existingProd);
            }
          } else {
            setSelectedProductValue(null);
            setIsCustomProduct(false);
            setCustomProductText("");
          }

          // Initial created_by: existing customer's created_by, or current logged-in user
          const initialCreatedBy = customer?.created_by ?? curUserId ?? (members[0]?.id || null);

          reset({
            name: customer?.name ?? "",
            product: customer?.product ?? "",
            email: customer?.email ?? "",
            phone: customer?.phone ?? "",
            status: customer?.status ?? "lead",
            visited: !!customer?.visited,
            address: customer?.address ?? "",
            notes: customer?.notes ?? "",
            created_by: initialCreatedBy,
          });
        })
        .catch(() => {
          setProducts([]);
          setTeamMembers([]);
        })
        .finally(() => {
          setLoadingProducts(false);
          setLoadingTeam(false);
        });
    }
  }, [open, customer, reset]);

  function handleProductSelect(val: string | null) {
    if (!val) {
      setSelectedProductValue(null);
      setIsCustomProduct(false);
      setValue("product", "");
      return;
    }

    if (val === "__custom__") {
      setSelectedProductValue("__custom__");
      setIsCustomProduct(true);
      setValue("product", customProductText);
    } else {
      setSelectedProductValue(val);
      setIsCustomProduct(false);
      setValue("product", val);
    }
  }

  function handleCustomTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setCustomProductText(text);
    if (isCustomProduct) {
      setValue("product", text);
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch(
        isEdit ? `/api/customers/${customer!.id}` : "/api/customers",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Save failed");

      toast.success(isEdit ? "Customer updated." : "New customer added.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // Options for SearchableSelect
  const productOptions: SearchableOption[] = [
    {
      value: "__custom__",
      label: "-- Custom Product / Manual Entry --",
    },
    ...products.map((p) => ({
      value: p.name,
      label: `${p.name} (${p.stock ?? 0})`,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            Fill in the customer&apos;s details. Name is required, everything else is optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Ayesha Khan" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="product">Product / Interest</Label>
              <SearchableSelect
                options={productOptions}
                value={selectedProductValue}
                onValueChange={handleProductSelect}
                placeholder={loadingProducts ? "Loading catalog products..." : "Search & select product..."}
                searchPlaceholder="Search catalog product..."
                emptyLabel="No product found."
                disabled={loadingProducts}
                triggerClassName="h-9 text-xs"
              />
              {isCustomProduct && (
                <div className="mt-1.5 flex flex-col gap-1">
                  <Input
                    value={customProductText}
                    onChange={handleCustomTextChange}
                    placeholder="Enter custom product name..."
                    className="h-9 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    This custom product will be saved for this customer.
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="name@company.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+91 90000 00000" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as FormValues["status"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="order_soon">Order Soon</SelectItem>
                  <SelectItem value="completed">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border px-3">
              <Label htmlFor="visited" className="cursor-pointer">Site visited?</Label>
              <Switch id="visited" checked={watch("visited")} onCheckedChange={(v) => setValue("visited", v)} />
            </div>

            {/* Added By Field */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="created_by">Added By</Label>
              <Select
                value={watch("created_by") ? String(watch("created_by")) : ""}
                onValueChange={(v) => setValue("created_by", v ? parseInt(v, 10) : null)}
                disabled={loadingTeam}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingTeam ? "Loading team members..." : "Select team member..."} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} ({m.role === "admin" ? "Admin" : "Team Member"}){m.id === currentUserId ? " — (You)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} placeholder="City, State" />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} placeholder="Koi additional note..." />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
