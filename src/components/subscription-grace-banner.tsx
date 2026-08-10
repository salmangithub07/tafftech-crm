"use client";

import * as React from "react";
import { AlertTriangle, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantRenewDialog } from "@/components/tenant-renew-dialog";

export function SubscriptionGraceBanner({
  expiryDate,
  daysRemaining,
  graceDaysLeft,
  planType,
  companyPhone,
  yearlyPrice,
  threeYearPrice,
  bankUpiId,
  paymentQrCode,
}: {
  expiryDate?: string | null;
  daysRemaining: number | null;
  graceDaysLeft: number;
  planType?: string | null;
  companyPhone?: string | null;
  yearlyPrice?: string | null;
  threeYearPrice?: string | null;
  bankUpiId?: string | null;
  paymentQrCode?: string | null;
}) {
  const [dismissed, setDismissed] = React.useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = React.useState(false);

  if (dismissed) return null;

  let message = "";
  let badgeText = "";
  let isUrgent = false;

  if (daysRemaining !== null && daysRemaining === 0) {
    message = `Your plan expires TODAY (${expiryDate})! Please renew your subscription to prevent automatic locking.`;
    badgeText = "Expires Today";
    isUrgent = true;
  } else if (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 3) {
    message = `Your plan expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} (${expiryDate}). Please renew soon.`;
    badgeText = `${daysRemaining}d Left`;
  } else {
    message = `Subscription Expired on ${expiryDate}. You are in a 3-day grace period (${graceDaysLeft} day${graceDaysLeft === 1 ? "" : "s"} left). Please renew to avoid locked access.`;
    badgeText = `Grace Period (${graceDaysLeft}d)`;
    isUrgent = true;
  }

  return (
    <>
      <div
        className={`px-4 py-2.5 text-xs border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-colors ${
          isUrgent
            ? "bg-amber-500/20 border-amber-500/40 text-amber-900 dark:text-amber-200"
            : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
          <span>
            <strong className="font-semibold text-amber-600 dark:text-amber-400 mr-1 font-mono">[{badgeText}]</strong>
            {message}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            className="h-7 text-xs px-3 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 gap-1.5 shadow-sm"
            onClick={() => setRenewDialogOpen(true)}
          >
            <Sparkles className="size-3" /> Renew Plan
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 transition-colors"
            title="Dismiss warning"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <TenantRenewDialog
        open={renewDialogOpen}
        onOpenChange={setRenewDialogOpen}
        planType={planType}
        expiryDate={expiryDate}
        companyPhone={companyPhone}
        yearlyPrice={yearlyPrice}
        threeYearPrice={threeYearPrice}
        bankUpiId={bankUpiId}
        paymentQrCode={paymentQrCode}
      />
    </>
  );
}
