-- ==================================================
-- EPASS TOLL MANAGER - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ==================================================

-- ==================================================
-- USERS TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS users (
  phone_number TEXT PRIMARY KEY,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on telegram_chat_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);

-- ==================================================
-- SETTINGS TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  whitelisted_phones TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
  last_checked_timestamp TIMESTAMPTZ
);

-- Insert default settings
INSERT INTO settings (id, whitelisted_phones, last_checked_timestamp)
VALUES (1, ARRAY['+84376586716'], NULL)
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- OTP TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS otps (
  phone_number TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index to auto-delete expired OTPs
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- ==================================================
-- ROW LEVEL SECURITY (RLS)
-- ==================================================
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- Users table: Allow service role full access, anon read-only
CREATE POLICY "Service role can manage users" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous can read users" ON users
  FOR SELECT
  TO anon
  USING (true);

-- Settings table: Allow service role full access, anon read-only
CREATE POLICY "Service role can manage settings" ON settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous can read settings" ON settings
  FOR SELECT
  TO anon
  USING (true);

-- OTP table: Allow service role full access only
CREATE POLICY "Service role can manage otps" ON otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================================================
-- FUNCTION TO CLEANUP EXPIRED OTPs
-- ==================================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otps WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- GRANT PERMISSIONS
-- ==================================================
-- Grant necessary permissions to anon and service_role
GRANT USAGE ON SCHEMA public TO anon, service_role;
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO anon;
GRANT ALL ON settings TO service_role;
GRANT SELECT ON settings TO anon;
GRANT ALL ON otps TO service_role;

-- ==================================================
-- MIGRATE EXISTING DATA FROM JSON (if needed)
-- ==================================================
-- After running this SQL, you can migrate existing data by:
-- 1. Export your data/users.json content
-- 2. Run INSERT statements for each user
-- 3. Update settings with your whitelisted phones

-- Example migration (replace with your actual data):
-- INSERT INTO users (phone_number, telegram_chat_id, created_at)
-- VALUES ('+84376586716', '123456789', '2024-01-01T00:00:00Z')
-- ON CONFLICT (phone_number) DO NOTHING;
