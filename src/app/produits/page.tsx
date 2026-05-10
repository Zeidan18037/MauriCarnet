"use client";

import { useState, useEffect } from "react";
import {
  getProduits,
  ajouterProduit,
  supprimerProduit,
} from "@/lib/crud";
import type { Produit } from "@/lib/db";

const ICONES = ["📦", "🥛", "🍞", "🧃", "🍚", "🫘", "🧂", "🫒", "🥜", "🍬", "🧴", "🪥"];

export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [stock, setStock] = useState("");
  const [icone, setIcone] = useState("📦");

  useEffect(() => {
    getProduits().then(setProduits);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom || !prixVente) return;
    await ajouterProduit({
      nom,
      prix_achat: parseFloat(prixAchat) || 0,
      prix_vente: parseFloat(prixVente) || 0,
      stock_actuel: parseInt(stock) || 0,
      icone,
    });
    setNom("");
    setPrixAchat("");
    setPrixVente("");
    setStock("");
    setIcone("📦");
    setShowForm(false);
    setProduits(await getProduits());
  }

  async function handleSupprimer(id: number) {
    await supprimerProduit(id);
    setProduits(await getProduits());
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">📦 Produits</h1>
        <button
          onClick={() => setShowForm(true)}
          className="w-10 h-10 rounded-full bg-primary text-white text-xl flex items-center justify-center"
        >
          +
        </button>
      </div>

      {produits.length === 0 && (
        <p className="text-center text-foreground/50 py-10">
          Aucun produit. Ajoutez votre premier produit.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {produits.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl"
          >
            <span className="text-2xl">{p.icone}</span>
            <div className="flex-1">
              <div className="font-semibold">{p.nom}</div>
              <div className="text-xs text-foreground/60">
                Achat: {p.prix_achat} MRU | Vente: {p.prix_vente} MRU | Stock: {p.stock_actuel}
              </div>
            </div>
            <button
              onClick={() => handleSupprimer(p.id!)}
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
            className="bg-white rounded-t-2xl p-6 w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Nouveau produit</h2>
              <button type="button" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {ICONES.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setIcone(ic)}
                  className={`text-2xl w-10 h-10 flex items-center justify-center rounded-lg border ${
                    icone === ic ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>

            <input
              placeholder="Nom du produit"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-3 mb-3 border border-border rounded-xl"
              required
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              <input
                placeholder="Prix achat"
                value={prixAchat}
                onChange={(e) => setPrixAchat(e.target.value)}
                className="p-3 border border-border rounded-xl"
                type="number"
              />
              <input
                placeholder="Prix vente"
                value={prixVente}
                onChange={(e) => setPrixVente(e.target.value)}
                className="p-3 border border-border rounded-xl"
                type="number"
                required
              />
              <input
                placeholder="Stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="p-3 border border-border rounded-xl"
                type="number"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold"
            >
              Ajouter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
