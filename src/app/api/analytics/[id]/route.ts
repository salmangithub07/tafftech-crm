import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { z } from "zod";

const analyticsSchema = z.object({
  executive_id: z.coerce.number().int().positive("Select a team member"),
  platform_id: z.coerce.number().int().positive("Select a platform"),
  analytics_date: z.string().min(1, "Date is required"),
  post_reference: z.string().optional().or(z.literal("")).default(""),
  enquiries: z.coerce.number().int().min(0).default(0),
  total_posts: z.coerce.number().int().min(0).default(0),
  total_views: z.coerce.number().int().min(0).default(0),
  total_likes: z.coerce.number().int().min(0).default(0),
  total_comments: z.coerce.number().int().min(0).default(0),
  watch_time: z.coerce.number().min(0).default(0),
  subscribers_gained: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional().or(z.literal("")).default(""),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM analytics WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = analyticsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  await execute(
    `UPDATE analytics SET executive_id=?, platform_id=?, analytics_date=?, post_reference=?, enquiries=?,
       total_posts=?, total_views=?, total_likes=?, total_comments=?, watch_time=?, subscribers_gained=?, notes=?
     WHERE id=? AND tenant_id=?`,
    [
      d.executive_id,
      d.platform_id,
      d.analytics_date,
      d.post_reference,
      d.enquiries,
      d.total_posts,
      d.total_views,
      d.total_likes,
      d.total_comments,
      d.watch_time,
      d.subscribers_gained,
      d.notes,
      id,
      tenantId,
    ]
  );

  const row = await query(
    `SELECT an.*, a.name AS executive_name, p.platform_name
     FROM analytics an LEFT JOIN admins a ON a.id = an.executive_id
     LEFT JOIN social_platforms p ON p.id = an.platform_id WHERE an.id = ?`,
    [id]
  );
  return NextResponse.json(row[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  const existing = await query("SELECT id FROM analytics WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM analytics WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return NextResponse.json({ ok: true });
}
