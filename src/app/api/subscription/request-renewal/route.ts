import { NextRequest, NextResponse } from "next/server";
import { getSession, tenantOf } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const requestedPlan = body?.plan_type || "monthly";
  const notes = body?.notes || "";

  const tenantId = tenantOf(session) ?? session.id;

  // Log activity for Super Admin review
  await logActivity({
    tenantId: 0, // Global super admin activity feed
    actorId: session.id,
    actorName: session.name,
    action: "🔔 Renewal Request",
    entityType: "team",
    entityId: session.id,
    entityLabel: `${session.name} requested renewal for ${requestedPlan.toUpperCase()} plan. ${notes ? `Note: ${notes}` : ""}`,
  });

  return NextResponse.json({
    success: true,
    message: "Renewal request sent successfully to Super Admin.",
  });
}
