import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_TOKEN = process.env.API_SYNC_TOKEN;

export async function POST(request: Request) {
  if (!API_TOKEN) {
    return NextResponse.json({ error: "Sync non configuré" }, { status: 503 });
  }

  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${API_TOKEN}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { username, created_at } = await request.json();

  if (!username || typeof username !== "string" || username.length < 2) {
    return NextResponse.json({ error: "username requis (min 2 caractères)" }, { status: 400 });
  }

  if (username.length > 50) {
    return NextResponse.json({ error: "username trop long (max 50)" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9\s\-_À-ÿ]+$/.test(username)) {
    return NextResponse.json({ error: "username contient des caractères non autorisés" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("users").upsert(
    { username, created_at: created_at ?? new Date().toISOString() },
    { onConflict: "username" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
