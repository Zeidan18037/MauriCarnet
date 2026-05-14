import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_TOKEN = process.env.API_SYNC_TOKEN;
const PUBLIC_TOKEN = process.env.NEXT_PUBLIC_API_SYNC_TOKEN;

export async function POST(request: Request) {
  const validTokens = [API_TOKEN, PUBLIC_TOKEN].filter(Boolean);
  if (validTokens.length === 0) {
    return NextResponse.json({ error: "Sync non configuré" }, { status: 503 });
  }

  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token || !validTokens.includes(token)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch { body = null; }

  if (!body || !body.userId || !body.transactions) {
    return NextResponse.json({ ok: true, health: true });
  }

  const { userId, username, transactions } = body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ ok: true, syncedIds: [] });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (username) {
    const { error: userErr } = await supabase.from("users").upsert(
      { username, created_at: new Date().toISOString() },
      { onConflict: "username" }
    );
    if (userErr) {
      console.error("Erreur création user via sync", userErr);
    }
  }

  const syncedIds: number[] = [];
  let echec = 0;

  for (const t of transactions) {
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      produit_id: t.produit_id,
      client_id: t.client_id ?? null,
      type: t.type,
      montant_paye: t.montant_paye,
      reste_a_payer: t.reste_a_payer,
      quantite: t.quantite ?? 0,
      timestamp: t.timestamp ?? new Date().toISOString(),
    });

    if (error) {
      console.error("Échec sync transaction", t.id, error);
      echec++;
    } else {
      syncedIds.push(t.id);
    }
  }

  return NextResponse.json({ ok: syncedIds.length, echec, syncedIds });
}
