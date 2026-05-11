import { getDB, type Categorie, type Produit, type Client, type Transaction, type User } from "./db";

function d() {
  return getDB();
}

/* ───── Migration ───── */

export async function migrerAnciennesDonnees(userId: number): Promise<void> {
  await d().transaction("rw", d().produits, d().clients, d().transactions, d().categories, async () => {
    for (const table of [d().produits, d().clients, d().transactions, d().categories]) {
      const orphaned = await table.filter((r: any) => r.user_id === undefined || r.user_id === 0).toArray();
      for (const item of orphaned) {
        await table.update(item.id!, { user_id: userId } as any);
      }
    }
  });
}

/* ───── Produits ───── */

export async function getProduits(userId: number): Promise<Produit[]> {
  return d().produits.where("user_id").equals(userId).toArray();
}

export async function getProduit(id: number): Promise<Produit | undefined> {
  return d().produits.get(id);
}

export async function ajouterProduit(
  p: Omit<Produit, "id"> & { user_id: number }
): Promise<number> {
  return d().produits.add(p as Produit);
}

export async function modifierProduit(
  id: number,
  p: Partial<Produit>
): Promise<number> {
  return d().produits.update(id, p);
}

export async function supprimerProduit(id: number): Promise<void> {
  return d().produits.delete(id);
}

/* ───── Clients ───── */

export async function getClients(userId: number): Promise<Client[]> {
  return d().clients.where("user_id").equals(userId).toArray();
}

export async function getClient(id: number): Promise<Client | undefined> {
  return d().clients.get(id);
}

export async function ajouterClient(
  c: Omit<Client, "id"> & { user_id: number }
): Promise<number> {
  return d().clients.add(c as Client);
}

export async function modifierClient(
  id: number,
  c: Partial<Client>
): Promise<number> {
  return d().clients.update(id, c);
}

export async function supprimerClient(id: number): Promise<void> {
  return d().clients.delete(id);
}

export async function chercherClients(
  query: string,
  userId: number
): Promise<Client[]> {
  if (!query) return [];
  return d()
    .clients
    .where("user_id").equals(userId)
    .filter((c) => c.nom.toLowerCase().includes(query.toLowerCase()))
    .toArray();
}

/* ───── Catégories ───── */

export const CATEGORIES_PAR_DEFAUT: Omit<Categorie, "id">[] = [
  { nom: "Général", icone: "📦", user_id: 0 },
  { nom: "Fruits & Légumes", icone: "🍎🍌🥕", user_id: 0 },
  { nom: "Boissons", icone: "🥤🧃☕", user_id: 0 },
  { nom: "Lait & Fromage", icone: "🥛🧀", user_id: 0 },
  { nom: "Pain & Boulangerie", icone: "🍞🥖🥐", user_id: 0 },
  { nom: "Épicerie", icone: "🍚🧂🫘", user_id: 0 },
  { nom: "Hygiène & Beauté", icone: "🧴🪥🧼", user_id: 0 },
  { nom: "Ménage", icone: "🧹🧽", user_id: 0 },
  { nom: "Outils", icone: "🔧🔨🪛", user_id: 0 },
  { nom: "Snacks & Sucreries", icone: "🍬🍫🍪", user_id: 0 },
  { nom: "Surgelés", icone: "❄️🥩🧊", user_id: 0 },
];

export async function getCategories(userId: number): Promise<Categorie[]> {
  return d().categories.where("user_id").equals(userId).toArray();
}

export async function seedCategoriesIfEmpty(userId: number): Promise<void> {
  const count = await d().categories.where("user_id").equals(userId).count();
  if (count > 0) return;
  for (const c of CATEGORIES_PAR_DEFAUT) {
    await d().categories.add({ ...c, user_id: userId } as Categorie);
  }
}

/* ───── Stock ───── */

export async function verifierStock(
  produit_id: number,
  quantite: number
): Promise<boolean> {
  if (quantite <= 0) return false;
  const p = await d().produits.get(produit_id);
  if (!p) return false;
  return p.stock_actuel >= quantite;
}

/* ───── Transactions ───── */

export async function getTransactions(userId: number): Promise<Transaction[]> {
  return d()
    .transactions
    .where("user_id").equals(userId)
    .reverse()
    .sortBy("timestamp");
}

export async function getTransaction(
  id: number
): Promise<Transaction | undefined> {
  return d().transactions.get(id);
}

export async function ajouterTransaction(
  t: Omit<Transaction, "id" | "synced"> & { user_id: number }
): Promise<number> {
  if (t.produit_id && t.quantite > 0) {
    const p = await d().produits.get(t.produit_id);
    if (!p) throw new Error("Produit introuvable");
    if (p.stock_actuel < t.quantite)
      throw new Error(
        `Stock insuffisant. Disponible: ${p.stock_actuel}, demandé: ${t.quantite}`
      );
  }

  return d().transaction(
    "rw",
    d().transactions,
    d().produits,
    d().clients,
    async () => {
      const id = await d().transactions.add({ ...t, synced: 0 } as Transaction);

      if (t.produit_id && t.quantite > 0) {
        const p = await d().produits.get(t.produit_id);
        if (p) {
          await d().produits.update(t.produit_id, {
            stock_actuel: p.stock_actuel - t.quantite,
          });
        }
      }

      if (t.type === "dette" && t.client_id && t.reste_a_payer > 0) {
        const c = await d().clients.get(t.client_id);
        if (c) {
          await d().clients.update(t.client_id, {
            total_dette: (c.total_dette || 0) + t.reste_a_payer,
          });
        }
      }

      return id;
    }
  );
}

export async function modifierTransaction(
  id: number,
  t: Partial<Transaction>
): Promise<number> {
  return d().transactions.update(id, t);
}

export async function supprimerTransaction(id: number): Promise<void> {
  const old = await d().transactions.get(id);
  if (!old) return;

  await d().transaction(
    "rw",
    d().transactions,
    d().produits,
    d().clients,
    async () => {
      await d().transactions.delete(id);

      if (old.produit_id && old.quantite > 0) {
        const p = await d().produits.get(old.produit_id);
        if (p) {
          await d().produits.update(old.produit_id, {
            stock_actuel: p.stock_actuel + old.quantite,
          });
        }
      }

      if (old.type === "dette" && old.client_id && old.reste_a_payer > 0) {
        const c = await d().clients.get(old.client_id);
        if (c) {
          await d().clients.update(old.client_id, {
            total_dette: Math.max(0, (c.total_dette || 0) - old.reste_a_payer),
          });
        }
      }
    }
  );
}

export async function getTransactionsNonSynced(userId: number): Promise<Transaction[]> {
  return d()
    .transactions
    .where("user_id").equals(userId)
    .filter((t) => t.synced === 0)
    .toArray();
}

export async function marquerSyncede(id: number): Promise<number> {
  return d().transactions.update(id, { synced: 1 } as Partial<Transaction>);
}

/* ───── Dettes ───── */

export async function recalculerDettes(userId: number): Promise<void> {
  const transactions = await d()
    .transactions
    .where("user_id").equals(userId)
    .toArray();
  const clients = await d()
    .clients
    .where("user_id").equals(userId)
    .toArray();

  for (const client of clients) {
    const total = transactions
      .filter((t) => t.client_id === client.id && t.type === "dette")
      .reduce((sum, t) => sum + (t.reste_a_payer || 0), 0);
    await d().clients.update(client.id!, { total_dette: total });
  }
}

/* ───── Auth ───── */

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "-mauricarnet-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function registerUser(
  username: string,
  pin: string
): Promise<User> {
  const existant = await d().users.where("username").equals(username).first();
  if (existant) throw new Error("Ce nom d'utilisateur est déjà pris");
  const pin_hash = await hashPin(pin);
  const id = await d().users.add({
    username,
    pin_hash,
    created_at: new Date(),
  } as User);
  return { id, username, pin_hash, created_at: new Date() };
}

export async function loginUser(
  username: string,
  pin: string
): Promise<User | null> {
  const user = await d().users.where("username").equals(username).first();
  if (!user) return null;
  const pin_hash = await hashPin(pin);
  if (user.pin_hash !== pin_hash) return null;
  return user;
}

export async function getUsersCount(): Promise<number> {
  return d().users.count();
}
