-- ============================================================
-- Migration 002 : Supabase Auth + RLS sécurisées
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- 1. Ajout de auth_uid dans users
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_uid UUID UNIQUE DEFAULT NULL;
ALTER TABLE users ALTER COLUMN pin_hash SET DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid);

-- 2. Ajout nom_ar + user_id dans categories (si pas déjà présents)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS nom_ar TEXT DEFAULT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 0;

-- 3. RLS : users — pas de politique = bloqué pour anon (inchangé, déjà correct)

-- 4. RLS : produits — accessible aux utilisateurs authentifiés
DROP POLICY IF EXISTS "Acces total produits" ON produits;
DROP POLICY IF EXISTS "lecture produits" ON produits;
CREATE POLICY "lecture produits" ON produits
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ecriture produits" ON produits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. RLS : clients — accessible aux utilisateurs authentifiés
DROP POLICY IF EXISTS "Acces total clients" ON clients;
DROP POLICY IF EXISTS "lecture clients" ON clients;
CREATE POLICY "lecture clients" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ecriture clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 6. RLS : transactions — authentifié requis (au lieu de WITH CHECK true)
DROP POLICY IF EXISTS "Acces total transactions" ON transactions;
DROP POLICY IF EXISTS "ecriture transactions" ON transactions;
CREATE POLICY "lecture transactions" ON transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ecriture transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
