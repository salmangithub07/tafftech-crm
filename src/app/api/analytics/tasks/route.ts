import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { ensureSmAnalyticsTables } from "@/lib/sm-analytics";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional().or(z.literal("")).default(""),
  category: z.enum(["content", "seo", "thumbnail", "engagement", "ads", "other"]).default("content"),
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  due_date: z.string().nullable().optional(),
  executive_id: z.coerce.number().int().nullable().optional(),
  goal_id: z.coerce.number().int().nullable().optional(),
  platform_id: z.coerce.number().int().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  await ensureSmAnalyticsTables();

  const status = req.nextUrl.searchParams.get("status");
  const category = req.nextUrl.searchParams.get("category");
  const executiveId = req.nextUrl.searchParams.get("executive_id");
  const goalId = req.nextUrl.searchParams.get("goal_id");

  let where = "WHERE t.tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (status && status !== "all") {
    where += " AND t.status = ?";
    params.push(status);
  }
  if (category && category !== "all") {
    where += " AND t.category = ?";
    params.push(category);
  }
  if (executiveId && executiveId !== "all") {
    where += " AND t.executive_id = ?";
    params.push(executiveId);
  }
  if (goalId && goalId !== "all") {
    where += " AND t.goal_id = ?";
    params.push(goalId);
  }

  const tasks = await query<any>(
    `SELECT t.*, 
            a.name AS executive_name, 
            p.platform_name, 
            g.title AS goal_title
     FROM sm_tasks t
     LEFT JOIN admins a ON a.id = t.executive_id
     LEFT JOIN social_platforms p ON p.id = t.platform_id
     LEFT JOIN sm_goals g ON g.id = t.goal_id
     ${where}
     ORDER BY 
       CASE t.priority
         WHEN 'urgent' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END,
       t.due_date ASC NULLS LAST,
       t.id DESC`,
    params
  );

  return NextResponse.json({ data: tasks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;

  await ensureSmAnalyticsTables();

  const body = await req.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }

  const d = parsed.data;
  const result = await execute(
    `INSERT INTO sm_tasks (tenant_id, goal_id, platform_id, executive_id, title, description, category, priority, status, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      d.goal_id || null,
      d.platform_id || null,
      d.executive_id || null,
      d.title,
      d.description || null,
      d.category,
      d.priority,
      d.status,
      d.due_date || null,
    ]
  );

  return NextResponse.json({ success: true, id: result.insertId });
}
