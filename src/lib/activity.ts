import { execute, query } from "@/lib/db";
import type { ActivityEntityType } from "@/lib/types";

let tablesInitialized = false;

export async function ensureActivityTables() {
  if (tablesInitialized) return;
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id            BIGSERIAL PRIMARY KEY,
        tenant_id     INTEGER NOT NULL,
        actor_id      INTEGER NOT NULL,
        actor_name    VARCHAR(255) NOT NULL,
        action        VARCHAR(100) NOT NULL,
        entity_type   VARCHAR(50) NOT NULL,
        entity_id     INTEGER,
        entity_label  VARCHAR(255),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_tenant ON activity_log(tenant_id, created_at DESC);
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id             BIGSERIAL PRIMARY KEY,
        tenant_id      INTEGER NOT NULL,
        user_id        INTEGER NOT NULL,
        last_read_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, user_id)
      );
    `);

    tablesInitialized = true;
  } catch (err) {
    console.error("Failed to initialize activity tables:", err);
  }
}

export async function logActivity({
  tenantId,
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  entityLabel,
}: {
  tenantId: number;
  actorId: number;
  actorName: string;
  action: string;
  entityType: ActivityEntityType;
  entityId?: number | null;
  entityLabel?: string | null;
}) {
  try {
    await ensureActivityTables();
    await execute(
      `INSERT INTO activity_log (tenant_id, actor_id, actor_name, action, entity_type, entity_id, entity_label)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, actorId, actorName, action, entityType, entityId || null, entityLabel || null]
    );
  } catch (err) {
    console.error("Failed to record activity log:", err);
  }
}
