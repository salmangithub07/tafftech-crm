"use client";

import * as React from "react";
import { LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImpersonationBanner({
  tenantName,
  tenantEmail,
  superAdminName,
}: {
  tenantName: string;
  tenantEmail: string;
  superAdminName?: string;
}) {
  const [exiting, setExiting] = React.useState(false);

  async function handleExit() {
    setExiting(true);
    try {
      const res = await fetch("/api/auth/exit-impersonation", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to exit support mode");

      toast.success("Exited Support Mode. Returned to Super Admin dashboard.");
      window.location.href = data.redirectUrl || "/admins";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to exit support mode.");
      setExiting(false);
    }
  }

  return (
    <div className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-amber-300 shrink-0" />
        <span>
          <strong>Support Mode Active:</strong> You ({superAdminName || "Super Admin"}) are logged in as{" "}
          <span className="font-bold underline decoration-white/40">{tenantName}</span> ({tenantEmail}).
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleExit}
        disabled={exiting}
        className="h-7 text-xs bg-white text-purple-900 hover:bg-purple-50 font-bold gap-1.5 shadow-sm shrink-0"
      >
        {exiting ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
        Exit Support Mode &amp; Return
      </Button>
    </div>
  );
}
