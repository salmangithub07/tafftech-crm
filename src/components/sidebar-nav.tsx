"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { navForSession } from "@/components/nav-items";
import type { SessionPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SidebarNav({
  siteName,
  session,
  collapsed = false,
  onNavigate,
}: {
  siteName: string;
  session: SessionPayload;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navForSession(session);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2.5 border-b border-border/60", collapsed ? "justify-center px-2" : "px-4")}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-xs ring-2 ring-primary/20">
          <LayoutDashboard className="size-4.5" />
        </div>
        {!collapsed && (
          <span className="truncate font-bold tracking-tight text-foreground text-sm">
            {siteName}
          </span>
        )}
      </div>

      <nav className={cn("flex-1 space-y-1.5 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.title : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 border-b border-border/30 last:border-b-0",
                collapsed ? "justify-center rounded-lg px-2" : "rounded-r-lg rounded-l-xs",
                active
                  ? collapsed
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border-l-3 border-primary bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                active ? "text-primary dark:text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t p-3 text-xs text-muted-foreground">
          Taff Desk CRM &copy; {new Date().getFullYear()}
        </div>
      )}
    </div>
  );
}
