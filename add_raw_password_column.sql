-- Add raw_password column to users table
-- NULL = user has set their own password
-- NOT NULL = temp password set by admin (visible to super admin)
ALTER TABLE users ADD COLUMN raw_password VARCHAR(255) NULL AFTER password;
