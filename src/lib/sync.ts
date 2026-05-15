import { getTransactionsNonSynced, marquerSyncede, getProduits, getClients } from "./crud";

function getJwt(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("mauricarnet_jwt") || "";
}

function hasJwt(): boolean {
  return !!getJwt();
}

export async function synchroniser(userId: number): Promise<{ ok: number; echec: number }> {
  const [transactions, produits, clients] = await Promise.all([
    getTransactionsNonSynced(userId),
    getProduits(userId),
    getClients(userId),
  ]);
  if (transactions.length === 0 && produits.length === 0 && clients.length === 0) return { ok: 0, echec: 0 };

  const jwt = getJwt();
  if (!jwt) return { ok: 0, echec: transactions.length };

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: localStorage.getItem("mauricarnet_username") || undefined,
        userId,
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

    return { ok: result.syncedIds?.length || 0, echec: transactions.length - (result.syncedIds?.length || 0) };
  } catch (err) {
    console.error("Échec sync réseau", err);
    return { ok: 0, echec: transactions.length };
  }
}

export async function synchroniserUtilisateur(username: string): Promise<void> {
  const jwt = getJwt();
  if (!jwt && !hasJwt()) return;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("mauricarnet_api_token") ||
        localStorage.getItem("API_SYNC_TOKEN") ||
        ""
      : "";

  try {
    const authHeader = jwt ? `Bearer ${jwt}` : `Bearer ${token}`;
    await fetch("/api/sync/user", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Échec sync utilisateur", username, err);
  }
}
