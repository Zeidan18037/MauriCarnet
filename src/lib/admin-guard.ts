import { supabaseAdmin } from "./supabase-server";

export interface AdminSession {
  userId: string;
  username: string;
  role: string;
}

export async function verifyAdmin(
  request: Request
): Promise<{ admin: AdminSession } | { error: Response }> {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      error: new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const role = user.app_metadata?.role || "user";

  if (role !== "admin") {
    return {
      error: new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("username")
    .eq("auth_uid", user.id)
    .single();

  return {
    admin: {
      userId: user.id,
      username: userRow?.username || user.email || "unknown",
      role,
    },
  };
}
