-- Migration 004 : Suppression FK constraints sur transactions
-- Offline-first : l'ordre d'arrivée des syncs n'est pas garanti
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_produit_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_client_id_fkey;
