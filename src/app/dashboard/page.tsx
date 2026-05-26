"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  getTransactions,
  getProduits,
  getClients,
  getCategories,
  recalculerDettes,
  migrerAnciennesDonnees,
} from "@/lib/crud";
import { useAuth } from "@/contexts/AuthContext";
import type { Produit, Client, Transaction, Categorie } from "@/lib/db";
import { generateRiskReport, type RiskReport } from "@/lib/risk";

type Periode = "today" | "month" | "year";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [periode, setPeriode] = useState<Periode>("month");

  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id ?? 0;

  const charger = async () => {
    if (!uid) return;
    await migrerAnciennesDonnees(uid);
    await recalculerDettes(uid);
    const [txs, prods, clts, cats] = await Promise.all([
      getTransactions(uid),
      getProduits(uid),
      getClients(uid),
      getCategories(uid),
    ]);
    setTransactions(txs);
    setProduits(prods);
    setClients(clts);
    setCategories(cats);
  };

  useEffect(() => {
    charger();
  }, [uid]);

  const maintenant = useMemo(() => new Date(), [transactions]);
  const debutPeriode = useMemo(() => {
    const d = new Date(maintenant);
    if (periode === "month") d.setDate(1);
    else if (periode === "year") d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periode, maintenant]);

  const txsFiltrees = useMemo(
    () => transactions.filter((t) => new Date(t.timestamp) >= debutPeriode),
    [transactions, debutPeriode]
  );

  const totalCash = useMemo(
    () => txsFiltrees.filter((t) => t.type === "cash").reduce((s, t) => s + t.montant_paye, 0),
    [txsFiltrees]
  );

  const totalDettesSolde = useMemo(
    () => clients.reduce((s, c) => s + c.total_dette, 0),
    [clients]
  );

  const totalQuantite = useMemo(
    () => txsFiltrees.reduce((s, t) => s + t.quantite, 0),
    [txsFiltrees]
  );

  const totalProfit = useMemo(() => {
    const map = new Map(produits.map((p) => [p.id, p]));
    return txsFiltrees.reduce((sum, t) => {
      const p = map.get(t.produit_id);
      if (!p) return sum;
      return sum + ((p.prix_vente || 0) - (p.prix_achat || 0)) * t.quantite;
    }, 0);
  }, [txsFiltrees, produits]);

  const topProduits = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const map = new Map<number, { count: number; profit: number; nom: string; icone: string }>();
    for (const t of txsFiltrees) {
      if (!map.has(t.produit_id)) {
        const p = produits.find((pr) => pr.id === t.produit_id);
        const cat = catMap.get(p?.categorie_id ?? 0);
        map.set(t.produit_id, { count: 0, profit: 0, nom: p?.nom ?? "?", icone: cat?.icone ?? "📦" });
      }
      const entry = map.get(t.produit_id)!;
      entry.count += t.quantite;
      const p = produits.find((pr) => pr.id === t.produit_id);
      if (p) entry.profit += ((p.prix_vente || 0) - (p.prix_achat || 0)) * t.quantite;
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([_, data]) => data);
  }, [txsFiltrees, produits]);

  const topDettes = useMemo(
    () =>
      [...clients]
        .filter((c) => c.total_dette > 0)
        .sort((a, b) => b.total_dette - a.total_dette)
        .slice(0, 3),
    [clients]
  );

  const joursDansPeriode = useMemo(
    () => Math.max(1, Math.round((maintenant.getTime() - debutPeriode.getTime()) / 86_400_000)),
    [maintenant, debutPeriode]
  );

  const riskReport = useMemo<RiskReport | null>(() => {
    const prods = produits;
    if (prods.length === 0 || totalCash === 0) return null;
    return generateRiskReport({
      cash_on_hand: totalCash,
      daily_profit_avg: Math.round((totalProfit / joursDansPeriode) * 100) / 100,
      debts_owed_to_shop: totalDettesSolde,
      estimated_default_rate: 0.15,
      shock_frequency_days: 30,
      avg_shock_severity: 4000,
    });
  }, [totalCash, totalProfit, totalDettesSolde, joursDansPeriode, produits]);

  const PERIODES: { key: Periode; label: string }[] = [
    { key: "today", label: t("clients.jour") },
    { key: "month", label: t("clients.mois") },
    { key: "year", label: t("clients.annee") },
  ];

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-1">{t("dashboard.title")}</h1>
      <p className="text-sm text-foreground/50 mb-4">{t("dashboard.subtitle")}</p>

      {transactions.length === 0 && produits.length === 0 && clients.length === 0 ? (
        <p className="text-center text-foreground/50 py-10">
          {t("dashboard.aucune_transaction")}
        </p>
      ) : (
        <>
          <div className="flex gap-1 mb-3">
            {PERIODES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriode(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  periode === key
                    ? "bg-primary text-white border-primary"
                    : "border-border text-foreground/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="card-soft bg-emerald-50 p-4 text-center">
              <span className="text-xl text-emerald-700 font-bold block">↑ {totalCash} MRU</span>
              <span className="text-xs text-emerald-600 font-medium">💵 {t("dashboard.cash")}</span>
            </div>
            <div className="card-soft bg-red-50 p-4 text-center">
              <span className="text-xl text-red-700 font-bold block">⏳ {totalDettesSolde} MRU</span>
              <span className="text-xs text-red-600 font-medium">🔴 {t("dashboard.dettes")}</span>
            </div>
            <div className="card-soft bg-amber-50 p-4 text-center">
              <span className="text-xl text-amber-700 font-bold block">↑ {totalProfit} MRU</span>
              <span className="text-xs text-amber-600 font-medium">💰 {t("dashboard.profit")}</span>
            </div>
            <div className="card-soft bg-blue-50 p-4 text-center">
              <span className="text-xl text-blue-700 font-bold block">{totalQuantite}</span>
              <span className="text-xs text-blue-600 font-medium">📦 {t("dashboard.produits_vendus")}</span>
            </div>
          </div>

          {topProduits.length > 0 && (
            <div className="card-soft p-4 mb-4">
              <h2 className="font-bold mb-3">{t("dashboard.top_produits")}</h2>
              <div className="flex flex-col gap-2">
                {topProduits.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground/40 w-5">#{i + 1}</span>
                    <span className="text-xl">{p.icone}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.nom}</div>
                      <div className="text-xs text-foreground/50">{p.count} vendus</div>
                    </div>
                    <span className="text-sm font-bold text-amber-700">+{p.profit} MRU</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topDettes.length > 0 && (
            <div className="card-soft p-4 mb-4">
              <h2 className="font-bold mb-3">{t("dashboard.top_dettes")}</h2>
              <div className="flex flex-col gap-2">
                {topDettes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      <span className="text-sm font-medium">{c.nom}</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">{c.total_dette} MRU</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {riskReport && (
            <div className="card-soft p-4">
              <h2 className="font-bold mb-3">
                🛡️ {t("dashboard.risque")}
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold text-white ${
                  ["AAA","AA"].includes(riskReport.risk_rating) ? "bg-emerald-600" :
                  ["A","BBB"].includes(riskReport.risk_rating) ? "bg-amber-500" :
                  ["BB","B"].includes(riskReport.risk_rating) ? "bg-orange-500" :
                  "bg-red-600"
                }`}>
                  {riskReport.risk_rating}
                </span>
              </h2>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-foreground/60 mb-1">
                  <span>{t("dashboard.stabilite")}</span>
                  <span className="font-bold">{riskReport.stability_score} / 100</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      riskReport.stability_score >= 80 ? "bg-emerald-500" :
                      riskReport.stability_score >= 60 ? "bg-amber-500" :
                      riskReport.stability_score >= 40 ? "bg-orange-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${riskReport.stability_score}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-foreground/60">{t("dashboard.capital_ajuste")}</span>
                <span className="font-semibold text-right">{riskReport.adjusted_capital.toLocaleString()} MRU</span>
                <span className="text-foreground/60">{t("dashboard.probabilite_ruine")}</span>
                <span className="font-semibold text-right">{(riskReport.ruin_probability * 100).toFixed(2)}%</span>
                <span className="text-foreground/60">{t("dashboard.notation")}</span>
                <span className="font-bold text-right text-lg">{riskReport.risk_rating}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
