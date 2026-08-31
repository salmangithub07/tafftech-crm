import { execute } from "@/lib/db";

let smTablesInitialized = false;

export async function ensureSmAnalyticsTables() {
  if (smTablesInitialized) return;
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS sm_goals (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        platform_id INTEGER,
        period_month VARCHAR(20) NOT NULL,
        target_posts INTEGER DEFAULT 0,
        target_views INTEGER DEFAULT 0,
        target_inquiries INTEGER DEFAULT 0,
        target_likes INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_sm_goals_tenant_period ON sm_goals(tenant_id, period_month);
    `).catch(() => {});

    await execute(`
      CREATE TABLE IF NOT EXISTS sm_tasks (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        goal_id INTEGER,
        platform_id INTEGER,
        executive_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'content',
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'todo',
        due_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await execute(`
      CREATE INDEX IF NOT EXISTS idx_sm_tasks_tenant_status ON sm_tasks(tenant_id, status);
    `).catch(() => {});

    smTablesInitialized = true;
  } catch (err) {
    console.error("Error ensuring SM analytics tables:", err);
  }
}
