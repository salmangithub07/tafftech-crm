"use client";

import * as React from "react";
import {
  Bell,
  UserPlus,
  Receipt,
  Calendar,
  FileText,
  Boxes,
  Users,
  CheckCheck,
  Activity,
  ArrowRightLeft,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActivityLogItem, ActivityEntityType } from "@/lib/types";

function formatActivityTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    
    // If today, show e.g. "05:34 pm"
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).toLowerCase();
    }

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase();
  } catch {
    return "";
  }
}

function getEntityIcon(type: ActivityEntityType) {
  switch (type) {
    case "customer":
      return <UserPlus className="size-4 text-blue-500" />;
    case "bill":
      return <Receipt className="size-4 text-emerald-500" />;
    case "appointment":
      return <Calendar className="size-4 text-purple-500" />;
    case "quotation":
      return <FileText className="size-4 text-amber-500" />;
    case "product":
    case "stock":
      return <Boxes className="size-4 text-cyan-500" />;
    case "team":
      return <Users className="size-4 text-indigo-500" />;
    default:
      return <Activity className="size-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [activities, setActivities] = React.useState<ActivityLogItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (res.ok) {
        const json = await res.json();
        setActivities(json.activities || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch {
      // silent catch for poll
    }
  }, []);

  // Poll notifications every 20 seconds
  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleMarkAllAsRead() {
    setLoading(true);
    try {
      const res = await fetch("/api/activity/read", { method: "POST" });
      if (res.ok) {
        setUnreadCount(0);
        setActivities((prev) => prev.map((item) => ({ ...item, is_unread: false })));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      // Mark as read when opened
      handleMarkAllAsRead();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-9 rounded-full border-muted-foreground/20 hover:bg-accent"
          aria-label="Recent activity notifications"
        >
          <Bell className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-xl border-border bg-popover rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Recent Activity</h4>
            <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium py-0 px-2">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </Badge>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <CheckCheck className="size-3.5" /> Read all
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="size-8 text-muted-foreground/40 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium text-foreground">No activity recorded yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Team actions and system updates will appear here live.
              </p>
            </div>
          ) : (
            activities.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/40 ${
                  item.is_unread ? "bg-primary/5 dark:bg-primary/10" : ""
                }`}
              >
                {/* Icon Container */}
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background shadow-xs">
                  {getEntityIcon(item.entity_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {item.actor_name}
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground whitespace-nowrap">
                      {formatActivityTime(item.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    <span className="font-medium text-foreground/90">{item.action}</span>
                    {item.entity_label ? (
                      <span className="ml-1 text-muted-foreground/85">
                        → {item.entity_label}
                      </span>
                    ) : null}
                  </p>
                </div>

                {/* Unread Dot */}
                {item.is_unread && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
