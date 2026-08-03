"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  sublabel?: string;
};

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyLabel = "No results found.",
  className,
  triggerClassName,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  const selected = options.find((o) => o.value === value);

  function handleSelect(opt: SearchableOption) {
    onValueChange(opt.value === value ? null : opt.value);
    setQuery("");
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange(null);
    setQuery("");
  }

  // Focus input when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-9 text-xs",
            !selected && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">
            {selected ? (
              <>
                {selected.label}
                {selected.sublabel && (
                  <span className="text-muted-foreground ml-1">({selected.sublabel})</span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex items-center gap-0.5 shrink-0 ml-1">
            {selected && (
              <span
                role="button"
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-muted cursor-pointer"
                title="Clear"
              >
                <X className="size-3 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-70" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 w-[var(--radix-popover-trigger-width)]", className)}
        align="start"
        sideOffset={4}
      >
        <div className="p-2 border-b">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                  value === opt.value && "bg-accent/50 font-medium"
                )}
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    value === opt.value ? "opacity-100 text-primary" : "opacity-0"
                  )}
                />
                <span className="flex-1 truncate">
                  {opt.label}
                  {opt.sublabel && (
                    <span className="text-muted-foreground ml-1">({opt.sublabel})</span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
