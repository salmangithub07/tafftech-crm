-- =====================================================================
-- Nova CRM — PostgreSQL schema (for Neon / Vercel Postgres / any Postgres)
-- Run this once against a fresh, empty database. In the Neon console:
-- SQL Editor → paste this whole file → Run. Or via psql:
--   psql "$DATABASE_URL" -f sql/schema.postgres.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: auto-update `updated_at` columns (Postgres has no built-in
-- "ON UPDATE CURRENT_TIMESTAMP" like MySQL — a trigger does the same job)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- admins  (super_admin / admin / executive — one table, role-based)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS admins CASCADE;
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'admin', 'executive')),
  tenant_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  permissions VARCHAR(500), -- JSON array of modules an executive can access
  page_size INTEGER NOT NULL DEFAULT 10,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admins_tenant_idx ON admins(tenant_id);
CREATE TRIGGER admins_set_updated_at BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  product VARCHAR(300),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  notes TEXT,
  status VARCHAR(10) NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'inactive')),
  visited SMALLINT NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX customers_tenant_idx ON customers(tenant_id);
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS appointments CASCADE;
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title VARCHAR(150),
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  remarks TEXT,
  status VARCHAR(10) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX appointments_tenant_idx ON appointments(tenant_id);
CREATE INDEX appointments_customer_idx ON appointments(customer_id);
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS quotations CASCADE;
CREATE TABLE quotations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quotation_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  quotation_status VARCHAR(10) NOT NULL DEFAULT 'pending'
    CHECK (quotation_status IN ('pending', 'accepted', 'rejected')),
  notes TEXT,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX quotations_tenant_idx ON quotations(tenant_id);

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX products_tenant_idx ON products(tenant_id);

-- ---------------------------------------------------------------------
-- stock_transactions
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS stock_transactions CASCADE;
CREATE TABLE stock_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(3) NOT NULL CHECK (type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  note TEXT,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX stock_tenant_idx ON stock_transactions(tenant_id);
CREATE INDEX stock_product_idx ON stock_transactions(product_id);

-- ---------------------------------------------------------------------
-- social_platforms  (per-tenant, editable list for Analytics)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS social_platforms CASCADE;
CREATE TABLE social_platforms (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  platform_name VARCHAR(100) NOT NULL
);
CREATE INDEX platforms_tenant_idx ON social_platforms(tenant_id);

-- ---------------------------------------------------------------------
-- analytics  (per-executive, per-platform performance log)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS analytics CASCADE;
CREATE TABLE analytics (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  executive_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES social_platforms(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  post_reference VARCHAR(255),
  enquiries INTEGER NOT NULL DEFAULT 0,
  total_posts INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  total_likes INTEGER NOT NULL DEFAULT 0,
  total_comments INTEGER NOT NULL DEFAULT 0,
  watch_time DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  subscribers_gained INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX analytics_tenant_idx ON analytics(tenant_id);
CREATE TRIGGER analytics_set_updated_at BEFORE UPDATE ON analytics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- ledger_accounts  (Cash / Bank / Creditors / Debtors — Balance Sheet)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS ledger_accounts CASCADE;
CREATE TABLE ledger_accounts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('cash', 'bank', 'creditor', 'debtor')),
  opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  notes VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ledger_accounts_tenant_idx ON ledger_accounts(tenant_id);

-- ---------------------------------------------------------------------
-- ledger_transactions
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS ledger_transactions CASCADE;
CREATE TABLE ledger_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('increase', 'decrease')),
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255),
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ledger_transactions_tenant_idx ON ledger_transactions(tenant_id);
CREATE INDEX ledger_transactions_account_idx ON ledger_transactions(account_id);

-- ---------------------------------------------------------------------
-- fixed_assets
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS fixed_assets CASCADE;
CREATE TABLE fixed_assets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  notes VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX fixed_assets_tenant_idx ON fixed_assets(tenant_id);

-- ---------------------------------------------------------------------
-- settings  (global, product-level branding — Super Admin controlled;
-- tenant_id = 0 is the global default, any other value is that Admin's
-- own override)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS settings CASCADE;
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 0,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  UNIQUE (tenant_id, key)
);

-- =====================================================================
-- Seed data
-- =====================================================================

INSERT INTO settings (tenant_id, key, value) VALUES
  (0, 'site_name', 'Nova CRM'),
  (0, 'accent_color', '#2563eb'),
  (0, 'radius', '0.65');

-- Super Admin  → login: superadmin@novacrm.com / superadmin123
-- Admin        → login: admin@novacrm.com      / admin123
-- Executive    → login: executive@novacrm.com  / executive123
-- (passwords are bcrypt hashes of the values above — identical to the MySQL seed)
INSERT INTO admins (id, name, email, password, role, tenant_id, permissions, created_by, status) VALUES
  (1, 'Super Admin', 'superadmin@novacrm.com', '$2b$10$z5z1pGaZ/Zgm7NVoqq1DR.f.3VLA20A2YPILkUo8c5oXcKNd5Hu96', 'super_admin', NULL, NULL, NULL, 'active'),
  (2, 'Demo Admin', 'admin@novacrm.com', '$2b$10$Rpi/yaWdw93NbAzo7xvjn.oeuICNX62Jm8YMe1WAmckDkZY8ge0Ne', 'admin', NULL, NULL, 1, 'active'),
  (3, 'Demo Executive', 'executive@novacrm.com', '$2b$10$WPf2CKBnHASnMCKqL00z9.6TDpyeLmsAOMsc4xFOl8VlNBjC80kVy', 'executive', 2, '["customers","appointments","quotations"]', 2, 'active');
-- Keep the sequence in sync after inserting explicit ids
SELECT setval('admins_id_seq', (SELECT MAX(id) FROM admins));

INSERT INTO social_platforms (tenant_id, platform_name) VALUES
  (2, 'YouTube'),
  (2, 'Instagram / Facebook'),
  (2, 'WhatsApp');

INSERT INTO customers (tenant_id, name, product, phone, email, address, notes, status, visited, created_by) VALUES
  (2, 'Ayesha Khan', 'Scrubber Packing Machine', '+91 98765 43210', 'ayesha.khan@example.com', 'Pune, Maharashtra', 'Prefers WhatsApp for follow ups.', 'active', 1, 2),
  (2, 'Rohan Mehta', 'Band Sealer', '+91 91234 56780', 'rohan.mehta@example.com', 'Mumbai, Maharashtra', 'Interested in premium plan.', 'lead', 0, 3);

INSERT INTO products (tenant_id, name, sku, price) VALUES
  (2, 'Scrubber Packing Machine', 'SCPCK-01', 20000.00),
  (2, 'Band Sealer', 'BND-SLR', 4500.00);

INSERT INTO stock_transactions (tenant_id, product_id, type, quantity, note, created_by) VALUES
  (2, 1, 'in', 10, 'Initial stock', 2),
  (2, 2, 'in', 25, 'Initial stock', 2);

-- Balance Sheet demo data (Admin only)
INSERT INTO ledger_accounts (tenant_id, name, type, opening_balance, notes) VALUES
  (2, 'Cash in Hand', 'cash', 100000.00, NULL),
  (2, 'Bank Account', 'bank', 100000.00, NULL),
  (2, 'B - Supplier', 'creditor', 10000.00, NULL),
  (2, 'A - Supplier', 'creditor', 20000.00, NULL),
  (2, 'C - Supplier', 'creditor', 60000.00, NULL),
  (2, 'D - Supplier', 'creditor', 10000.00, NULL),
  (2, 'Outstanding - Elders', 'debtor', 5000.00, NULL);

INSERT INTO fixed_assets (tenant_id, name, quantity, unit_value, notes) VALUES
  (2, 'Scrubber Machine - Auto', 2, 60000.00, NULL),
  (2, 'Scrubber Machine - Manual', 5, 20000.00, NULL);

-- Note: run this whole file fresh on an EMPTY database — it drops and
-- recreates every table. If you already have data you care about in
-- Postgres, back it up first.
