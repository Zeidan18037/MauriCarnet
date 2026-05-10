import Dexie, { type Table } from "dexie";

export interface Produit {
  id?: number;
  nom: string;
  prix_achat: number;
  prix_vente: number;
  stock_actuel: number;
  icone: string;
}

export interface Client {
  id?: number;
  nom: string;
  telephone: string;
  total_dette: number;
}

export interface Transaction {
  id?: number;
  produit_id: number;
  client_id?: number;
  type: "cash" | "dette";
  montant_paye: number;
  reste_a_payer: number;
  timestamp: Date;
  synced: number;
}

class MauriCarnetDB extends Dexie {
  produits!: Table<Produit, number>;
  clients!: Table<Client, number>;
  transactions!: Table<Transaction, number>;

  constructor() {
    super("MauriCarnetDB");
    this.version(1).stores({
      produits: "++id, nom",
      clients: "++id, nom, telephone",
      transactions: "++id, produit_id, client_id, type, timestamp, synced",
    });
  }
}

export const db = new MauriCarnetDB();
