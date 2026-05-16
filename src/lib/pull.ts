import { getDB, type Produit, type Client, type Transaction } from "./db";

const LAST_PULL_KEY = "mauricarnet_last_pull";
const PULL_COOLDOWN_MS = 30_000;

export async function pullUserData(localUserId: number, jwt: string): Promise<void> {
  const db = getDB();
  const lastPull = localStorage.getItem(LAST_PULL_KEY);
  if (lastPull && Date.now() - parseInt(lastPull) < PULL_COOLDOWN_MS) return;

  try {
    const res = await fetch("/api/data/pull", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return;

    const data = await res.json();

    if (data.categories?.length > 0) {
      for (const cat of data.categories) {
        await db.categories.put({ ...cat, id: cat.id });
      }
    }

    if (data.produits?.length > 0) {
      for (const p of data.produits) {
        await db.produits.put({ ...p, id: p.id, user_id: localUserId } as Produit);
      }
    }

    if (data.clients?.length > 0) {
      for (const c of data.clients) {
        await db.clients.put({ ...c, id: c.id, user_id: localUserId } as Client);
      }
    }

    if (data.transactions?.length > 0) {
      for (const t of data.transactions) {
        const existing = await db.transactions.where("id").equals(t.id).first();
        if (!existing || existing.synced === 1) {
          await db.transactions.put({
            ...t,
            id: t.id,
            user_id: localUserId,
            synced: 1,
            timestamp: new Date(t.timestamp),
          } as Transaction);
        }
      }
    }

    localStorage.setItem(LAST_PULL_KEY, String(Date.now()));
  } catch (err) {
    console.error("Échec pull data:", err);
  }
}
