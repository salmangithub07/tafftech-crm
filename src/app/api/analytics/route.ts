import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { buildDateFilter, paginationParams } from "@/lib/query-helpers";
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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const period = req.nextUrl.searchParams.get("period");
  const date = req.nextUrl.searchParams.get("date");
  const platformId = req.nextUrl.searchParams.get("platform_id");
  const { page, limit, offset } = paginationParams(req, 10);

  const dateFilter = buildDateFilter("an.analytics_date", period, date);
  let where = " WHERE an.tenant_id = ?" + dateFilter.clause;
  const params: unknown[] = [tenantId, ...dateFilter.params];
  if (platformId) {
    where += " AND an.platform_id = ?";
    params.push(platformId);
  }

  const [rows, totalRow, summary] = await Promise.all([
    query(
      `SELECT an.*, a.name AS executive_name, p.platform_name
       FROM analytics an
       LEFT JOIN admins a ON a.id = an.executive_id
       LEFT JOIN social_platforms p ON p.id = an.platform_id
       ${where} ORDER BY an.analytics_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM analytics an ${where}`, params),
    queryOne<{ entries: number; enquiries: number; posts: number; views: number }>(
      `SELECT COUNT(*) AS entries, COALESCE(SUM(an.enquiries),0) AS enquiries,
         COALESCE(SUM(an.total_posts),0) AS posts, COALESCE(SUM(an.total_views),0) AS views
       FROM analytics an ${where}`,
      params
    ),
  ]);

  return NextResponse.json({
    data: rows,
    total: totalRow?.c ?? 0,
    page,
    limit,
    counts: {
      entries: summary?.entries ?? 0,
      enquiries: summary?.enquiries ?? 0,
      posts: summary?.posts ?? 0,
      views: summary?.views ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  const body = await req.json().catch(() => null);
  const parsed = analyticsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const result = await execute(
    `INSERT INTO analytics (tenant_id, executive_id, platform_id, analytics_date, post_reference, enquiries, total_posts, total_views, total_likes, total_comments, watch_time, subscribers_gained, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
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
    ]
  );
  const row = await query(
    `SELECT an.*, a.name AS executive_name, p.platform_name
     FROM analytics an LEFT JOIN admins a ON a.id = an.executive_id
     LEFT JOIN social_platforms p ON p.id = an.platform_id WHERE an.id = ?`,
    [result.insertId]
  );
  return NextResponse.json(row[0], { status: 201 });
}
