"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ScrollableTabsLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  filter?: React.ReactNode;
}

export function ScrollableTabsLayout({
  children,
  filter,
  className,
  ...props
}: ScrollableTabsLayoutProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScrollRight = () => {
    const root = containerRef.current;
    if (!root) return;
    const listEl = (root.querySelector('[data-slot="tabs-list"]') as HTMLElement) || root.querySelector(".overflow-x-auto") as HTMLElement;
    if (listEl) {
      listEl.scrollBy({ left: 160, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full", className)}
      {...props}
    >
      {/* 1. Tabs Row with right gradient mask on mobile */}
      <div className="relative w-full sm:w-auto min-w-0">
        <div className="w-full overflow-x-auto scrollbar-none py-0.5 no-scrollbar flex items-center">
          {children}
        </div>
        {/* Subtle Right Gradient Hint */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background via-background/60 to-transparent sm:hidden z-10" />
      </div>

      {/* 2. Second Row on Mobile: Filter on Left + Always-Visible Swipe Indicator Button on Right */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-2 shrink-0">
        <div className="shrink-0">{filter}</div>

        {/* ALWAYS VISIBLE ON MOBILE */}
        <button
          type="button"
          onClick={handleScrollRight}
          className="flex sm:hidden items-center gap-1.5 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary border border-primary/25 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none shadow-2xs shrink-0"
          title="Tap or swipe to see more tabs"
        >
          <span className="text-base leading-none animate-swipe-hand select-none">👆</span>
          <span className="text-xs font-semibold whitespace-nowrap">Swipe tabs</span>
          <ChevronRight className="size-3.5 opacity-75 shrink-0" />
        </button>
      </div>
    </div>
  );
}

export const ScrollableTabsWrapper = ScrollableTabsLayout;
