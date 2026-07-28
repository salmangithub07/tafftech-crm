"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-2.5 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
      {/* Top / Left: Rows per page & Items range */}
      <div className="flex items-center justify-between text-xs text-muted-foreground sm:justify-start sm:gap-3 sm:text-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger size="sm" className="h-7 w-[65px] text-xs sm:h-8 sm:w-[70px] sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="font-mono text-xs text-muted-foreground sm:text-sm">
          {from}–{to} of {total}
        </span>
      </div>

      {/* Bottom / Right: Navigation buttons */}
      <div className="flex items-center justify-center gap-1 sm:justify-end">
        <Button
          variant="outline"
          size="icon"
          className="size-7 sm:size-8 text-xs shrink-0"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
        >
          <ChevronsLeft className="size-3.5 sm:size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7 sm:size-8 text-xs shrink-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous Page"
        >
          <ChevronLeft className="size-3.5 sm:size-4" />
        </Button>

        <span className="px-2 text-xs font-medium text-foreground sm:text-sm shrink-0">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="size-7 sm:size-8 text-xs shrink-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next Page"
        >
          <ChevronRight className="size-3.5 sm:size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-7 sm:size-8 text-xs shrink-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
        >
          <ChevronsRight className="size-3.5 sm:size-4" />
        </Button>
      </div>
    </div>
  );
}
