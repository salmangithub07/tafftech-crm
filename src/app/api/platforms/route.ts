import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const platforms = await query(
    "SELECT * FROM social_platforms WHERE tenant_id = ? ORDER BY platform_name ASC",
    [tenantId]
  );
  return NextResponse.json(platforms);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = z.object({ platform_name: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const result = await execute("INSERT INTO social_platforms (tenant_id, platform_name) VALUES (?, ?)", [
    tenantId,
    parsed.data.platform_name,
  ]);
  const platform = await query("SELECT * FROM social_platforms WHERE id = ?", [result.insertId]);
  return NextResponse.json(platform[0], { status: 201 });
}
