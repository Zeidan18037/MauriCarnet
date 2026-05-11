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

const LOGIN_ATTEMPT_KEY = "mauricarnet_login_attempts";

export function checkLoginRateLimit(username: string): number {
  try {
    const data = JSON.parse(localStorage.getItem(LOGIN_ATTEMPT_KEY) || "{}");
    const entry = data[username];
    if (!entry) return 0;
    if (Date.now() - entry.last > 300000) {
      delete data[username];
      localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(data));
      return 0;
    }
    if (entry.count >= 3) {
      const wait = Math.min(60, Math.pow(2, entry.count - 3));
      const elapsed = (Date.now() - entry.last) / 1000;
      if (elapsed < wait) return Math.ceil(wait - elapsed);
    }
    return 0;
  } catch {
    return 0;
  }
}

export function recordLoginAttempt(username: string, success: boolean): void {
  try {
    const data = JSON.parse(localStorage.getItem(LOGIN_ATTEMPT_KEY) || "{}");
    if (success) {
      delete data[username];
    } else {
      const entry = data[username] || { count: 0, last: 0 };
      entry.count++;
      entry.last = Date.now();
      data[username] = entry;
    }
    localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(data));
  } catch {}
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const hash = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${salt}:${hash}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (stored.includes(":")) {
    const [salt, expected] = stored.split(":");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
      key, 256
    );
    const hash = Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hash === expected;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "-mauricarnet-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === stored;
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
  const wait = checkLoginRateLimit(username);
  if (wait > 0) throw new Error(`Trop de tentatives. Réessayez dans ${wait} seconde(s).`);

  const user = await d().users.where("username").equals(username).first();
  if (!user) {
    recordLoginAttempt(username, false);
    return null;
  }

  const ok = await verifyPin(pin, user.pin_hash);
  if (!ok) {
    recordLoginAttempt(username, false);
    return null;
  }

  recordLoginAttempt(username, true);

  if (!user.pin_hash.includes(":")) {
    const newHash = await hashPin(pin);
    await d().users.update(user.id!, { pin_hash: newHash });
  }

  return user;
}

export async function getUsersCount(): Promise<number> {
  return d().users.count();
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export function getSessionTimeout(): number {
  return SESSION_TIMEOUT_MS;
}

export function getCurrentSession(): { id: number; username: string } | null {
  try {
    const saved = localStorage.getItem("mauricarnet_user");
    if (!saved) return null;
    const session = JSON.parse(saved);
    if (session && typeof session.id === "number") {
      const stored = localStorage.getItem("mauricarnet_session_start");
      if (stored && Date.now() - parseInt(stored) > SESSION_TIMEOUT_MS) {
        localStorage.removeItem("mauricarnet_user");
        localStorage.removeItem("mauricarnet_session_start");
        return null;
      }
      return { id: session.id, username: session.username };
    }
    return null;
  } catch {
    return null;
  }
}
