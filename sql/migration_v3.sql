-- =====================================================================
-- Nova CRM — migration v3 (Balance Sheet module)
-- Safe to run on a database that already has v1 or v2 (migration_v2.sql)
-- applied. This only ADDS new tables — nothing existing is touched.
--   mysql -u root crm_db < sql/migration_v3.sql
-- =====================================================================

-- 1. Ledger accounts — Cash / Bank / Creditors / Debtors
CREATE TABLE IF NOT EXISTS `ledger_accounts` (
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

-- 2. Ledger transactions — every increase/decrease after the opening balance
CREATE TABLE IF NOT EXISTS `ledger_transactions` (
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

-- 3. Fixed assets — machinery etc.
CREATE TABLE IF NOT EXISTS `fixed_assets` (
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

-- Nothing to backfill — every Admin simply starts with an empty Balance Sheet
-- and adds their Cash/Bank/Creditor/Debtor accounts (with opening balances)
-- and Fixed Assets from the new "Balance Sheet" page themselves.
