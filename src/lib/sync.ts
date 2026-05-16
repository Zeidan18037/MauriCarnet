import { getTransactionsNonSynced, marquerSyncede, getProduitsNonSynced, getClientsNonSynced, getCategoriesNonSynced, marquerSyncedeProduit, marquerSyncedeClient, marquerSyncedeCategorie, getUsersPendingSync, updateUserAuthUid } from "./crud";
import { getValidJwt } from "./refresh";
import { getDB } from "./db";

export async function syncPendingUsers(): Promise<void> {
  const pending = await getUsersPendingSync();
  if (pending.length === 0) return;
  const jwt = await getValidJwt();
  if (!jwt) return;
  for (const u of pending) {
    const pin = localStorage.getItem(`mauricarnet_pin_${u.username}`);
    if (!pin) continue;
    try {
      const res = await fetch("/api/sync/user", {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: u.id,
          username: u.username,
          pin,
          pin_hash: u.pin_hash,
          enc_salt: u.enc_salt,
          created_at: u.created_at.toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.auth_uid) {
          await updateUserAuthUid(u.id!, data.auth_uid);
        }
        localStorage.removeItem(`mauricarnet_pin_${u.username}`);
      }
    } catch (err) {
      console.error("Échec sync utilisateur", u.username, err);
    }
  }
}

export async function synchroniser(localUserId: number): Promise<{ ok: number; echec: number }> {
  const jwt = await getValidJwt();
  if (!jwt) return { ok: 0, echec: 0 };

  const [transactions, produits, clients, categories] = await Promise.all([
    getTransactionsNonSynced(localUserId),
    getProduitsNonSynced(localUserId),
    getClientsNonSynced(localUserId),
    getCategoriesNonSynced(localUserId),
  ]);
  if (transactions.length === 0 && produits.length === 0 && clients.length === 0 && categories.length === 0) return { ok: 0, echec: 0 };

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        produits: produits.map((p) => ({
          id: p.id,
          nom: p.nom,
          prix_achat: p.prix_achat,
          prix_vente: p.prix_vente,
          stock_actuel: p.stock_actuel,
          categorie_id: p.categorie_id,
        })),
        clients: clients.map((c) => ({
          id: c.id,
          nom: c.nom,
          telephone: c.telephone,
          total_dette: c.total_dette,
        })),
        transactions: transactions.map((t) => ({
          id: t.id,
          produit_id: t.produit_id,
          client_id: t.client_id,
          type: t.type,
          montant_paye: t.montant_paye,
          reste_a_payer: t.reste_a_payer,
          quantite: t.quantite,
          timestamp: t.timestamp.toISOString(),
        })),
        categories: categories.map((c) => ({
          id: c.id,
          nom: c.nom,
          nom_ar: c.nom_ar,
          icone: c.icone,
        })),
      }),
    });

    if (!res.ok) {
      console.error("Échec sync", res.status, await res.text());
      return { ok: 0, echec: transactions.length };
    }

    const result = await res.json();
    if (result.syncedIds) {
      for (const id of result.syncedIds) {
        await marquerSyncede(id);
      }
    }
    for (const p of produits) {
      if (p.id) await marquerSyncedeProduit(p.id);
    }
    for (const c of clients) {
      if (c.id) await marquerSyncedeClient(c.id);
    }
    for (const c of categories) {
      if (c.id) await marquerSyncedeCategorie(c.id);
    }

    return { ok: (result.syncedIds?.length || 0) + produits.length + clients.length + categories.length, echec: 0 };
  } catch (err) {
    console.error("Échec sync réseau", err);
    return { ok: 0, echec: transactions.length };
  }
}

export async function synchroniserUtilisateur(username: string, pin?: string, enc_salt?: string): Promise<void> {
  const jwt = await getValidJwt();
  if (!jwt) return;

  try {
    const u = await getDB().users.where("username").equals(username).first();
    await fetch("/api/sync/user", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: u?.id,
        username,
        pin,
        enc_salt,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Échec sync utilisateur", username, err);
  }
}
