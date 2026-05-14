import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

const API_TOKEN = process.env.API_SYNC_TOKEN;
const PUBLIC_TOKEN = process.env.NEXT_PUBLIC_API_SYNC_TOKEN;

async function getUserIdFromJwt(token: string): Promise<number | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();
    return userRow?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  let userIdFromJwt: number | null = null;
  if (token) userIdFromJwt = await getUserIdFromJwt(token);

  const validTokens = [API_TOKEN, PUBLIC_TOKEN].filter(Boolean);
  const hasLegacyToken = token && validTokens.includes(token);
  const isAuthenticated = !!userIdFromJwt || hasLegacyToken;

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch { body = null; }

  if (!body || (!hasLegacyToken && (!body.transactions || body.transactions.length === 0))) {
    return NextResponse.json({ ok: true, health: true });
  }

  if (!hasLegacyToken) {
      const { transactions } = body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ ok: true, syncedIds: [] });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const syncedIds: number[] = [];
    let echec = 0;

    for (const t of transactions) {
      const { error } = await supabase.from("transactions").insert({
        user_id: userIdFromJwt,
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

  // Legacy token path (deprecated)
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
