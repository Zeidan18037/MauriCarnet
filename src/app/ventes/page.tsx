"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import ConfirmModal from "@/components/ConfirmModal";
import {
  getProduits,
  getClients,
  chercherClients,
  getTransactions,
  ajouterTransaction,
  modifierTransaction,
  supprimerTransaction,
  verifierStock,
  getCategories,
  seedCategoriesIfEmpty,
  migrerAnciennesDonnees,
  getCategorieName,
} from "@/lib/crud";
import { useAuth } from "@/contexts/AuthContext";
import { synchroniser } from "@/lib/sync";
import type { Produit, Client, Transaction, Categorie } from "@/lib/db";

type FormMode = "new" | "edit";
type Periode = "today" | "month" | "year";

interface FormData {
  produit_id: number;
  client_id?: number;
  type: "cash" | "dette";
  montant_paye: number;
  reste_a_payer: number;
  quantite: number;
}

export default function VentesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<Periode>("today");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id ?? 0;

  const charger = async () => {
    if (!uid) return;
    await migrerAnciennesDonnees(uid);
    await seedCategoriesIfEmpty(uid);
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
    setLoading(false);
    synchroniser(uid);
  };

  useEffect(() => {
    charger();
  }, []);

  async function handleConfirmDelete() {
    if (deleteTarget === null) return;
    try {
      await supprimerTransaction(deleteTarget);
      await charger();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
    setDeleteTarget(null);
  }

  const maintenant = useMemo(() => new Date(), []);
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

  const totalCashPeriode = useMemo(
    () => txsFiltrees.filter((t) => t.type === "cash").reduce((s, t) => s + t.montant_paye, 0),
    [txsFiltrees]
  );

  const totalDettesPeriode = useMemo(
    () => txsFiltrees.filter((t) => t.type === "dette").reduce((s, t) => s + t.reste_a_payer, 0),
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

  const PERIODES: { key: Periode; label: string }[] = [
    { key: "today", label: t("clients.jour") },
    { key: "month", label: t("clients.mois") },
    { key: "year", label: t("clients.annee") },
  ];

  if (loading) {
    return (
      <div className="p-4 pb-24 flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  const mapProduit = new Map(produits.map((p) => [p.id, p]));
  const mapClient = new Map(clients.map((c) => [c.id, c]));
  const mapCategorie = new Map(categories.map((c) => [c.id, c]));
  function catIcone(produit?: Produit): string {
    if (!produit) return "📦";
    return mapCategorie.get(produit.categorie_id ?? 0)?.icone ?? "📦";
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t("ventes.title")}</h1>
        <span className="text-sm text-foreground/50">{transactions.length}</span>
      </div>

      {produits.length === 0 && (
        <div className="text-center py-10">
          <p className="text-foreground/50 mb-4">
            {t("ventes.ajouter_produits_avant")}
          </p>
          <a
            href="/produits"
            className="inline-block py-3 px-6 bg-primary text-white rounded-xl font-semibold"
          >
            {t("ventes.aller_produits")}
          </a>
        </div>
      )}

      {produits.length > 0 && (
        <div className="sticky top-0 z-10 bg-background pt-4 pb-2">
          <NouvelleVenteModal
            produits={produits}
            clients={clients}
            categories={categories}
            transactions={transactions}
            onDone={charger}
          />
        </div>
      )}

      {produits.length > 0 && transactions.length > 0 && (
        <>
          <div className="flex gap-1 mb-3 mt-4">
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

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="card-soft bg-emerald-50 p-3 text-center">
              <span className="text-lg text-emerald-700 font-bold block">
                ↑ {totalCashPeriode} MRU
              </span>
              <span className="text-[10px] block text-emerald-600 font-medium">
                💵 {t("ventes.cash")}
              </span>
            </div>
            <div className="card-soft bg-red-50 p-3 text-center">
              <span className="text-lg text-red-700 font-bold block">
                ↓ {totalDettesPeriode} MRU
              </span>
              <span className="text-[10px] block text-red-600 font-medium">
                🔴 {t("ventes.dette")}
              </span>
            </div>
            <div className="card-soft bg-amber-50 p-3 text-center">
              <span className="text-lg text-amber-700 font-bold block">
                ↑ {totalProfit} MRU
              </span>
              <span className="text-[10px] block text-amber-600 font-medium">
                💰 {t("ventes.profit")}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 mt-4">
        {transactions.map((t) => {
          const p = mapProduit.get(t.produit_id);
          const c = t.client_id ? mapClient.get(t.client_id) : null;
          return (
            <TransactionLine
                key={t.id}
                transaction={t}
                produit={p}
                client={c}
                produits={produits}
                clients={clients}
                categories={categories}
                onUpdate={charger}
                onRequestDelete={(id) => setDeleteTarget(id)}
              />
          );
        })}
        {transactions.length === 0 && produits.length > 0 && (
          <p className="text-center text-foreground/50 py-10">
            {t("ventes.aucune_transaction")}
          </p>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title={t("common.confirmer_suppression_title")}
        message={t("common.confirmer_suppression", { item: "transaction" })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ───── Transaction Line ───── */

function TransactionLine({
  transaction,
  produit,
  client,
  produits,
  clients,
  categories,
  onUpdate,
  onRequestDelete,
}: {
  transaction: Transaction;
  produit?: Produit;
  client?: Client | null;
  produits: Produit[];
  clients: Client[];
  categories: Categorie[];
  onUpdate: () => void;
  onRequestDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditTransactionForm
        transaction={transaction}
        produits={produits}
        clients={clients}
        onDone={() => {
          setEditing(false);
          onUpdate();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const catIcone = () => {
    if (!produit) return "📦";
    const cat = categories.find((c) => c.id === produit.categorie_id);
    return cat?.icone ?? "📦";
  };

  return (
    <div className="card-soft flex items-center gap-3 p-4">
      <span className="text-2xl">{catIcone()}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {produit?.nom ?? "Inconnu"}
        </div>
        <div className="text-xs text-foreground/60">
          {client ? `${client.nom} • ` : ""}
          <span className="font-bold">{transaction.montant_paye} MRU</span>
          {transaction.reste_a_payer > 0 && ` • ${t("ventes.reste", { reste: transaction.reste_a_payer })}`}
        </div>
        <div className="text-[10px] text-foreground/40">
          {new Date(transaction.timestamp).toLocaleString("fr-FR")}
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-foreground/40 hover:text-primary transition-colors px-1"
          title={t("ventes.editer")}
        >
          ✏️
        </button>
        <button
          onClick={() => onRequestDelete(transaction.id!)}
          className="text-xs text-foreground/40 hover:text-danger transition-colors"
          title={t("ventes.supprimer")}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

/* ───── Nouvelle Vente ───── */

function NouvelleVenteModal({
  produits,
  clients,
  categories,
  transactions,
  onDone,
}: {
  produits: Produit[];
  clients: Client[];
  categories: Categorie[];
  transactions: Transaction[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"produit" | "details">("produit");
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [type, setType] = useState<"cash" | "dette">("cash");
  const [montantPaye, setMontantPaye] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id ?? 0;
  const mapCategorie = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    if (clientQuery.length > 0) {
      chercherClients(clientQuery, uid).then(setSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [clientQuery]);

  const topProduits = useMemo(() => {
    const counts = new Map<number, number>();
    for (const t of transactions) {
      counts.set(t.produit_id, (counts.get(t.produit_id) || 0) + 1);
    }
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([id]) => produits.find((p) => p.id === id))
      .filter((p): p is Produit => p !== undefined);
  }, [transactions, produits]);

  function resetForm() {
    setStep("produit");
    setSelectedProduit(null);
    setQuantite(1);
    setType("cash");
    setMontantPaye("");
    setClientQuery("");
    setSuggestions([]);
    setSelectedClient(null);
  }

  async function handleSubmit() {
    if (!selectedProduit) return;

    if (type === "dette" && !selectedClient) {
      alert(t("common.client_requis"));
      return;
    }

    const stockOk = await verifierStock(selectedProduit.id!, quantite);
    if (!stockOk) {
      alert(
        t("common.stock_insuffisant", { stock: selectedProduit.stock_actuel, qte: quantite })
      );
      return;
    }

    const total = selectedProduit.prix_vente * quantite;
    const paye =
      type === "cash"
        ? total
        : Math.min(parseFloat(montantPaye) || 0, total);
    const reste = total - paye;

    try {
      await ajouterTransaction({
        user_id: uid,
        produit_id: selectedProduit.id!,
        client_id: selectedClient?.id,
        type,
        montant_paye: paye,
        reste_a_payer: reste,
        quantite,
        timestamp: new Date(),
      });
      resetForm();
      setOpen(false);
      onDone();
    } catch (err) {
      console.error("Erreur ajout transaction:", err);
      alert("Erreur: " + String(err));
    }
  }

  const totalAPayer = selectedProduit
    ? selectedProduit.prix_vente * quantite
    : 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold"
      >
        + {t("ventes.nouvelle")}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {step === "produit" ? t("ventes.choisir_produit") : t("ventes.details")}
              </h2>
              <div className="flex items-center gap-3">
                {step === "details" && (
                  <button onClick={handleSubmit} className="text-primary font-semibold text-sm">
                    ✓ Finaliser
                  </button>
                )}
                <button
                  onClick={() => {
                    resetForm();
                    setOpen(false);
                  }}
                  className="text-foreground/50"
                >
                  ✕
                </button>
              </div>
            </div>

            {step === "produit" && (
              <div>
                {topProduits.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wide mb-2">
                      {t("ventes.frequents")}
                    </h4>
                <div className="grid grid-cols-3 gap-2">
                  {topProduits.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduit(p);
                        setStep("details");
                      }}
                      className="p-3 border-2 border-primary/20 bg-primary/5 rounded-xl text-center active:scale-95"
                    >
                      <span className="text-2xl block">{mapCategorie.get(p.categorie_id ?? 0)?.icone ?? "📦"}</span>
                          <span className="text-xs font-bold">{p.nom}</span>
                          <span className="text-[10px] block text-foreground/60">
                            {p.prix_vente} MRU
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(() => {
                  const mapCat = new Map(categories.map((c) => [c.id, c]));
                  const grouped = new Map<number | undefined, Produit[]>();
                  for (const p of produits) {
                    const key = p.categorie_id ?? undefined;
                    if (!grouped.has(key)) grouped.set(key, []);
                    grouped.get(key)!.push(p);
                  }
                  const ordre = [...grouped.keys()].sort((a, b) => {
                    const na = a ? getCategorieName(mapCat.get(a), locale, "") : "";
                    const nb = b ? getCategorieName(mapCat.get(b), locale, "") : "";
                    return na.localeCompare(nb);
                  });
                  return ordre.map((key) => {
                    const items = grouped.get(key)!;
                    const cat = key ? mapCat.get(key) : null;
                    return (
                      <div key={key ?? "gen"} className="mb-4">
                        <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wide mb-2">
                          {cat ? `${cat.icone} ${getCategorieName(cat, locale)}` : t("produits.general")}
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {items.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedProduit(p);
                                setStep("details");
                              }}
                              className="p-3 border border-border rounded-xl text-center active:scale-95"
                            >
                              <span className="text-2xl block">{mapCategorie.get(p.categorie_id ?? 0)?.icone ?? "📦"}</span>
                              <span className="text-xs font-medium">{p.nom}</span>
                              <span className="text-[10px] block text-foreground/60">
                                {p.prix_vente} MRU
                              </span>
                              <span className={`text-[10px] block ${p.stock_actuel === 0 ? "text-danger" : "text-foreground/40"}`}>
                                {t("ventes.stock", { stock: p.stock_actuel })}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {step === "details" && selectedProduit && (
              <div>
                <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 rounded-xl">
                  <span className="text-3xl">{mapCategorie.get(selectedProduit.categorie_id ?? 0)?.icone ?? "📦"}</span>
                  <div>
                    <div className="font-bold">{selectedProduit.nom}</div>
                    <div className="text-sm text-foreground/60">
                      {selectedProduit.prix_vente} MRU / unité
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("produit")}
                    className="ml-auto text-sm text-primary"
                  >
                    {t("ventes.changer")}
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setQuantite(Math.max(1, quantite - 1))}
                    className="w-10 h-10 rounded-full bg-border text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="text-xl font-bold">{quantite}</span>
                  <button
                    onClick={() => setQuantite(quantite + 1)}
                    className="w-10 h-10 rounded-full bg-border text-lg font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setType("cash")}
                    className={`flex-1 py-2 rounded-xl font-semibold border ${
                      type === "cash"
                        ? "bg-primary text-white border-primary"
                        : "border-border"
                    }`}
                  >
                    {t("ventes.cash")}
                  </button>
                  <button
                    onClick={() => setType("dette")}
                    className={`flex-1 py-2 rounded-xl font-semibold border ${
                      type === "dette"
                        ? "bg-danger text-white border-danger"
                        : "border-border"
                    }`}
                  >
                    {t("ventes.dette")}
                  </button>
                </div>

                {type === "dette" && (
                  <input
                    placeholder={t("ventes.montant_ajd")}
                    value={montantPaye}
                    onChange={(e) => setMontantPaye(e.target.value)}
                    className="w-full p-3 mb-3 border border-border rounded-xl"
                    type="number"
                  />
                )}

                <div className="relative mb-4">
                  {type === "dette" && (
                    <p className="text-xs text-danger font-medium mb-1">{t("ventes.client_requis_label")}</p>
                  )}
                  <input
                    ref={inputRef}
                    placeholder={type === "dette" ? t("ventes.client_obligatoire") : t("ventes.client_optionnel")}
                    value={clientQuery}
                    onChange={(e) => {
                      setClientQuery(e.target.value);
                      setSelectedClient(null);
                    }}
                    className="w-full p-3 border border-border rounded-xl"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-xl mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClient(c);
                            setClientQuery(c.nom);
                            setSuggestions([]);
                          }}
                          className="w-full text-left p-3 hover:bg-primary/5 text-sm"
                        >
                          {c.nom}{" "}
                          <span className="text-foreground/50">
                            {c.telephone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-center text-lg font-bold mb-4">
                  {t("ventes.total", { total: totalAPayer })}
                </div>

                <p className="text-center text-xs text-foreground/40">
                  {t("common.appuyer_finaliser")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ───── Edit Transaction ───── */

function EditTransactionForm({
  transaction,
  produits,
  clients,
  onDone,
  onCancel,
}: {
  transaction: Transaction;
  produits: Produit[];
  clients: Client[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const [type, setType] = useState(transaction.type);
  const [montantPaye, setMontantPaye] = useState(
    String(transaction.montant_paye)
  );
  const [reste, setReste] = useState(String(transaction.reste_a_payer));
  const [clientQuery, setClientQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Client[]>([]);

  useEffect(() => {
    chercherClients(clientQuery, userId).then(setSuggestions);
  }, [clientQuery]);

  useEffect(() => {
    const c = clients.find((cl) => cl.id === transaction.client_id);
    if (c) setClientQuery(c.nom);
  }, []);

  async function handleSave() {
    try {
      await modifierTransaction(transaction.id!, {
        type,
        montant_paye: parseFloat(montantPaye) || 0,
        reste_a_payer: parseFloat(reste) || 0,
      });
      onDone();
    } catch (err) {
      console.error("Erreur modification:", err);
    }
  }

  const produit = produits.find((p) => p.id === transaction.produit_id);

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📦</span>
        <span className="font-semibold text-sm">{produit?.nom}</span>
        <button onClick={onCancel} className="ml-auto text-xs text-foreground/50">
          {t("common.annuler")}
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setType("cash")}
          className={`flex-1 py-1 rounded-lg text-sm font-medium border ${
            type === "cash"
              ? "bg-primary text-white border-primary"
              : "border-border"
          }`}
        >
          {t("ventes.cash")}
        </button>
        <button
          onClick={() => setType("dette")}
          className={`flex-1 py-1 rounded-lg text-sm font-medium border ${
            type === "dette"
              ? "bg-danger text-white border-danger"
              : "border-border"
          }`}
        >
          {t("ventes.dette")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          placeholder="Montant payé"
          value={montantPaye}
          onChange={(e) => setMontantPaye(e.target.value)}
          className="p-2 border border-border rounded-lg text-sm"
          type="number"
        />
        <input
          placeholder="Reste à payer"
          value={reste}
          onChange={(e) => setReste(e.target.value)}
          className="p-2 border border-border rounded-lg text-sm"
          type="number"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 bg-primary text-white rounded-lg font-semibold text-sm"
      >
        {t("common.enregistrer")}
      </button>
    </div>
  );
}
