"use client";

import * as React from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ReminderItem = {
  appointment_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  title: string | null;
  appointment_date: string;
  appointment_time: string | null;
  message: string;
  whatsapp_url: string;
};

export function TodayRemindersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [sendingApi, setSendingApi] = React.useState(false);
  const [data, setData] = React.useState<{
    count: number;
    apiSentCount: number;
    provider: string;
    reminders: ReminderItem[];
  } | null>(null);

  const fetchReminders = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments/send-reminders", { method: "POST" });
      if (!res.ok) throw new Error("Could not fetch reminders");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load today's reminders.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchReminders();
    }
  }, [open, fetchReminders]);

  async function handleSendAllApi() {
    if (!data || data.reminders.length === 0) return;
    setSendingApi(true);
    try {
      const res = await fetch("/api/appointments/send-reminders", { method: "POST" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      toast.success(
        `Batch WhatsApp Reminders sent! ${json.apiSentCount || json.count} messages dispatched.`
      );
      onOpenChange(false);
    } catch {
      toast.error("Could not send automated batch WhatsApp reminders.");
    } finally {
      setSendingApi(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="size-5" /> Today's WhatsApp Reminders
            </div>
            {data && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-mono text-xs">
                {data.count} Appointments Today
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-emerald-600" />
            Generating personalized WhatsApp reminders for today's visits...
          </div>
        ) : data.reminders.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="size-8 text-emerald-500" />
            No pending appointments scheduled for today!
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            {/* API Bulk Action Banner */}
            {data.provider !== "none" ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Automated Background Gateway Active ({data.provider.toUpperCase()})
                  </p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                    1-Click button will dispatch automatic WhatsApp messages to all {data.count} customers instantly.
                  </p>
                </div>
                <Button
                  onClick={handleSendAllApi}
                  disabled={sendingApi}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5"
                >
                  {sendingApi ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send All ({data.count})
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" /> 1-Click WhatsApp Web Direct Send
                </p>
                <p className="text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  Click &quot;Send WhatsApp&quot; next to each customer below to open pre-filled WhatsApp Web chat. Configure background WhatsApp API in <span className="font-semibold">Settings</span> for 100% automated background sending!
                </p>
              </div>
            )}

            {/* List of Today's Customers */}
            <div className="flex flex-col gap-3">
              {data.reminders.map((r) => (
                <div
                  key={r.appointment_id}
                  className="rounded-lg border p-3.5 bg-card flex flex-col gap-2.5 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-emerald-600" /> {r.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {r.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" /> {r.customer_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono text-emerald-700 dark:text-emerald-300">
                          <Clock className="size-3" /> {r.appointment_time ? r.appointment_time.slice(0, 5) : "Today"}
                        </span>
                      </p>
                    </div>

                    {r.whatsapp_url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 gap-1 shrink-0"
                        asChild
                      >
                        <a href={r.whatsapp_url} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="size-3.5" /> Send WhatsApp
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        No Phone
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded border border-border/40 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                    {r.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
