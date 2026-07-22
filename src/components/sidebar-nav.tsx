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
      <div className={cn("flex h-14 items-center gap-2 border-b", collapsed ? "justify-center px-2" : "px-4")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4" />
        </div>
        {!collapsed && <span className="truncate font-semibold">{siteName}</span>}
      </div>

      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
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
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && item.title}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t p-3 text-xs text-muted-foreground">
          Tafftech CRM &copy; {new Date().getFullYear()}
        </div>
      )}
    </div>
  );
}
