"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, KeyRound, Ban, CheckCircle2, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { TeamFormDialog } from "@/components/team/team-form-dialog";
import { TeamPermissionsDialog } from "@/components/team/team-permissions-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import type { Admin } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function parsePermissionList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function TeamClient({ initialTeam }: { initialTeam: Admin[] }) {
  const router = useRouter();
  const [team, setTeam] = React.useState(initialTeam);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Admin | null>(null);
  const [resetting, setResetting] = React.useState<Admin | null>(null);
  const [editingPermissions, setEditingPermissions] = React.useState<Admin | null>(null);

  async function refresh() {
    const res = await fetch("/api/team");
    if (res.ok) setTeam(await res.json());
    router.refresh();
  }

  async function toggleStatus(member: Admin) {
    const res = await fetch(`/api/team/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: member.status === "active" ? "inactive" : "active" }),
    });
    if (!res.ok) {
      toast.error("Could not update.");
      return;
    }
    toast.success(member.status === "active" ? "Member deactivated." : "Member activated.");
    refresh();
  }

  async function handleDelete(member: Admin) {
    const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove.");
      return;
    }
    toast.success(`${member.name} removed.`);
    refresh();
  }

  async function handleResetPassword(password: string) {
    if (!resetting) return;
    const res = await fetch(`/api/team/${resetting.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error("Could not reset password.");
    toast.success("Password reset.");
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Create login accounts for your sales/support team members.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> Add member
        </Button>
      </div>

      {team.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No team members yet. Add one above.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Permissions</TableHead>
                <TableHead className="hidden md:table-cell">Customers</TableHead>
                <TableHead className="hidden md:table-cell">Appointments</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[11px]">{initials(m.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground sm:hidden">{m.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "success" : "secondary"} className="capitalize">
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {parsePermissionList(m.permissions).length === 0 ? (
                        <span className="text-xs text-muted-foreground">No access</span>
                      ) : (
                        parsePermissionList(m.permissions).map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] capitalize">
                            {p}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{m.customer_count ?? 0}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{m.appointment_count ?? 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingPermissions(m)}>
                          <ShieldCheck className="size-4" /> Edit permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetting(m)}>
                          <KeyRound className="size-4" /> Reset password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(m)}>
                          {m.status === "active" ? (
                            <>
                              <Ban className="size-4" /> Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4" /> Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(m)}>
                          <Trash2 className="size-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <TeamFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />

      <TeamPermissionsDialog
        open={!!editingPermissions}
        onOpenChange={(open) => !open && setEditingPermissions(null)}
        member={editingPermissions}
        onSaved={refresh}
      />

      {resetting && (
        <ResetPasswordDialog
          open={!!resetting}
          onOpenChange={(open) => !open && setResetting(null)}
          name={resetting.name}
          onConfirm={handleResetPassword}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Remove ${deleting.name}?`}
          description="Their login access will be revoked. Customers/appointments they created will remain on record."
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  );
}
