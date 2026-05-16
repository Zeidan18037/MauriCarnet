import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const result = await verifyAdmin(request);
  if ("error" in result) return result.error;

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, username, auth_uid, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users });
}
