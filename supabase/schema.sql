-- ============================================================
-- Schéma MauriCarnet — À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- Table Produits
CREATE TABLE produits (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nom TEXT NOT NULL,
  prix_achat NUMERIC(10,2) NOT NULL DEFAULT 0,
  prix_vente NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_actuel INTEGER NOT NULL DEFAULT 0,
  icone TEXT NOT NULL DEFAULT '📦',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Clients
CREATE TABLE clients (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nom TEXT NOT NULL,
  telephone TEXT,
  total_dette NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Transactions
CREATE TABLE transactions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  produit_id BIGINT REFERENCES produits(id),
  client_id BIGINT REFERENCES clients(id),
  type TEXT NOT NULL CHECK (type IN ('cash', 'dette')),
  montant_paye NUMERIC(10,2) NOT NULL DEFAULT 0,
  reste_a_payer NUMERIC(10,2) NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_transactions_client ON transactions(client_id);
CREATE INDEX idx_transactions_produit ON transactions(produit_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);

-- ============================================================
-- Row Level Security (RLS)
-- Obligatoire : la clé anon est publique côté client (PWA)
-- ============================================================
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Politique : accès total autorisé (mono-utilisateur V1)
-- La sécurité réelle repose sur l'authentification du endpoint /api/sync
CREATE POLICY "Acces total produits" ON produits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces total clients" ON clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acces total transactions" ON transactions
  FOR ALL USING (true) WITH CHECK (true);
