import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureSmAnalyticsTables } from "@/lib/sm-analytics";
import { z } from "zod";

const goalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  platform_id: z.coerce.number().int().nullable().optional(),
  period_month: z.string().min(1, "Period month is required"),
  target_posts: z.coerce.number().int().min(0).default(0),
  target_views: z.coerce.number().int().min(0).default(0),
  target_inquiries: z.coerce.number().int().min(0).default(0),
  target_likes: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional().or(z.literal("")).default(""),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  await ensureSmAnalyticsTables();

  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }

  const d = parsed.data;
  await execute(
    `UPDATE sm_goals 
     SET title = ?, platform_id = ?, period_month = ?, target_posts = ?, target_views = ?, target_inquiries = ?, target_likes = ?, notes = ?, updated_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [
      d.title,
      d.platform_id || null,
      d.period_month,
      d.target_posts,
      d.target_views,
      d.target_inquiries,
      d.target_likes,
      d.notes || null,
      id,
      tenantId,
    ]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  await ensureSmAnalyticsTables();

  await execute(`DELETE FROM sm_goals WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  return NextResponse.json({ success: true });
}
