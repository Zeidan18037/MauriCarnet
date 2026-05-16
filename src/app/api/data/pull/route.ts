import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !authUser) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, username, auth_uid, enc_salt, created_at")
    .eq("auth_uid", authUser.id)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const userId = userRow.id;

  const [produitsRes, clientsRes, transactionsRes, categoriesRes] = await Promise.all([
    supabaseAdmin.from("produits").select("*").eq("user_id", userId),
    supabaseAdmin.from("clients").select("*").eq("user_id", userId),
    supabaseAdmin.from("transactions").select("*").eq("user_id", userId),
    supabaseAdmin.from("categories").select("*").eq("user_id", userId),
  ]);

  return NextResponse.json({
    user: {
      id: userRow.id,
      username: userRow.username,
      auth_uid: userRow.auth_uid,
      enc_salt: userRow.enc_salt,
      created_at: userRow.created_at,
    },
    produits: produitsRes.data ?? [],
    clients: clientsRes.data ?? [],
    transactions: transactionsRes.data ?? [],
    categories: categoriesRes.data ?? [],
  });
}
