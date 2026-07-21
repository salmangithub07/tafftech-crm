-- =====================================================================
-- Nova CRM — MySQL schema
-- Run this on your `crm_db` database (phpMyAdmin > Import, or the
-- mysql CLI: `mysql -u root crm_db < schema.sql`).
--
-- Hierarchy:
--   super_admin  -> creates & manages Admins. No business data of their own.
--   admin        -> a tenant. Everything they and their executives create
--                   is scoped to them (tenant_id = admin.id).
--   executive    -> a "user" created by an Admin. Belongs to that Admin's
--                   tenant (tenant_id = admin's id). Manages customers &
--                   appointments within that tenant only.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- admins  (super_admin / admin / executive — one table, role-based)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('super_admin','admin','executive') NOT NULL DEFAULT 'admin',
  `tenant_id` INT DEFAULT NULL COMMENT 'Owning admin id — set for executives only',
  `permissions` VARCHAR(500) DEFAULT NULL COMMENT 'JSON array of modules an executive can access, e.g. ["customers","appointments"]. Ignored for admin/super_admin (they always have full tenant access).',
  `page_size` INT NOT NULL DEFAULT 10 COMMENT 'Preferred rows-per-page for list views',
  `created_by` INT DEFAULT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `admins_email_unique` (`email`),
  KEY `admins_tenant_idx` (`tenant_id`),
  CONSTRAINT `admins_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admins_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `product` VARCHAR(300) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT,
  `notes` TEXT,
  `status` ENUM('lead','active','inactive') NOT NULL DEFAULT 'lead',
  `visited` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `customers_tenant_idx` (`tenant_id`),
  CONSTRAINT `customers_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customers_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `title` VARCHAR(150) DEFAULT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME DEFAULT NULL,
  `remarks` TEXT,
  `status` ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `appointments_tenant_idx` (`tenant_id`),
  KEY `appointments_customer_idx` (`customer_id`),
  CONSTRAINT `appointments_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `quotations`;
CREATE TABLE `quotations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `appointment_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `quotation_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `quotation_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quotation_status` ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  `notes` TEXT,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `quotations_tenant_idx` (`tenant_id`),
  CONSTRAINT `quotations_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotations_appointment_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotations_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotations_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `sku` VARCHAR(100) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `products_tenant_idx` (`tenant_id`),
  CONSTRAINT `products_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- stock_transactions
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `stock_transactions`;
CREATE TABLE `stock_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `type` ENUM('in','out') NOT NULL,
  `quantity` INT NOT NULL,
  `note` TEXT,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `stock_tenant_idx` (`tenant_id`),
  KEY `stock_product_idx` (`product_id`),
  CONSTRAINT `stock_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- social_platforms  (per-tenant, editable list for Analytics)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `social_platforms`;
CREATE TABLE `social_platforms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `platform_name` VARCHAR(100) NOT NULL,
  KEY `platforms_tenant_idx` (`tenant_id`),
  CONSTRAINT `platforms_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- analytics  (per-executive, per-platform performance log)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `analytics`;
CREATE TABLE `analytics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `executive_id` INT NOT NULL,
  `platform_id` INT NOT NULL,
  `analytics_date` DATE NOT NULL,
  `post_reference` VARCHAR(255) DEFAULT NULL COMMENT 'Which post/content this row is reporting on',
  `enquiries` INT NOT NULL DEFAULT 0 COMMENT 'Number of enquiries generated by this post',
  `total_posts` INT NOT NULL DEFAULT 0,
  `total_views` INT NOT NULL DEFAULT 0,
  `total_likes` INT NOT NULL DEFAULT 0,
  `total_comments` INT NOT NULL DEFAULT 0,
  `watch_time` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subscribers_gained` INT NOT NULL DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `analytics_tenant_idx` (`tenant_id`),
  CONSTRAINT `analytics_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analytics_executive_fk` FOREIGN KEY (`executive_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analytics_platform_fk` FOREIGN KEY (`platform_id`) REFERENCES `social_platforms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- ledger_accounts  (Cash / Bank / Creditors / Debtors — Balance Sheet, Admin only)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `ledger_accounts`;
CREATE TABLE `ledger_accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL COMMENT 'e.g. "Cash in Hand", "HDFC Bank - 1234", "Ramesh Traders" (creditor)',
  `type` ENUM('cash','bank','creditor','debtor') NOT NULL,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Set once by the admin — all changes after that go through ledger_transactions',
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `ledger_accounts_tenant_idx` (`tenant_id`),
  CONSTRAINT `ledger_accounts_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- ledger_transactions  (every increase/decrease after the opening balance)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `ledger_transactions`;
CREATE TABLE `ledger_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `account_id` INT NOT NULL,
  `entry_date` DATE NOT NULL,
  `direction` ENUM('increase','decrease') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `ledger_transactions_tenant_idx` (`tenant_id`),
  KEY `ledger_transactions_account_idx` (`account_id`),
  CONSTRAINT `ledger_transactions_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ledger_transactions_account_fk` FOREIGN KEY (`account_id`) REFERENCES `ledger_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ledger_transactions_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- fixed_assets  (machinery etc. — Balance Sheet, Admin only)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `fixed_assets`;
CREATE TABLE `fixed_assets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL COMMENT 'e.g. "Scrubber Machine - Auto"',
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `fixed_assets_tenant_idx` (`tenant_id`),
  CONSTRAINT `fixed_assets_tenant_fk` FOREIGN KEY (`tenant_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- settings  (global, product-level branding — Super Admin controlled)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL DEFAULT 0 COMMENT '0 = global/product-level default (Super Admin). Otherwise an admin.id — that tenant''s own override.',
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT,
  UNIQUE KEY `settings_tenant_key` (`tenant_id`, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- Seed data
-- =====================================================================

INSERT INTO `settings` (`tenant_id`, `key`, `value`) VALUES
  (0, 'site_name', 'Nova CRM'),
  (0, 'accent_color', '#2563eb'),
  (0, 'radius', '0.65');

-- Super Admin  → login: superadmin@novacrm.com / superadmin123
-- Admin        → login: admin@novacrm.com      / admin123
-- Executive    → login: executive@novacrm.com  / executive123
-- (passwords are bcrypt hashes of the values above)
INSERT INTO `admins` (`id`, `name`, `email`, `password`, `role`, `tenant_id`, `permissions`, `created_by`, `status`) VALUES
  (1, 'Super Admin', 'superadmin@novacrm.com', '$2b$10$z5z1pGaZ/Zgm7NVoqq1DR.f.3VLA20A2YPILkUo8c5oXcKNd5Hu96', 'super_admin', NULL, NULL, NULL, 'active'),
  (2, 'Demo Admin', 'admin@novacrm.com', '$2b$10$Rpi/yaWdw93NbAzo7xvjn.oeuICNX62Jm8YMe1WAmckDkZY8ge0Ne', 'admin', NULL, NULL, 1, 'active'),
  (3, 'Demo Executive', 'executive@novacrm.com', '$2b$10$WPf2CKBnHASnMCKqL00z9.6TDpyeLmsAOMsc4xFOl8VlNBjC80kVy', 'executive', 2, '["customers","appointments","quotations"]', 2, 'active');

INSERT INTO `social_platforms` (`tenant_id`, `platform_name`) VALUES
  (2, 'YouTube'),
  (2, 'Instagram / Facebook'),
  (2, 'WhatsApp');

INSERT INTO `customers` (`tenant_id`, `name`, `product`, `phone`, `email`, `address`, `notes`, `status`, `visited`, `created_by`) VALUES
  (2, 'Ayesha Khan', 'Scrubber Packing Machine', '+91 98765 43210', 'ayesha.khan@example.com', 'Pune, Maharashtra', 'Prefers WhatsApp for follow ups.', 'active', 1, 2),
  (2, 'Rohan Mehta', 'Band Sealer', '+91 91234 56780', 'rohan.mehta@example.com', 'Mumbai, Maharashtra', 'Interested in premium plan.', 'lead', 0, 3);

INSERT INTO `products` (`tenant_id`, `name`, `sku`, `price`) VALUES
  (2, 'Scrubber Packing Machine', 'SCPCK-01', 20000.00),
  (2, 'Band Sealer', 'BND-SLR', 4500.00);

INSERT INTO `stock_transactions` (`tenant_id`, `product_id`, `type`, `quantity`, `note`, `created_by`) VALUES
  (2, 1, 'in', 10, 'Initial stock', 2),
  (2, 2, 'in', 25, 'Initial stock', 2);

-- Balance Sheet demo data (Admin only)
INSERT INTO `ledger_accounts` (`tenant_id`, `name`, `type`, `opening_balance`, `notes`) VALUES
  (2, 'Cash in Hand', 'cash', 100000.00, NULL),
  (2, 'Bank Account', 'bank', 100000.00, NULL),
  (2, 'B - Supplier', 'creditor', 10000.00, NULL),
  (2, 'A - Supplier', 'creditor', 20000.00, NULL),
  (2, 'C - Supplier', 'creditor', 60000.00, NULL),
  (2, 'D - Supplier', 'creditor', 10000.00, NULL),
  (2, 'Outstanding - Elders', 'debtor', 5000.00, NULL);

INSERT INTO `fixed_assets` (`tenant_id`, `name`, `quantity`, `unit_value`, `notes`) VALUES
  (2, 'Scrubber Machine - Auto', 2, 60000.00, NULL),
  (2, 'Scrubber Machine - Manual', 5, 20000.00, NULL);

-- Note: run this whole file fresh on an EMPTY `crm_db` database — it
-- drops and recreates every table. If you already have data you care
-- about, back it up first (phpMyAdmin > Export) before importing this.
