-- ============================================================
-- MinGen CSM — Schema Migration
-- Employee Directory + Provisioned Access + Permissions Layer
-- Run this once in phpMyAdmin on the mingen_csm database
-- ============================================================

-- ----------------------------------------------------------------
-- STEP 1: Create employee_directory
-- Stores the raw employee records (no login access by default)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_directory (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50)  NOT NULL UNIQUE,   -- company employee number
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) DEFAULT NULL,       -- plain text from HR record (hashed on provisioning)
    position    VARCHAR(100) DEFAULT NULL,
    department  VARCHAR(100) DEFAULT NULL,
    office      VARCHAR(100) DEFAULT NULL,       -- text mirror of HR record
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If the table already exists from a previous migration run, add the column manually:
ALTER TABLE employee_directory ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT NULL;

-- ----------------------------------------------------------------
-- STEP 2: Add provisioning columns to users
-- is_provisioned  → distinguishes new employee accounts from old ones
-- employee_id     → links back to the directory record (NULL for old accounts)
-- ----------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_provisioned TINYINT(1)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS employee_id    INT          NULL DEFAULT NULL,
    ADD CONSTRAINT fk_users_employee
        FOREIGN KEY (employee_id)
        REFERENCES employee_directory(id)
        ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- STEP 3: Create user_offices (multi-office access junction table)
-- Only used for provisioned employees
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_offices (
    user_id     INT NOT NULL,
    office_id   INT NOT NULL,
    PRIMARY KEY (user_id, office_id),
    CONSTRAINT fk_uo_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT fk_uo_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------
-- STEP 4: Create user_permissions (one row per permission per user)
-- Only used for provisioned employees
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_permissions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT         NOT NULL,
    permission  VARCHAR(50) NOT NULL,
    UNIQUE KEY unique_user_perm (user_id, permission),
    CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------
-- STEP 5: Clean up old admin-management accounts
-- These were created by the old admin-management page (role = 'admin')
-- super_admin and office/manager accounts are untouched
-- ----------------------------------------------------------------
DELETE FROM users WHERE role = 'admin';

-- ----------------------------------------------------------------
-- DONE.
-- Verify with:
--   SHOW TABLES;
--   DESCRIBE users;
--   DESCRIBE employee_directory;
--   DESCRIBE user_offices;
--   DESCRIBE user_permissions;
-- ----------------------------------------------------------------
