"use client";

import * as React from "react";
import { Megaphone, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export function BroadcastAnnouncementBanner({
  enabled,
  message,
  type = "info",
  targetPlan = "all",
  currentPlanType = "trial",
}: {
  enabled?: string | null;
  message?: string | null;
  type?: string | null;
  targetPlan?: string | null;
  currentPlanType?: string | null;
}) {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (message && typeof window !== "undefined") {
      const saved = window.localStorage.getItem("nova_crm_dismissed_announcement");
      if (saved === message) {
        setDismissed(true);
      }
    }
  }, [message]);

  if (enabled !== "1" || !message || !message.trim() || dismissed) {
    return null;
  }

  if (targetPlan && targetPlan !== "all" && currentPlanType && currentPlanType !== targetPlan) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined" && message) {
      window.localStorage.setItem("nova_crm_dismissed_announcement", message);
    }
  }

  const variantStyles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    info: {
      bg: "bg-blue-600 dark:bg-blue-700 text-white",
      border: "border-blue-700",
      text: "text-white",
      icon: <Megaphone className="size-4 shrink-0 text-amber-300 animate-bounce" />,
    },
    warning: {
      bg: "bg-amber-500 dark:bg-amber-600 text-amber-950 dark:text-amber-50",
      border: "border-amber-600",
      text: "text-amber-950 dark:text-amber-50",
      icon: <AlertTriangle className="size-4 shrink-0 text-amber-950 dark:text-amber-100" />,
    },
    danger: {
      bg: "bg-rose-600 dark:bg-rose-700 text-white",
      border: "border-rose-700",
      text: "text-white",
      icon: <AlertCircle className="size-4 shrink-0 text-white" />,
    },
    success: {
      bg: "bg-emerald-600 dark:bg-emerald-700 text-white",
      border: "border-emerald-700",
      text: "text-white",
      icon: <CheckCircle2 className="size-4 shrink-0 text-emerald-200" />,
    },
  };

  const currentVariant = variantStyles[type || "info"] || variantStyles.info;

  return (
    <div
      className={`w-full ${currentVariant.bg} px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-3 shadow-sm border-b ${currentVariant.border} z-40 transition-all`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {currentVariant.icon}
        <span className="truncate sm:whitespace-normal font-semibold">
          {message}
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded-md p-1 hover:bg-black/15 transition-colors shrink-0"
        title="Dismiss announcement"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
