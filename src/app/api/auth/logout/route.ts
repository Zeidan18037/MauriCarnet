import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  if (token) {
    const { error } = await supabaseAdmin.auth.admin.signOut(token);
    if (error) console.error("Erreur déconnexion:", error);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    "sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );

  return response;
}
