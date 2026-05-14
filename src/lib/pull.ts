import { getDB, type Produit, type Client, type Transaction } from "./db";

export async function pullUserData(userId: number, jwt: string): Promise<void> {
  const db = getDB();

  const existingProduits = await db.produits.where("user_id").equals(userId).count();
  if (existingProduits > 0) return;

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
        await db.produits.put({ ...p, id: p.id, user_id: userId } as Produit);
      }
    }

    if (data.clients?.length > 0) {
      for (const c of data.clients) {
        await db.clients.put({ ...c, id: c.id, user_id: userId } as Client);
      }
    }

    if (data.transactions?.length > 0) {
      for (const t of data.transactions) {
        await db.transactions.put({
          ...t,
          id: t.id,
          user_id: userId,
          synced: 1,
          timestamp: new Date(t.timestamp),
        } as Transaction);
      }
    }
  } catch (err) {
    console.error("Échec pull data:", err);
  }
}
