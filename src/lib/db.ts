import Dexie, { type Table } from "dexie";

export interface Categorie {
  id?: number;
  user_id: number;
  nom: string;
  nom_ar?: string;
  icone: string;
}

export interface Produit {
  id?: number;
  user_id: number;
  nom: string;
  prix_achat: number;
  prix_vente: number;
  stock_actuel: number;
  categorie_id?: number;
}

export interface Client {
  id?: number;
  user_id: number;
  nom: string;
  telephone: string;
  total_dette: number;
}

export interface Transaction {
  id?: number;
  user_id: number;
  produit_id: number;
  client_id?: number;
  type: "cash" | "dette";
  montant_paye: number;
  reste_a_payer: number;
  quantite: number;
  timestamp: Date;
  synced?: number;
}

export interface User {
  id?: number;
  username: string;
  pin_hash: string;
  created_at: Date;
  auth_uid?: string | null;
  enc_salt?: string | null;
}

let db: MauriCarnetDB | null = null;

class MauriCarnetDB extends Dexie {
  categories!: Table<Categorie, number>;
  produits!: Table<Produit, number>;
  clients!: Table<Client, number>;
  transactions!: Table<Transaction, number>;
  users!: Table<User, number>;

  constructor() {
    super("MauriCarnetDB");
    this.version(3).stores({
      categories: "++id, nom",
      produits: "++id, nom",
      clients: "++id, nom, telephone",
      transactions: "++id, produit_id, client_id, type, timestamp, synced",
      users: "++id, &username",
    });
    this.version(4).stores({
      categories: "++id, nom, user_id",
      produits: "++id, nom, user_id",
      clients: "++id, nom, telephone, user_id",
      transactions: "++id, produit_id, client_id, type, timestamp, synced, user_id",
      users: "++id, &username",
    });
    this.version(5).stores({
      categories: "++id, nom, user_id",
      produits: "++id, &[user_id+nom], user_id",
      clients: "++id, nom, telephone, user_id",
      transactions: "++id, produit_id, client_id, type, timestamp, synced, user_id",
      users: "++id, &username",
    });
  }
}

export function getDB(): MauriCarnetDB {
  if (typeof window === "undefined") {
    throw new Error("Dexie ne peut pas être utilisé côté serveur");
  }
  if (!db) {
    db = new MauriCarnetDB();
  }
  return db;
}
