import { getDB } from "./db";

export interface RiskInput {
  cash_on_hand: number;
  daily_profit_avg: number;
  debts_owed_to_shop: number;
  estimated_default_rate: number;
  shock_frequency_days: number;
  avg_shock_severity: number;
}

export interface RiskReport {
  adjusted_capital: number;
  daily_profit_rate: number;
  shock_frequency_lambda: number;
  mean_shock_severity: number;
  net_profit_condition_met: boolean;
  expected_cash_1y: number;
  variance_cash_1y: number;
  ruin_probability: number;
  stability_score: number;
  risk_rating: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";
}

const RATING_CUTOFFS: [number, RiskReport["risk_rating"]][] = [
  [95, "AAA"],
  [90, "AA"],
  [80, "A"],
  [70, "BBB"],
  [60, "BB"],
  [50, "B"],
  [30, "CCC"],
  [-Infinity, "D"],
];

function rating(score: number): RiskReport["risk_rating"] {
  for (const [threshold, label] of RATING_CUTOFFS) {
    if (score >= threshold) return label;
  }
  return "D";
}

export function adjustedCapital(input: RiskInput): number {
  return input.cash_on_hand + input.debts_owed_to_shop * (1 - input.estimated_default_rate);
}

export function expectedCash(input: RiskInput, t: number): number {
  const lambda = 1 / input.shock_frequency_days;
  const beta = 1 / input.avg_shock_severity;
  const u0 = adjustedCapital(input);
  return u0 + (input.daily_profit_avg - lambda / beta) * t;
}

export function varianceCash(input: RiskInput, t: number): number {
  const lambda = 1 / input.shock_frequency_days;
  const beta = 1 / input.avg_shock_severity;
  return lambda * (2 / (beta * beta)) * t;
}

export function ruinProbability(input: RiskInput): number {
  const lambda = 1 / input.shock_frequency_days;
  const beta = 1 / input.avg_shock_severity;
  const u0 = adjustedCapital(input);
  const netCondition = input.daily_profit_avg > lambda / beta;

  if (!netCondition || u0 <= 0) return 1;

  const psi =
    (lambda / (input.daily_profit_avg * beta)) *
    Math.exp(-(beta - lambda / input.daily_profit_avg) * u0);

  return Math.max(0, Math.min(1, psi));
}

export function stabilityScore(input: RiskInput): number {
  const psi = ruinProbability(input);
  return Math.max(0, Math.min(100, 100 * (1 - psi)));
}

export function generateRiskReport(
  input: RiskInput,
  horizonDays: number = 365
): RiskReport {
  const lambda = 1 / input.shock_frequency_days;
  const beta = 1 / input.avg_shock_severity;
  const u0 = adjustedCapital(input);
  const psi = ruinProbability(input);
  const score = stabilityScore(input);

  return {
    adjusted_capital: Math.round(u0 * 100) / 100,
    daily_profit_rate: Math.round(input.daily_profit_avg * 100) / 100,
    shock_frequency_lambda: Math.round(lambda * 1_000_000) / 1_000_000,
    mean_shock_severity: Math.round(input.avg_shock_severity * 100) / 100,
    net_profit_condition_met: input.daily_profit_avg > lambda / beta,
    expected_cash_1y: Math.round(expectedCash(input, horizonDays) * 100) / 100,
    variance_cash_1y: Math.round(varianceCash(input, horizonDays) * 100) / 100,
    ruin_probability: Math.round(psi * 1_000_000) / 1_000_000,
    stability_score: Math.round(score * 100) / 100,
    risk_rating: rating(score),
  };
}

export async function buildRiskInputFromDB(
  userId: number,
  cashOnHand?: number
): Promise<RiskInput | null> {
  const db = getDB();
  const produits = await db.produits.where("user_id").equals(userId).toArray();
  const transactions = await db.transactions
    .where("user_id")
    .equals(userId)
    .toArray();
  const clients = await db.clients.where("user_id").equals(userId).toArray();

  if (produits.length === 0) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentTxs = transactions.filter(
    (t) => new Date(t.timestamp) >= thirtyDaysAgo
  );

  const prodMap = new Map(produits.map((p) => [p.id, p]));
  let totalProfit = 0;
  for (const t of recentTxs) {
    const p = prodMap.get(t.produit_id);
    if (p) {
      totalProfit += ((p.prix_vente || 0) - (p.prix_achat || 0)) * t.quantite;
    }
  }

  const dailyProfitAvg = totalProfit / 30;
  const totalDebts = clients.reduce((s, c) => s + c.total_dette, 0);

  return {
    cash_on_hand: cashOnHand ?? Math.round(totalProfit * 100) / 100,
    daily_profit_avg: Math.round(dailyProfitAvg * 100) / 100,
    debts_owed_to_shop: totalDebts,
    estimated_default_rate: 0.15,
    shock_frequency_days: 30,
    avg_shock_severity: 4000,
  };
}
