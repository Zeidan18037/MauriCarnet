-- ============================================================
-- Schéma MauriCarnet — À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- Table Utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL DEFAULT '',
  auth_uid UUID UNIQUE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Catégories
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nom TEXT NOT NULL,
  nom_ar TEXT,
  icone TEXT NOT NULL DEFAULT '📦',
  user_id BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Produits
CREATE TABLE IF NOT EXISTS produits (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL DEFAULT 0,
  categorie_id BIGINT REFERENCES categories(id),
  nom TEXT NOT NULL,
  prix_achat NUMERIC(10,2) NOT NULL DEFAULT 0,
  prix_vente NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_actuel INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, nom)
);

-- Table Clients
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL DEFAULT 0,
  nom TEXT NOT NULL,
  telephone TEXT,
  total_dette NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL DEFAULT 0,
  produit_id BIGINT REFERENCES produits(id),
  client_id BIGINT REFERENCES clients(id),
  type TEXT NOT NULL CHECK (type IN ('cash', 'dette')),
  montant_paye NUMERIC(10,2) NOT NULL DEFAULT 0,
  reste_a_payer NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantite INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_produit ON transactions(produit_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_produits_user ON produits(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Users : accessible uniquement via service_role (API)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Catégories : tout le monde peut lire
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lecture categories" ON categories;
CREATE POLICY "lecture categories" ON categories FOR SELECT USING (true);

-- Produits : isolation par user_id
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lecture produits" ON produits;
DROP POLICY IF EXISTS "ecriture produits" ON produits;
CREATE POLICY "lecture produits" ON produits
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ecriture produits" ON produits
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Clients : isolation par user_id
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lecture clients" ON clients;
DROP POLICY IF EXISTS "ecriture clients" ON clients;
CREATE POLICY "lecture clients" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ecriture clients" ON clients
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Transactions : isolation par user_id
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ecriture transactions" ON transactions;
DROP POLICY IF EXISTS "lecture transactions" ON transactions;
CREATE POLICY "lecture transactions" ON transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ecriture transactions" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
