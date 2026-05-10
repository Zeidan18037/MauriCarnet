"use client";

import { useState, useEffect } from "react";
import {
  getClients,
  ajouterClient,
  supprimerClient,
  getTransactions,
} from "@/lib/crud";
import type { Client, Transaction } from "@/lib/db";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paiementPartiel, setPaiementPartiel] = useState("");

  useEffect(() => {
    getClients().then(setClients);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom) return;
    await ajouterClient({ nom, telephone: tel, total_dette: 0 });
    setNom("");
    setTel("");
    setShowForm(false);
    setClients(await getClients());
  }

  async function handleSupprimer(id: number) {
    await supprimerClient(id);
    setClients(await getClients());
  }

  function voirDetails(client: Client) {
    setSelectedClient(client);
    getTransactions().then((txs) => {
      const filtered = txs.filter(
        (t) => t.client_id === client.id && t.reste_a_payer > 0
      );
      setTransactions(filtered);
    });
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">👥 Clients</h1>
        <button
          onClick={() => setShowForm(true)}
          className="w-10 h-10 rounded-full bg-primary text-white text-xl flex items-center justify-center"
        >
          +
        </button>
      </div>

      {clients.length === 0 && (
        <p className="text-center text-foreground/50 py-10">
          Aucun client. Ajoutez votre premier client.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {clients.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => voirDetails(c)}
            >
              <div className="font-semibold">{c.nom}</div>
              <div className="text-xs text-foreground/60">
                {c.telephone} • Dette: {c.total_dette} MRU
              </div>
            </div>
            <button
              onClick={() => handleSupprimer(c.id!)}
              className="text-danger text-sm"
            >
              Suppr.
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-t-2xl p-6 w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Nouveau client</h2>
              <button type="button" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <input
              placeholder="Nom du client"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-3 mb-3 border border-border rounded-xl"
              required
            />
            <input
              placeholder="Téléphone (optionnel)"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              className="w-full p-3 mb-4 border border-border rounded-xl"
              type="tel"
            />
            <button
              type="submit"
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold"
            >
              Ajouter
            </button>
          </form>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl p-6 w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{selectedClient.nom}</h2>
              <button onClick={() => setSelectedClient(null)}>✕</button>
            </div>
            <p className="text-sm mb-2">
              Tél: {selectedClient.telephone || "—"}
            </p>
            <p className="text-xl font-bold text-danger mb-4">
              Dette totale: {selectedClient.total_dette} MRU
            </p>

            {transactions.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold mb-2">Dettes en cours :</p>
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-danger/5 rounded-xl mb-2 text-sm"
                  >
                    <span>Reste: {t.reste_a_payer} MRU</span>
                    <span className="text-foreground/50 ml-2">
                      ({new Date(t.timestamp).toLocaleDateString("fr-FR")})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                placeholder="Montant payé"
                value={paiementPartiel}
                onChange={(e) => setPaiementPartiel(e.target.value)}
                className="flex-1 p-3 border border-border rounded-xl"
                type="number"
              />
              <button
                onClick={() => {
                  setPaiementPartiel("");
                }}
                className="px-6 py-3 bg-success text-white rounded-xl font-semibold"
              >
                Payer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
