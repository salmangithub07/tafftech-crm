"use client";

import * as React from "react";
import { ShieldAlert, LogOut, PhoneCall, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantRenewDialog } from "@/components/tenant-renew-dialog";

export function SubscriptionLockedScreen({
  planType,
  expiryDate,
  adminName,
  companyPhone,
}: {
  planType?: string | null;
  expiryDate?: string | null;
  adminName?: string | null;
  companyPhone?: string | null;
}) {
  const [renewDialogOpen, setRenewDialogOpen] = React.useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center text-center space-y-6 rounded-2xl border border-border/80 bg-card p-8 shadow-2xl">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Subscription Expired & Locked
            </h2>
            <p className="text-sm text-muted-foreground">
              Your CRM access for <strong className="text-foreground">{adminName || "your account"}</strong> has been locked because your plan ({planType || "Plan"}) expired on{" "}
              <span className="font-semibold text-destructive">{expiryDate || "date"}</span> and the 3-day grace period has ended.
            </p>
          </div>

          <Button
            className="w-full gap-2 bg-primary text-primary-foreground hover:opacity-90 font-medium py-5 text-sm"
            onClick={() => setRenewDialogOpen(true)}
          >
            <Sparkles className="size-4" /> Request Plan Renewal / Contact Admin
          </Button>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
              <LogOut className="size-4" />
              Log Out
            </Button>
          </div>
        </div>
      </div>

      <TenantRenewDialog
        open={renewDialogOpen}
        onOpenChange={setRenewDialogOpen}
        planType={planType}
        expiryDate={expiryDate}
        companyPhone={companyPhone}
      />
    </>
  );
}

