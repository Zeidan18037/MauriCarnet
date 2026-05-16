import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

const API_TOKEN = process.env.API_SYNC_TOKEN;
const PUBLIC_TOKEN = process.env.NEXT_PUBLIC_API_SYNC_TOKEN;

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  const validTokens = [API_TOKEN, PUBLIC_TOKEN].filter(Boolean);
  const hasLegacyToken = token && validTokens.includes(token);

  let userIdFromJwt: number | null = null;
  if (token && !hasLegacyToken) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        const { data: userRow } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("auth_uid", user.id)
          .single();
        userIdFromJwt = userRow?.id ?? null;
      }
    } catch {}
  }

  if (!hasLegacyToken && !userIdFromJwt) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }



  const body = await request.json();
  const { username, created_at, id, pin, pin_hash, enc_salt } = body;

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

  // Register new user (from offline registration) — create Supabase Auth user
  if (pin) {
    const email = `${username.toLowerCase().replace(/\s+/g, "-")}@mauricarnet.app`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      user_metadata: { username },
    });
    if (authError && !authError.message?.includes("already exists")) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
    if (authData?.user?.id) {
      const { error: upsertError } = await supabase.from("users").upsert(
        {
          id: id ?? undefined,
          username,
          auth_uid: authData.user.id,
          enc_salt: enc_salt || null,
          pin_hash: pin_hash || "",
          created_at: created_at ?? new Date().toISOString(),
        },
        { onConflict: "username", ignoreDuplicates: true }
      );
      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, auth_uid: authData.user.id });
    }
  }

  // Upsert username only (existing user sync)
  const { error } = await supabase.from("users").upsert(
    { username, created_at: created_at ?? new Date().toISOString() },
    { onConflict: "username", ignoreDuplicates: true }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
