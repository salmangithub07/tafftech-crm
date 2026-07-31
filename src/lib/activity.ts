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

    await execute(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 5;
    `);

    await execute(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Pcs';
    `);

    await execute(`
      ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
    `).catch(() => {});

    await execute(`
      ALTER TABLE customers ALTER COLUMN status TYPE VARCHAR(50);
    `).catch(() => {});

    await execute(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_trashed SMALLINT DEFAULT 0;
    `).catch(() => {});

    await execute(`
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_trashed SMALLINT DEFAULT 0;
    `).catch(() => {});

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

export async function checkAndLogLowStock(
  tenantId: number,
  productId: number,
  actorId: number,
  actorName: string
) {
  try {
    await ensureActivityTables();
    const prodRes = await query<{ name: string; min_stock_level: number }>(
      `SELECT name, COALESCE(min_stock_level, 5) as min_stock_level FROM products WHERE id = ? AND tenant_id = ?`,
      [productId, tenantId]
    );
    if (!prodRes.length) return;
    const prod = prodRes[0];

    const stockRes = await query<{ stock: number }>(
      `SELECT COALESCE(SUM(CASE WHEN type='in' THEN quantity WHEN type='out' THEN -quantity ELSE 0 END), 0) AS stock
       FROM stock_transactions WHERE product_id = ? AND tenant_id = ?`,
      [productId, tenantId]
    );
    const currentStock = Number(stockRes[0]?.stock || 0);

    if (currentStock <= prod.min_stock_level) {
      const isOutOfStock = currentStock <= 0;
      await logActivity({
        tenantId,
        actorId,
        actorName,
        action: isOutOfStock ? "❌ Out of Stock Alert" : "⚠️ Low Stock Warning",
        entityType: "product",
        entityId: productId,
        entityLabel: `${prod.name} (${currentStock} left, min threshold: ${prod.min_stock_level})`,
      });
    }
  } catch (err) {
    console.error("Failed to check low stock alert:", err);
  }
}

