"use client";

import { useState, useEffect } from "react";
import { getProduits } from "@/lib/crud";
import type { Produit } from "@/lib/db";

export default function VentesPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [selected, setSelected] = useState<Produit | null>(null);
  const [qte, setQte] = useState(1);

  useEffect(() => {
    getProduits().then(setProduits);
  }, []);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">💰 Ventes</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {produits.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className={`p-4 rounded-xl border text-center transition active:scale-95 ${
              selected?.id === p.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <span className="text-2xl block mb-1">{p.icone}</span>
            <span className="font-semibold text-sm">{p.nom}</span>
            <span className="text-xs block text-foreground/60">
              {p.prix_vente} MRU
            </span>
          </button>
        ))}
      </div>

      {produits.length === 0 && (
        <p className="text-center text-foreground/50 py-10">
          Aucun produit. Ajoutez-en dans la section Produits.
        </p>
      )}

      {selected && (
        <div className="fixed bottom-20 left-4 right-4 bg-card border border-border rounded-2xl p-5 shadow-xl z-40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xl mr-2">{selected.icone}</span>
              <span className="font-bold">{selected.nom}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-foreground/50 text-xl">
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setQte(Math.max(1, qte - 1))}
              className="w-10 h-10 rounded-full bg-border text-lg font-bold"
            >
              −
            </button>
            <span className="text-xl font-bold">{qte}</span>
            <button
              onClick={() => setQte(qte + 1)}
              className="w-10 h-10 rounded-full bg-border text-lg font-bold"
            >
              +
            </button>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold">
              Payer {selected.prix_vente * qte} MRU
            </button>
            <button className="flex-1 py-3 bg-danger text-white rounded-xl font-semibold">
              Dette
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
