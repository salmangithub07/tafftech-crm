import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
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

const patchSchema = z.object({
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  await ensureSmAnalyticsTables();

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }

  const updates: string[] = [];
  const queryParams: unknown[] = [];

  if (parsed.data.status !== undefined) {
    updates.push("status = ?");
    queryParams.push(parsed.data.status);
  }
  if (parsed.data.priority !== undefined) {
    updates.push("priority = ?");
    queryParams.push(parsed.data.priority);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.push("updated_at = NOW()");
  queryParams.push(id, tenantId);

  await execute(
    `UPDATE sm_tasks SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
    queryParams
  );

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenantId = tenantOf(session)!;
  const { id } = await params;

  await ensureSmAnalyticsTables();

  const body = await req.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }

  const d = parsed.data;
  await execute(
    `UPDATE sm_tasks 
     SET title = ?, description = ?, category = ?, priority = ?, status = ?, due_date = ?, executive_id = ?, goal_id = ?, platform_id = ?, updated_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [
      d.title,
      d.description || null,
      d.category,
      d.priority,
      d.status,
      d.due_date || null,
      d.executive_id || null,
      d.goal_id || null,
      d.platform_id || null,
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

  await execute(`DELETE FROM sm_tasks WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  return NextResponse.json({ success: true });
}
