"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PERMISSION_MODULES, type PermissionModule } from "@/lib/types";

const MODULE_LABELS: Record<PermissionModule, string> = {
  customers: "Customers",
  appointments: "Appointments",
  quotations: "Quotations",
  products: "Products & Stock",
  analytics: "Analytics",
};

const MODULE_DESCRIPTIONS: Record<PermissionModule, string> = {
  customers: "Add, edit, and delete customers",
  appointments: "Schedule and manage appointments",
  quotations: "Send and update quotations",
  products: "Manage the product catalog and stock",
  analytics: "Log and view social media performance",
};

export function PermissionsFields({
  value,
  onChange,
}: {
  value: PermissionModule[];
  onChange: (next: PermissionModule[]) => void;
}) {
  function toggle(module: PermissionModule, checked: boolean) {
    if (checked) onChange([...value, module]);
    else onChange(value.filter((m) => m !== module));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Access permissions</Label>
      <p className="text-xs text-muted-foreground">
        Choose exactly which parts of the dashboard this team member can use. This is
        isolated per member — changing it here does not affect anyone else.
      </p>
      <div className="mt-1 flex flex-col gap-2 rounded-md border p-3">
        {PERMISSION_MODULES.map((module) => (
          <label key={module} className="flex cursor-pointer items-start gap-2.5">
            <Checkbox
              className="mt-0.5"
              checked={value.includes(module)}
              onCheckedChange={(checked) => toggle(module, checked === true)}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{MODULE_LABELS[module]}</span>
              <span className="text-xs text-muted-foreground">{MODULE_DESCRIPTIONS[module]}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
