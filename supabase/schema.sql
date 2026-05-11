-- ============================================================
-- Schéma MauriCarnet — À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- Table Utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Catégories
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nom TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT '📦',
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
  icone TEXT NOT NULL DEFAULT '📦',
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_produit ON transactions(produit_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_produits_user ON produits(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Users : pas de RLS (accessible uniquement via api/sync/user avec service_role)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ✅ RLS sur categories : lecture seule pour pull
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acces total categories" ON categories;
CREATE POLICY "lecture categories" ON categories FOR SELECT USING (true);

-- ✅ RLS sur produits : lecture seule pour pull
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acces total produits" ON produits;
CREATE POLICY "lecture produits" ON produits FOR SELECT USING (true);

-- ✅ RLS sur clients : anon bloqué (lecture/écriture via sync locale uniquement)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acces total clients" ON clients;
-- Aucune politique = tout bloqué pour la clé anon

-- ✅ RLS sur transactions : écriture seule pour push
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acces total transactions" ON transactions;
CREATE POLICY "ecriture transactions" ON transactions FOR INSERT WITH CHECK (true);
