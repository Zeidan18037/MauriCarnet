import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { username, pin, pin_hash, enc_salt } = body;
  if (!username || typeof username !== "string" || username.length < 2) {
    return NextResponse.json({ error: "username requis (min 2 caractères)" }, { status: 400 });
  }
  if (!pin || typeof pin !== "string" || pin.length < 4) {
    return NextResponse.json({ error: "PIN requis (min 4 caractères)" }, { status: 400 });
  }

  const email = `${username.toLowerCase().replace(/\s+/g, "-")}@mauricarnet.app`;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: { username },
  });

  if (authError) {
    if (authError.message?.includes("already exists") || authError.message?.includes("duplicate")) {
      return NextResponse.json({ error: "Ce nom d'utilisateur existe déjà" }, { status: 409 });
    }
    console.error("Erreur création auth:", authError);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }

  const { data: userRow, error: dbError } = await supabaseAdmin
    .from("users")
    .insert({
      username,
      pin_hash: pin_hash || "",
      auth_uid: authData.user.id,
      enc_salt: enc_salt || null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("Erreur insertion users:", dbError);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: sessionData, error: sessionError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: pin,
  });

  if (sessionError || !sessionData.session) {
    return NextResponse.json({
      user: { id: userRow.id, username, enc_salt, auth_uid: authData.user.id },
    });
  }

  const response = NextResponse.json({
    user: { id: userRow.id, username, enc_salt, auth_uid: authData.user.id },
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    },
  });

  response.headers.set(
    "Set-Cookie",
    `sb-access-token=${sessionData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
  );

  return response;
}
