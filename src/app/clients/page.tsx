"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import ConfirmModal from "@/components/ConfirmModal";
import {
  getClients,
  ajouterClient,
  modifierClient,
  supprimerClient,
  getTransactions,
  ajouterTransaction,
  recalculerDettes,
  migrerAnciennesDonnees,
} from "@/lib/crud";
import { useAuth } from "@/contexts/AuthContext";
import { synchroniser } from "@/lib/sync";
import type { Client, Transaction } from "@/lib/db";

type Periode = "today" | "month" | "year";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [periode, setPeriode] = useState<Periode>("today");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paiementPartiel, setPaiementPartiel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { t } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id ?? 0;

  const maintenant = useMemo(() => new Date(), [allTransactions]);
  const debutPeriode = useMemo(() => {
    const d = new Date(maintenant);
    if (periode === "month") d.setDate(1);
    else if (periode === "year") d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periode, maintenant]);

  const txsFiltrees = useMemo(
    () => allTransactions.filter((t) => new Date(t.timestamp) >= debutPeriode),
    [allTransactions, debutPeriode]
  );
  const totalCash = useMemo(
    () => txsFiltrees.filter((t) => t.type === "cash").reduce((s, t) => s + t.montant_paye, 0),
    [txsFiltrees]
  );
  const charger = async () => {
    if (!uid) return;
    await migrerAnciennesDonnees(uid);
    await recalculerDettes(uid);
    const [clts, txs] = await Promise.all([getClients(uid), getTransactions(uid)]);
    setClients(clts);
    setAllTransactions(txs);
    synchroniser(uid);
  };

  useEffect(() => {
    charger();
  }, []);

  function ouvrirAjout() {
    setEditing(null);
    setNom("");
    setTel("");
    setShowForm(true);
  }

  function ouvrirEdition(c: Client) {
    setEditing(c);
    setNom(c.nom);
    setTel(c.telephone);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom) return;
    try {
      if (editing) {
        await modifierClient(editing.id!, {
          nom,
          telephone: tel,
        });
      } else {
        await ajouterClient({ nom, telephone: tel, total_dette: 0, user_id: uid });
      }
      setShowForm(false);
      await charger();
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur: " + String(err));
    }
  }

  async function handleSupprimer(id: number) {
    try {
      await supprimerClient(id);
      await charger();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  }

  function handleWhatsApp(c: Client) {
    if (!c.telephone) return;
    let boutique = localStorage.getItem("mauricarnet_boutique");
    if (!boutique) {
      boutique = prompt(t("clients.whatsapp_prompt_boutique")) || "Ma boutique";
      if (boutique) localStorage.setItem("mauricarnet_boutique", boutique);
    }
    const message = t("clients.whatsapp_message", { nom: c.nom, boutique, montant: c.total_dette });
    window.open(`https://wa.me/${c.telephone}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function voirDetails(client: Client) {
    setSelectedClient(client);
    getTransactions(uid).then((txs) => {
      const filtered = txs.filter(
        (t) => t.client_id === client.id && t.reste_a_payer > 0
      );
      setTransactions(filtered);
    });
  }

  async function handlePayer() {
    if (!selectedClient || !paiementPartiel) return;
    const montant = parseFloat(paiementPartiel) || 0;
    if (montant <= 0) return;

    try {
      const nouvelleDette = Math.max(0, selectedClient.total_dette - montant);
      await modifierClient(selectedClient.id!, {
        total_dette: nouvelleDette,
      });
      await ajouterTransaction({
        user_id: uid,
        produit_id: 0,
        client_id: selectedClient.id!,
        type: "cash",
        montant_paye: montant,
        reste_a_payer: 0,
        quantite: 0,
        timestamp: new Date(),
      });
      setPaiementPartiel("");
      await charger();
      const updated = await getClients(uid);
      const found = updated.find((c) => c.id === selectedClient.id);
      if (found) {
        setSelectedClient(found);
        setTransactions([]);
      }
    } catch (err) {
      console.error("Erreur paiement:", err);
    }
  }

  const totalDettes = clients.reduce((sum, c) => sum + c.total_dette, 0);

  const PERIODES: { key: Periode; label: string }[] = [
    { key: "today", label: t("clients.jour") },
    { key: "month", label: t("clients.mois") },
    { key: "year", label: t("clients.annee") },
  ];

  return (
    <div className="p-4 pb-24">
      <div className="sticky top-0 z-10 bg-background pt-4 pb-2 flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t("clients.title")}</h1>
        <button
          onClick={ouvrirAjout}
          className="w-10 h-10 rounded-full bg-primary text-white text-xl flex items-center justify-center"
        >
          +
        </button>
      </div>

      {clients.length > 0 && (
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
            <div className="bg-red-100 border border-red-200 rounded-xl p-3 text-center shadow-sm">
              <span className="text-lg text-red-700 font-bold">
                🔴 {t("clients.dettes")}: {totalDettes} MRU
              </span>
            </div>
            <div className="bg-emerald-100 border border-emerald-200 rounded-xl p-3 text-center shadow-sm">
              <span className="text-lg text-emerald-700 font-bold">
                💵 {t("clients.cash")}: {totalCash} MRU
              </span>
            </div>
          </div>
        </>
      )}

      {clients.length === 0 && (
        <p className="text-center text-foreground/50 py-10">
          {t("clients.aucun")}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {clients.map((c) => (
          <div
            key={c.id}
            className="card-soft flex items-center gap-3 p-4"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg">👤</span>
            </div>
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => voirDetails(c)}
            >
              <div className="font-semibold text-sm">{c.nom}</div>
              <div className="text-xs text-foreground/50 flex items-center gap-1">
                <span>{t("clients.tel_dette", { tel: c.telephone || "—", dette: c.total_dette })}</span>
                {c.telephone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleWhatsApp(c); }}
                    className="text-green-600 text-sm leading-none"
                  >
                    📱
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => ouvrirEdition(c)}
              className="text-xs text-foreground/40 hover:text-primary transition-colors px-1"
              title={t("common.editer")}
            >
              ✏️
            </button>
            <button
              onClick={() => setConfirmDelete(c.id!)}
              className="text-xs text-foreground/40 hover:text-danger transition-colors"
              title={t("common.supprimer")}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {t(editing ? "clients.modifier" : "clients.nouveau")}
              </h2>
              <div className="flex items-center gap-3">
                <button type="submit" className="text-primary font-semibold text-sm">
                  ✓ Finaliser
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-foreground/50">
                  ✕
                </button>
              </div>
            </div>
            <input
              placeholder={t("clients.nom")}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-3 mb-3 border border-border rounded-xl"
              required
            />
            <input
              placeholder={t("clients.telephone")}
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              className="w-full p-3 mb-4 border border-border rounded-xl"
              type="tel"
            />
            <p className="text-center text-xs text-foreground/40 mt-2">
              {t("common.appuyer_finaliser")}
            </p>
          </form>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{selectedClient.nom}</h2>
              <button onClick={() => setSelectedClient(null)}>✕</button>
            </div>
            <p className="text-sm mb-2">
              Tél: {selectedClient.telephone || "—"}
            </p>
            <p className="text-xl font-bold text-danger mb-4">
              {t("clients.dette_totale")}: {selectedClient.total_dette} MRU
            </p>

            {transactions.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold mb-2">{t("clients.dettes_cours")}</p>
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-danger/5 rounded-xl mb-2 text-sm"
                  >
                    <span>{t("clients.reste", { montant: tx.reste_a_payer })}</span>
                    <span className="text-foreground/50 ml-2">
                      ({new Date(tx.timestamp).toLocaleDateString("fr-FR")})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                placeholder={t("clients.montant_paye")}
                value={paiementPartiel}
                onChange={(e) => setPaiementPartiel(e.target.value)}
                className="flex-1 p-3 border border-border rounded-xl"
                type="number"
              />
              <button
                onClick={handlePayer}
                className="px-6 py-3 bg-success text-white rounded-xl font-semibold"
              >
                {t("common.payer")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title={t("common.confirmer_suppression_title")}
        message={t("common.confirmer_suppression", { item: "client" })}
        onConfirm={async () => {
          if (confirmDelete !== null) await handleSupprimer(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
