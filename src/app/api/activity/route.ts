import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession, tenantOf } from "@/lib/auth";
import { ensureActivityTables } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = tenantOf(session);
  if (!tenantId) return NextResponse.json({ error: "No tenant scope" }, { status: 400 });

  await ensureActivityTables();

  const userId = session.id;
  const isExecutive = session.role === "executive";

  // Get user's last read timestamp
  const readRecord = await queryOne<{ last_read_at: string }>(
    `SELECT last_read_at FROM notification_reads WHERE tenant_id = ? AND user_id = ?`,
    [tenantId, userId]
  );
  const lastReadAt = readRecord?.last_read_at ? new Date(readRecord.last_read_at) : new Date(0);

  // Build WHERE clause:
  // For executives, exclude their own actions so they only see actions performed by OTHER team members.
  // For admins, see actions by all team members (including themselves/others, as per request: "admin ko sabhi team members ki recent activity notifications k through aani chahiye").
  let whereSql = `WHERE tenant_id = ?`;
  const params: unknown[] = [tenantId];

  if (isExecutive) {
    whereSql += ` AND actor_id != ?`;
    params.push(userId);
  }

  // Fetch recent 40 activities
  const activities = await query<any>(
    `SELECT * FROM activity_log ${whereSql} ORDER BY created_at DESC LIMIT 40`,
    params
  );

  // Calculate unread count
  let unreadParams = [...params];
  let unreadWhere = whereSql + ` AND created_at > ?`;
  unreadParams.push(lastReadAt.toISOString());

  const unreadRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM activity_log ${unreadWhere}`,
    unreadParams
  );
  const unreadCount = parseInt(unreadRes?.count || "0", 10);

  // Add is_unread flag to items
  const formattedActivities = activities.map((act) => ({
    ...act,
    is_unread: new Date(act.created_at) > lastReadAt,
  }));

  return NextResponse.json({
    activities: formattedActivities,
    unreadCount,
    lastReadAt: lastReadAt.toISOString(),
  });
}
