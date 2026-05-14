import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { username, pin } = body;
  if (!username || !pin) {
    return NextResponse.json({ error: "username et PIN requis" }, { status: 400 });
  }

  const email = `${username.toLowerCase().replace(/\s+/g, "-")}@mauricarnet.app`;

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: pin,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: "Nom d'utilisateur ou PIN incorrect" }, { status: 401 });
  }

  const authUid = data.user.id;
  const { data: userRow, error: dbError } = await supabaseAdmin
    .from("users")
    .select("id, username, auth_uid")
    .eq("auth_uid", authUid)
    .single();

  if (dbError || !userRow) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const response = NextResponse.json({
    user: { id: userRow.id, username: userRow.username, auth_uid: userRow.auth_uid },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });

  response.headers.set(
    "Set-Cookie",
    `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
  );

  return response;
}
