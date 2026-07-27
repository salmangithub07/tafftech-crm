-- =====================================================================
-- Nova CRM — migration v4 (Bills & Invoices module)
-- Safe to run on existing databases (MySQL or PostgreSQL).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. bills
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  bill_number VARCHAR(50) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(100),
  customer_address TEXT,
  bill_date DATE NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'credit', 'other')),
  notes TEXT,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS bills_tenant_idx ON bills(tenant_id);
CREATE INDEX IF NOT EXISTS bills_customer_idx ON bills(customer_id);

-- ---------------------------------------------------------------------
-- 2. bill_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS bill_items_bill_idx ON bill_items(bill_id);
