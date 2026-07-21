"use client";

import * as React from "react";
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
import { PermissionsFields } from "@/components/team/permissions-fields";
import type { PermissionModule } from "@/lib/types";
import type { Admin } from "@/lib/types";

function parsePermissions(raw: string | null): PermissionModule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function TeamPermissionsDialog({
  open,
  onOpenChange,
  member,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Admin | null;
  onSaved: () => void;
}) {
  const [permissions, setPermissions] = React.useState<PermissionModule[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the member's current permissions whenever the dialog opens for them
    if (open && member) setPermissions(parsePermissions(member.permissions));
  }, [open, member]);

  async function handleSave() {
    if (!member) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error("Could not update permissions.");
      toast.success(`Permissions updated for ${member.name}.`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit permissions{member ? ` — ${member.name}` : ""}</DialogTitle>
          <DialogDescription>
            Only this team member is affected — everyone else keeps their own access as-is.
          </DialogDescription>
        </DialogHeader>

        <PermissionsFields value={permissions} onChange={setPermissions} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
