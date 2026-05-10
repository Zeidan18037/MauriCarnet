import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_TOKEN = process.env.API_SYNC_TOKEN;

export async function POST(request: Request) {
  if (!API_TOKEN) {
    return NextResponse.json({ error: "Sync non configure" }, { status: 503 });
  }

  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${API_TOKEN}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { error } = await supabase.from("transactions").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
