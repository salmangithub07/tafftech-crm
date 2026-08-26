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
      UPDATE customers SET status = 'completed' WHERE status = 'inactive';
    `).catch(() => {});

    await execute(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_trashed SMALLINT DEFAULT 0;
    `).catch(() => {});

    await execute(`
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_trashed SMALLINT DEFAULT 0;
    `).catch(() => {});

    await execute(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER;
    `).catch(() => {});

    await execute(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0;
    `).catch(() => {});

    await execute(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id          SERIAL PRIMARY KEY,
        tenant_id   INTEGER NOT NULL,
        name        VARCHAR(100) NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await execute(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER;
    `).catch(() => {});

    await execute(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    `).catch(() => {});

    await execute(`
      ALTER TABLE stock_transactions ALTER COLUMN product_id DROP NOT NULL;
    `).catch(() => {});

    await execute(`
      ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_product_id_fkey;
    `).catch(() => {});

    await execute(`
      ALTER TABLE stock_transactions 
      ADD CONSTRAINT stock_transactions_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
    `).catch(() => {});

    // Additional Bill fields (BOOK TO, TRANSPORT, GR.NO, VEHICLE NO, DISPUTE NOTE)
    await execute(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS book_to VARCHAR(255);`).catch(() => {});
    await execute(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS transport VARCHAR(255);`).catch(() => {});
    await execute(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS gr_no VARCHAR(100);`).catch(() => {});
    await execute(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(100);`).catch(() => {});
    await execute(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS dispute_note TEXT;`).catch(() => {});
    await execute(`ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(100);`).catch(() => {});
    await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(100);`).catch(() => {});

    // Additional Quotation fields & quotation_items table
    await execute(`
      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        appointment_id INTEGER NULL,
        customer_id INTEGER NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        quotation_number VARCHAR(50),
        quotation_date DATE DEFAULT CURRENT_DATE,
        quotation_amount DECIMAL(12,2) DEFAULT 0,
        subtotal DECIMAL(12,2) DEFAULT 0,
        tax_percent DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0,
        quotation_status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        book_to VARCHAR(255),
        transport VARCHAR(255),
        gr_no VARCHAR(100),
        vehicle_no VARCHAR(100),
        dispute_note TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await execute(`ALTER TABLE quotations ALTER COLUMN appointment_id DROP NOT NULL;`).catch(() => {});
    await execute(`ALTER TABLE quotations ALTER COLUMN customer_id DROP NOT NULL;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(50);`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_address TEXT;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS book_to VARCHAR(255);`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS transport VARCHAR(255);`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS gr_no VARCHAR(100);`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(100);`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS dispute_note TEXT;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2) DEFAULT 0;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;`).catch(() => {});
    await execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS is_trashed INT DEFAULT 0;`).catch(() => {});

    await execute(`
      CREATE TABLE IF NOT EXISTS quotation_items (
        id BIGSERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
        product_id INTEGER NULL REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        hsn_code VARCHAR(100),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    // Subscription plan columns
    await execute(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'trial';
    `).catch(() => {});

    await execute(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS plan_start_date DATE DEFAULT NULL;
    `).catch(() => {});

    await execute(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS plan_expiry_date DATE DEFAULT NULL;
    `).catch(() => {});

    // Table for tracking tenant subscription payment proofs / UTR submissions
    await execute(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id            BIGSERIAL PRIMARY KEY,
        tenant_id     INTEGER NOT NULL,
        admin_name    VARCHAR(255) NOT NULL,
        admin_email   VARCHAR(255) NOT NULL,
        plan_type     VARCHAR(50) DEFAULT 'yearly',
        amount        NUMERIC(10, 2) NOT NULL,
        utr_number    VARCHAR(100) NOT NULL,
        notes         TEXT,
        status        VARCHAR(20) DEFAULT 'pending',
        coupon_code   VARCHAR(50) DEFAULT NULL,
        discount_amount NUMERIC(10, 2) DEFAULT 0,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    // Table for tracking promotional offers & discount coupons created by Super Admin
    await execute(`
      CREATE TABLE IF NOT EXISTS subscription_coupons (
        id                    BIGSERIAL PRIMARY KEY,
        title                 VARCHAR(255) NOT NULL,
        code                  VARCHAR(50) NOT NULL UNIQUE,
        discount_percent      INTEGER NOT NULL,
        banner_text           TEXT,
        applicable_plan       VARCHAR(50) DEFAULT 'all',
        valid_till            DATE DEFAULT NULL,
        is_active             BOOLEAN DEFAULT true,
        show_on_landing_page  BOOLEAN DEFAULT true,
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      );
    `).catch(() => {});

    await execute(`
      ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT NULL;
    `).catch(() => {});

    await execute(`
      ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
    `).catch(() => {});

    await execute(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;
    `).catch(() => {});

    await execute(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NULL;
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
    // 🔒 SUPER ADMIN & SUPPORT IMPERSONATION PRIVACY GUARANTEE:
    // Super Admin activities (including actions during Support Impersonation "Login as Tenant")
    // must NEVER produce notifications or activity log entries for any tenant.
    if (
      actorName?.toLowerCase().includes("super admin") ||
      actorName?.toLowerCase().includes("superadmin")
    ) {
      return;
    }

    // Verify if actorId belongs to a Super Admin account
    const actorRoleRes = await query<{ role: string }>(
      "SELECT role FROM admins WHERE id = ?",
      [actorId]
    ).catch(() => []);

    if (actorRoleRes.length > 0 && actorRoleRes[0].role === "super_admin") {
      return;
    }

    await ensureActivityTables();
    await execute(
      `INSERT INTO activity_log (tenant_id, actor_id, actor_name, action, entity_type, entity_id, entity_label)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, actorId, actorName, action, entityType, entityId || null, entityLabel || null]
    );
    await execute(`UPDATE admins SET last_activity_at = NOW() WHERE id = ?`, [tenantId]).catch(() => {});
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

