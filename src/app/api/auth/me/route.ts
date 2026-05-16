import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !authUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, username, auth_uid, created_at")
    .eq("auth_uid", authUser.id)
    .single();

  if (!userRow) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: userRow.id,
      username: userRow.username,
      auth_uid: userRow.auth_uid,
      created_at: userRow.created_at,
      role: authUser.app_metadata?.role || "user",
    },
  });
}
