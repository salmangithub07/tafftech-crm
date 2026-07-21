"use client";

import * as React from "react";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DatePeriod = "all" | "day" | "month" | "year";

export type DateFilterValue = {
  period: DatePeriod;
  value: string; // "" for all, "YYYY-MM-DD" for day, "YYYY-MM" for month, "YYYY" for year
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => String(currentYear - i));

export function DateFilter({
  value,
  onChange,
}: {
  value: DateFilterValue;
  onChange: (next: DateFilterValue) => void;
}) {
  function setPeriod(period: DatePeriod) {
    onChange({ period, value: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.period} onValueChange={(p) => setPeriod(p as DatePeriod)}>
        <SelectTrigger size="sm" className="w-[130px]">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="day">Specific day</SelectItem>
          <SelectItem value="month">Month</SelectItem>
          <SelectItem value="year">Year</SelectItem>
        </SelectContent>
      </Select>

      {value.period === "day" && (
        <Input
          type="date"
          className="h-8 w-[150px]"
          value={value.value}
          onChange={(e) => onChange({ period: "day", value: e.target.value })}
        />
      )}

      {value.period === "month" && (
        <Input
          type="month"
          className="h-8 w-[150px]"
          value={value.value}
          onChange={(e) => onChange({ period: "month", value: e.target.value })}
        />
      )}

      {value.period === "year" && (
        <Select
          value={value.value || undefined}
          onValueChange={(v) => onChange({ period: "year", value: v })}
        >
          <SelectTrigger size="sm" className="w-[110px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.period !== "all" && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onChange({ period: "all", value: "" })}
          title="Clear date filter"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}

/** Builds the `period`/`date` query params to send to the API for a given filter value. */
export function dateFilterParams(value: DateFilterValue): Record<string, string> {
  if (value.period === "all" || !value.value) return {};
  return { period: value.period, date: value.value };
}
