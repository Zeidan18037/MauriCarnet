import { getTransactionsNonSynced, marquerSyncede } from "./crud";

export async function synchroniser(userId: number): Promise<{ ok: number; echec: number }> {
  const transactions = await getTransactionsNonSynced(userId);
  if (transactions.length === 0) return { ok: 0, echec: 0 };

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("mauricarnet_api_token") ||
        localStorage.getItem("API_SYNC_TOKEN") ||
        ""
      : "";
  if (!token) return { ok: 0, echec: transactions.length };

  const username = localStorage.getItem("mauricarnet_username") || undefined;

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        username,
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
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("mauricarnet_api_token") || ""
        : "";
    if (!token) return;
    await fetch("/api/sync/user", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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
