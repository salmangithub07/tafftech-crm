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
    if (opt.value === value) {
      onValueChange(null);
    } else {
      onValueChange(opt.value);
    }
    setQuery("");
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(null);
    setQuery("");
    setOpen(false);
  }

  // Focus input when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
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
            "w-full justify-between font-normal h-9 text-xs bg-background hover:bg-background/90 select-none",
            !selected && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate text-left flex-1 mr-1">
            {selected ? (
              <span className="text-foreground font-medium">
                {selected.label}
                {selected.sublabel && (
                  <span className="text-muted-foreground ml-1 font-normal">({selected.sublabel})</span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {selected && (
              <span
                role="button"
                tabIndex={0}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleClear}
                className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Clear selection"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-60" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0 w-[var(--radix-popover-trigger-width)] min-w-[240px] bg-popover text-popover-foreground border shadow-xl z-50 rounded-lg overflow-hidden",
          className
        )}
        align="start"
        sideOffset={4}
      >
        <div className="p-2 border-b bg-muted/30">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 text-xs bg-background"
          />
        </div>
        <div className="max-h-56 overflow-y-auto py-1 bg-popover">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer",
                  value === opt.value && "bg-accent/60 font-medium"
                )}
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0 text-primary",
                    value === opt.value ? "opacity-100" : "opacity-0"
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
