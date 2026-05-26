import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { generateRiskReport, type RiskInput } from "@/lib/risk";

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !authUser) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_uid", authUser.id)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  let body: Partial<RiskInput> = {};
  try { body = await request.json(); } catch {}

  const riskInput: RiskInput = {
    cash_on_hand: body.cash_on_hand ?? 0,
    daily_profit_avg: body.daily_profit_avg ?? 0,
    debts_owed_to_shop: body.debts_owed_to_shop ?? 0,
    estimated_default_rate: body.estimated_default_rate ?? 0.15,
    shock_frequency_days: body.shock_frequency_days ?? 30,
    avg_shock_severity: body.avg_shock_severity ?? 4000,
  };

  const report = generateRiskReport(riskInput);
  return NextResponse.json({ ...report, userId: userRow.id });
}
