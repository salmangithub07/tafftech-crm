import type { NextRequest } from "next/server";

/** Builds a SQL WHERE fragment + params for a day/month/year filter on a given date column. */
export function buildDateFilter(
  column: string,
  period: string | null,
  date: string | null
): { clause: string; params: unknown[] } {
  if (!period || period === "all" || !date) return { clause: "", params: [] };
  if (period === "day") return { clause: ` AND ${column}::date = ?::date`, params: [date] };
  if (period === "month") return { clause: ` AND TO_CHAR(${column}, 'YYYY-MM') = ?`, params: [date] };
  if (period === "year") return { clause: ` AND TO_CHAR(${column}, 'YYYY') = ?`, params: [date] };
  return { clause: "", params: [] };
}

export function paginationParams(req: NextRequest, defaultLimit = 10) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const rawLimit = Number(req.nextUrl.searchParams.get("limit")) || defaultLimit;
  const limit = Math.max(1, Math.min(200, rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
