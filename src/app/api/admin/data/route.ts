import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const result = await verifyAdmin(request);
  if ("error" in result) return result.error;

  const [produits, clients, transactions, categories] = await Promise.all([
    supabaseAdmin.from("produits").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("clients").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("transactions").select("*").order("timestamp", { ascending: false }),
    supabaseAdmin.from("categories").select("*").order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    produits: produits.data || [],
    clients: clients.data || [],
    transactions: transactions.data || [],
    categories: categories.data || [],
    errors: {
      produits: produits.error?.message || null,
      clients: clients.error?.message || null,
      transactions: transactions.error?.message || null,
      categories: categories.error?.message || null,
    },
  });
}
