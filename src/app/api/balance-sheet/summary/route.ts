import { NextResponse } from "next/server";
import { getSession, tenantOf } from "@/lib/auth";
import { getBalanceSheetSummary } from "@/lib/balance-sheet";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const summary = await getBalanceSheetSummary(tenantId);
  return NextResponse.json(summary);
}
