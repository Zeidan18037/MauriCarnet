-- Migration 003 : Stockage du sel de chiffrement pour support multi-appareils
ALTER TABLE users ADD COLUMN IF NOT EXISTS enc_salt TEXT DEFAULT NULL;
