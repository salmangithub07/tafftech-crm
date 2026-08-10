"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, KeyRound, Ban, CheckCircle2, Trash2, Users, CalendarClock, UserCog, ShieldCheck } from "lucide-react";
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
import { AdminFormDialog } from "@/components/admins/admin-form-dialog";
import { SubscriptionDialog } from "@/components/admins/subscription-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import type { Admin } from "@/lib/types";
import { getSubscriptionInfo } from "@/lib/subscription";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AdminsClient({ initialAdmins }: { initialAdmins: Admin[] }) {
  const router = useRouter();
  const [admins, setAdmins] = React.useState(initialAdmins);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Admin | null>(null);
  const [resetting, setResetting] = React.useState<Admin | null>(null);
  const [subscriptionAdmin, setSubscriptionAdmin] = React.useState<Admin | null>(null);

  async function refresh() {
    const res = await fetch("/api/admins");
    if (res.ok) setAdmins(await res.json());
    router.refresh();
  }

  async function toggleStatus(admin: Admin) {
    const res = await fetch(`/api/admins/${admin.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: admin.status === "active" ? "inactive" : "active" }),
    });
    if (!res.ok) {
      toast.error("Could not update.");
      return;
    }
    toast.success(admin.status === "active" ? "Admin deactivated." : "Admin activated.");
    refresh();
  }

  async function handleDelete(admin: Admin) {
    const res = await fetch(`/api/admins/${admin.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove.");
      return;
    }
    toast.success(`${admin.name} and their entire tenant have been removed.`);
    refresh();
  }

  async function handleResetPassword(password: string) {
    if (!resetting) return;
    const res = await fetch(`/api/admins/${resetting.id}`, {
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
          <h1 className="text-2xl font-semibold tracking-tight">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Each Admin is a separate tenant — their customers, appointments, and team
            (executives) bilkul isolated rehte hain.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> Add admin
        </Button>
      </div>

      {admins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No Admins yet. Add the first one above.
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
                <TableHead>Plan & Expiry</TableHead>
                <TableHead className="hidden md:table-cell">
                  <Users className="inline size-3.5" /> Customers
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <CalendarClock className="inline size-3.5" /> Appointments
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <UserCog className="inline size-3.5" /> Team
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const subInfo = getSubscriptionInfo(admin);
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[11px]">{initials(admin.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{admin.name}</span>
                          <span className="text-xs text-muted-foreground sm:hidden">{admin.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant={admin.status === "active" ? "success" : "secondary"} className="capitalize">
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant={
                              subInfo.status === "locked"
                                ? "destructive"
                                : subInfo.status === "grace" || (subInfo.daysRemaining !== null && subInfo.daysRemaining <= 3)
                                ? "warning"
                                : "outline"
                            }
                            className="capitalize text-[11px] h-5 px-1.5"
                          >
                            {subInfo.planType}
                          </Badge>
                          {subInfo.status === "grace" && (
                            <span className="text-[10px] text-amber-500 font-semibold">Grace ({subInfo.graceDaysRemaining}d)</span>
                          )}
                          {subInfo.status === "active" && subInfo.daysRemaining !== null && subInfo.daysRemaining === 0 && (
                            <span className="text-[10px] text-amber-500 font-semibold">Expires Today</span>
                          )}
                          {subInfo.status === "active" && subInfo.daysRemaining !== null && subInfo.daysRemaining > 0 && subInfo.daysRemaining <= 3 && (
                            <span className="text-[10px] text-amber-500 font-semibold">{subInfo.daysRemaining}d left</span>
                          )}
                          {subInfo.status === "locked" && (
                            <span className="text-[10px] text-destructive font-semibold">Locked</span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {subInfo.formattedExpiry === "Never" ? "Unlimited" : `Exp: ${subInfo.formattedExpiry}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {admin.customer_count ?? 0}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {admin.appointment_count ?? 0}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {admin.executive_count ?? 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSubscriptionAdmin(admin)}>
                            <ShieldCheck className="size-4 text-primary" /> Manage Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetting(admin)}>
                            <KeyRound className="size-4" /> Reset password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(admin)}>
                            {admin.status === "active" ? (
                              <>
                                <Ban className="size-4" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-4" /> Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(admin)}>
                            <Trash2 className="size-4" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <AdminFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />

      <SubscriptionDialog
        open={!!subscriptionAdmin}
        onOpenChange={(open) => !open && setSubscriptionAdmin(null)}
        admin={subscriptionAdmin}
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
          description="Their entire tenant — customers, appointments, quotations, products, team — will be permanently deleted. This action cannot be undone."
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  );
}

