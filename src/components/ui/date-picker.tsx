"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export interface DatePickerProps {
  value?: string; // "YYYY-MM-DD"
  onChange?: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value = "",
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const initialDate = React.useMemo(() => {
    if (value && value.includes("-")) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewDate, setViewDate] = React.useState<Date>(initialDate);

  React.useEffect(() => {
    if (value && value.includes("-")) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) setViewDate(new Date(y, m - 1, d));
    }
  }, [value]);

  const cYear = viewDate.getFullYear();
  const cMonth = viewDate.getMonth(); // 0-11

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const daysGrid = React.useMemo(() => {
    // 0 = Sunday, 1 = Monday ... convert to Monday = 0
    const firstDayIndex = (new Date(cYear, cMonth, 1).getDay() + 6) % 7;
    const totalDays = new Date(cYear, cMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(cYear, cMonth, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const prevDate = new Date(cYear, cMonth - 1, day);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      cells.push({ dateStr: `${y}-${m}-${d}`, dayNum: day, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const y = cYear;
      const m = String(cMonth + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      cells.push({ dateStr: `${y}-${m}-${d}`, dayNum: day, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(cYear, cMonth + 1, day);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      cells.push({ dateStr: `${y}-${m}-${d}`, dayNum: day, isCurrentMonth: false });
    }

    return cells;
  }, [cYear, cMonth]);

  const todayStr = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const yesterdayStr = React.useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  function handlePrevMonth() {
    setViewDate(new Date(cYear, cMonth - 1, 1));
  }

  function handleNextMonth() {
    setViewDate(new Date(cYear, cMonth + 1, 1));
  }

  function handleSelectDate(dateStr: string) {
    onChange?.(dateStr);
    setOpen(false);
  }

  const display = formatDisplayDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          variant="outline"
          className={cn(
            "w-full h-9 justify-between text-xs font-normal border-input bg-card hover:bg-muted focus:ring-1 focus:ring-primary text-left px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="size-4 text-primary shrink-0 opacity-80" />
            <span className="font-medium truncate">{display || placeholder}</span>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0 opacity-60 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[285px] p-3" align="start">
        {/* Header: Prev, Month Year, Next */}
        <div className="flex items-center justify-between gap-1 pb-2 border-b border-border/40">
          <Button variant="ghost" size="icon" className="size-7" onClick={handlePrevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-bold text-foreground">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="size-7" onClick={handleNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-semibold text-muted-foreground">
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>Su</span>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysGrid.map((cell, idx) => {
            const isSelected = value === cell.dateStr;
            const isToday = todayStr === cell.dateStr;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDate(cell.dateStr)}
                className={cn(
                  "size-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer",
                  !cell.isCurrentMonth && "text-muted-foreground/30",
                  cell.isCurrentMonth && "text-foreground hover:bg-muted",
                  isToday && !isSelected && "border border-primary text-primary font-bold",
                  isSelected && "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
                )}
              >
                {cell.dayNum}
              </button>
            );
          })}
        </div>

        {/* Quick Presets Bar */}
        <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-2 text-[11px]">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
            onClick={() => handleSelectDate(yesterdayStr)}
          >
            Yesterday
          </button>
          <button
            type="button"
            className="text-primary font-semibold hover:underline cursor-pointer"
            onClick={() => handleSelectDate(todayStr)}
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
