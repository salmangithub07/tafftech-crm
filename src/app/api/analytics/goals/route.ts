import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureSmAnalyticsTables } from "@/lib/sm-analytics";
import { z } from "zod";

const goalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  platform_id: z.coerce.number().int().nullable().optional(),
  period_month: z.string().min(1, "Period month is required"), // e.g. "2026-08"
  target_posts: z.coerce.number().int().min(0).default(0),
  target_views: z.coerce.number().int().min(0).default(0),
  target_inquiries: z.coerce.number().int().min(0).default(0),
  target_likes: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional().or(z.literal("")).default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  await ensureSmAnalyticsTables();

  const periodMonth = req.nextUrl.searchParams.get("period_month");
  let where = "WHERE g.tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (periodMonth && periodMonth !== "all") {
    where += " AND g.period_month = ?";
    params.push(periodMonth);
  }

  // Get goals
  const goals = await query<any>(
    `SELECT g.*, p.platform_name
     FROM sm_goals g
     LEFT JOIN social_platforms p ON p.id = g.platform_id
     ${where}
     ORDER BY g.period_month DESC, g.id DESC`,
    params
  );

  // Compute progress for each goal from analytics entries
  const enrichedGoals = await Promise.all(
    goals.map(async (g) => {
      let actualWhere = "WHERE tenant_id = ? AND to_char(analytics_date::date, 'YYYY-MM') = ?";
      const actualParams: unknown[] = [tenantId, g.period_month];

      if (g.platform_id) {
        actualWhere += " AND platform_id = ?";
        actualParams.push(g.platform_id);
      }

      const actualRow = await query<any>(
        `SELECT 
           COALESCE(SUM(total_posts), 0)::int as actual_posts,
           COALESCE(SUM(total_views), 0)::int as actual_views,
           COALESCE(SUM(enquiries), 0)::int as actual_inquiries,
           COALESCE(SUM(total_likes), 0)::int as actual_likes
         FROM analytics
         ${actualWhere}`,
        actualParams
      );

      const actual = actualRow[0] || { actual_posts: 0, actual_views: 0, actual_inquiries: 0, actual_likes: 0 };
      
      // Calculate overall progress weighted average
      let metricCount = 0;
      let totalPercent = 0;

      if (g.target_posts > 0) {
        metricCount++;
        totalPercent += Math.min(100, (actual.actual_posts / g.target_posts) * 100);
      }
      if (g.target_views > 0) {
        metricCount++;
        totalPercent += Math.min(100, (actual.actual_views / g.target_views) * 100);
      }
      if (g.target_inquiries > 0) {
        metricCount++;
        totalPercent += Math.min(100, (actual.actual_inquiries / g.target_inquiries) * 100);
      }
      if (g.target_likes > 0) {
        metricCount++;
        totalPercent += Math.min(100, (actual.actual_likes / g.target_likes) * 100);
      }

      const progress_percent = metricCount > 0 ? Math.round(totalPercent / metricCount) : 0;

      let status: "on_track" | "at_risk" | "behind" | "achieved" = "on_track";
      if (progress_percent >= 100) {
        status = "achieved";
      } else if (progress_percent >= 60) {
        status = "on_track";
      } else if (progress_percent >= 30) {
        status = "at_risk";
      } else {
        status = "behind";
      }

      return {
        ...g,
        actual_posts: actual.actual_posts,
        actual_views: actual.actual_views,
        actual_inquiries: actual.actual_inquiries,
        actual_likes: actual.actual_likes,
        progress_percent,
        status,
      };
    })
  );

  return NextResponse.json({ data: enrichedGoals });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  await ensureSmAnalyticsTables();

  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }

  const d = parsed.data;
  const result = await execute(
    `INSERT INTO sm_goals (tenant_id, title, platform_id, period_month, target_posts, target_views, target_inquiries, target_likes, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      d.title,
      d.platform_id || null,
      d.period_month,
      d.target_posts,
      d.target_views,
      d.target_inquiries,
      d.target_likes,
      d.notes || null,
    ]
  );

  return NextResponse.json({ success: true, id: result.insertId });
}
