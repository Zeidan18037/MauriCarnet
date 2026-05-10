import { db, type Produit, type Client, type Transaction } from "./db";

/* ───── Produits ───── */

export async function getProduits(): Promise<Produit[]> {
  return db.produits.toArray();
}

export async function getProduit(id: number): Promise<Produit | undefined> {
  return db.produits.get(id);
}

export async function ajouterProduit(p: Omit<Produit, "id">): Promise<number> {
  return db.produits.add(p);
}

export async function modifierProduit(id: number, p: Partial<Produit>): Promise<number> {
  return db.produits.update(id, p);
}

export async function supprimerProduit(id: number): Promise<void> {
  return db.produits.delete(id);
}

/* ───── Clients ───── */

export async function getClients(): Promise<Client[]> {
  return db.clients.toArray();
}

export async function getClient(id: number): Promise<Client | undefined> {
  return db.clients.get(id);
}

export async function ajouterClient(c: Omit<Client, "id">): Promise<number> {
  return db.clients.add(c);
}

export async function modifierClient(id: number, c: Partial<Client>): Promise<number> {
  return db.clients.update(id, c);
}

export async function supprimerClient(id: number): Promise<void> {
  return db.clients.delete(id);
}

/* ───── Transactions ───── */

export async function getTransactions(): Promise<Transaction[]> {
  return db.transactions.toArray();
}

export async function getTransaction(id: number): Promise<Transaction | undefined> {
  return db.transactions.get(id);
}

export async function ajouterTransaction(t: Omit<Transaction, "id">): Promise<number> {
  return db.transactions.add({ ...t, synced: 0 });
}

export async function getTransactionsNonSynced(): Promise<Transaction[]> {
  return db.transactions.where("synced").equals(0).toArray();
}

export async function marquerSyncede(id: number): Promise<number> {
  return db.transactions.update(id, { synced: 1 });
}
