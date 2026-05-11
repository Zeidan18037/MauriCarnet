import { supabase } from "./supabase";
import { getTransactionsNonSynced, marquerSyncede } from "./crud";
import { getDB, type User } from "./db";

export async function synchroniser(userId: number): Promise<{ ok: number; echec: number }> {
  const transactions = await getTransactionsNonSynced(userId);
  let ok = 0;
  let echec = 0;

  for (const t of transactions) {
    const { error } = await supabase.from("transactions").insert({
      produit_id: t.produit_id,
      client_id: t.client_id ?? null,
      type: t.type,
      montant_paye: t.montant_paye,
      reste_a_payer: t.reste_a_payer,
      quantite: t.quantite,
      timestamp: t.timestamp.toISOString(),
    });

    if (error) {
      console.error("Échec sync transaction", t.id, error);
      echec++;
    } else {
      await marquerSyncede(t.id!);
      ok++;
    }
  }

  return { ok, echec };
}

export async function synchroniserUtilisateur(u: User): Promise<void> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("mauricarnet_api_token") ||
          localStorage.getItem("API_SYNC_TOKEN") ||
          ""
        : "";
    if (!token) return;
    await fetch("/api/sync/user", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: u.username,
        created_at: u.created_at.toISOString(),
      }),
    });
  } catch (err) {
    console.error("Échec sync utilisateur", u.username, err);
  }
}

export async function synchroniserDepuisSupabase(userId: number): Promise<void> {
  const { data, error } = await supabase.from("produits").select("*");
  if (error) {
    console.error("Erreur récupération produits depuis Supabase", error);
    return;
  }

  for (const p of data ?? []) {
    await getDB().produits.put({
      id: p.id,
      user_id: userId,
      nom: p.nom,
      prix_achat: p.prix_achat,
      prix_vente: p.prix_vente,
      stock_actuel: p.stock_actuel,
      icone: p.icone,
    } as import("./db").Produit);
  }
}
