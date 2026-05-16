import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf-8');
function getEnv(key) {
  for (const line of envLocal.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k === key) return v;
  }
  return null;
}

const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

// Try session pooler (port 6543) with JWT auth (service_role key as password)
const pool = new pg.Pool({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.wifexlqxaoqowleoqmbb',
  password: serviceRoleKey,
  ssl: { rejectUnauthorized: false },
});

const sql = `
-- Migration 006: Add admin role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Admin RLS: bypass for admin role on all data tables
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_produits" ON produits;
CREATE POLICY "admin_all_produits" ON produits
  FOR ALL USING (auth.jwt()->>'role' = 'admin');

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_clients" ON clients;
CREATE POLICY "admin_all_clients" ON clients
  FOR ALL USING (auth.jwt()->>'role' = 'admin');

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_transactions" ON transactions;
CREATE POLICY "admin_all_transactions" ON transactions
  FOR ALL USING (auth.jwt()->>'role' = 'admin');

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_categories" ON categories;
CREATE POLICY "admin_all_categories" ON categories
  FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- Update existing RLS policies to also allow admin reads
DROP POLICY IF EXISTS "lecture produits" ON produits;
DROP POLICY IF EXISTS "ecriture produits" ON produits;
CREATE POLICY "user_access_produits" ON produits
  FOR SELECT USING (auth.uid() IS NOT NULL OR auth.jwt()->>'role' = 'admin');
CREATE POLICY "user_insert_produits" ON produits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lecture clients" ON clients;
DROP POLICY IF EXISTS "ecriture clients" ON clients;
CREATE POLICY "user_access_clients" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL OR auth.jwt()->>'role' = 'admin');
CREATE POLICY "user_insert_clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lecture transactions" ON transactions;
DROP POLICY IF EXISTS "ecriture transactions" ON transactions;
CREATE POLICY "user_access_transactions" ON transactions
  FOR SELECT USING (auth.uid() IS NOT NULL OR auth.jwt()->>'role' = 'admin');
CREATE POLICY "user_insert_transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
`;

try {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Migration executed successfully');

    const { rows } = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    if (rows.length > 0) {
      console.log('Verified: role column:', rows[0]);
    }
  } finally {
    client.release();
  }
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
