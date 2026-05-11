"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  getProduits,
  ajouterProduit,
  modifierProduit,
  supprimerProduit,
  getCategories,
  seedCategoriesIfEmpty,
  migrerAnciennesDonnees,
} from "@/lib/crud";
import { useAuth } from "@/contexts/AuthContext";
import type { Produit, Categorie } from "@/lib/db";

const ICONES = ["📦", "🥛", "🍞", "🧃", "🍚", "🫘", "🧂", "🫒", "🥜", "🍬", "🧴", "🪥"];

export default function ProduitsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id ?? 0;
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [nom, setNom] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [stock, setStock] = useState("");
  const [icone, setIcone] = useState("📦");
  const [categorieId, setCategorieId] = useState<number | "">("");

  const charger = async () => {
    if (!uid) return;
    await migrerAnciennesDonnees(uid);
    await seedCategoriesIfEmpty(uid);
    const [p, c] = await Promise.all([getProduits(uid), getCategories(uid)]);
    setProduits(p);
    setCategories(c);
  };

  useEffect(() => {
    charger();
  }, []);

  function ouvrirAjout() {
    setEditing(null);
    setNom("");
    setPrixAchat("");
    setPrixVente("");
    setStock("");
    setIcone("📦");
    setCategorieId("");
    setShowForm(true);
  }

  function ouvrirEdition(p: Produit) {
    setEditing(p);
    setNom(p.nom);
    setPrixAchat(String(p.prix_achat));
    setPrixVente(String(p.prix_vente));
    setStock(String(p.stock_actuel));
    setIcone(p.icone);
    setCategorieId(p.categorie_id ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom || !prixVente) return;
    try {
      if (editing) {
        await modifierProduit(editing.id!, {
          nom,
          prix_achat: parseFloat(prixAchat) || 0,
          prix_vente: parseFloat(prixVente) || 0,
          stock_actuel: parseInt(stock) || 0,
          icone,
          categorie_id: categorieId || undefined,
        });
      } else {
        await ajouterProduit({
          user_id: uid,
          nom,
          prix_achat: parseFloat(prixAchat) || 0,
          prix_vente: parseFloat(prixVente) || 0,
          stock_actuel: parseInt(stock) || 0,
          icone,
          categorie_id: categorieId || undefined,
        });
      }
      setShowForm(false);
      await charger();
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur: " + String(err));
    }
  }

  async function handleSupprimer(id: number) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await supprimerProduit(id);
      await charger();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  }

  const mapCategorie = new Map(categories.map((c) => [c.id, c]));
  const grouped = new Map<number | undefined, Produit[]>();
  for (const p of produits) {
    const key = p.categorie_id ?? undefined;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }
  const ordreCats = [...grouped.keys()].sort((a, b) => {
    const na = a ? mapCategorie.get(a)?.nom ?? "" : "Général";
    const nb = b ? mapCategorie.get(b)?.nom ?? "" : "Général";
    return na.localeCompare(nb);
  });

  return (
    <div className="p-4 pb-24">
      <div className="sticky top-0 z-10 bg-background pt-4 pb-2 flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t("produits.title")}</h1>
        <button
          onClick={ouvrirAjout}
          className="w-10 h-10 rounded-full bg-primary text-white text-xl flex items-center justify-center"
        >
          +
        </button>
      </div>

      {produits.length === 0 && (
        <p className="text-center text-foreground/50 py-10">
          {t("produits.aucun")}
        </p>
      )}

      {ordreCats.map((key) => {
        const items = grouped.get(key)!;
        const cat = key ? mapCategorie.get(key) : null;
        return (
          <div key={key ?? "undefined"} className="mb-4">
            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wide mb-2">
              {cat ? `${cat.icone} ${cat.nom}` : "📦 Général"}
            </h3>
            <div className="flex flex-col gap-2">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                >
                  <span className="text-2xl">{p.icone}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{p.nom}</div>
                    <div className="text-[10px] text-foreground/50">
                      {t("produits.achat_vente_stock", { achat: p.prix_achat, vente: p.prix_vente, stock: p.stock_actuel })}
                    </div>
                  </div>
                  <button
                    onClick={() => ouvrirEdition(p)}
                    className="text-xs text-primary px-2"
                  >
                    {t("common.editer")}
                  </button>
                  <button
                    onClick={() => handleSupprimer(p.id!)}
                    className="text-xs text-danger"
                  >
                    {t("common.supprimer")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {t(editing ? "produits.modifier" : "produits.nouveau")}
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

            <select
              value={categorieId}
              onChange={(e) => setCategorieId(e.target.value ? Number(e.target.value) : "")}
              className="w-full p-3 mb-3 border border-border rounded-xl text-sm bg-white"
            >
              <option value="">{t("produits.categorie")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id!}>
                  {c.icone} {c.nom}
                </option>
              ))}
            </select>

            <input
              placeholder={t("produits.nom")}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-3 mb-3 border border-border rounded-xl"
              required
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              <input
                placeholder={t("produits.prix_achat")}
                value={prixAchat}
                onChange={(e) => setPrixAchat(e.target.value)}
                className="p-3 border border-border rounded-xl"
                type="number"
              />
              <input
                placeholder={t("produits.prix_vente")}
                value={prixVente}
                onChange={(e) => setPrixVente(e.target.value)}
                className="p-3 border border-border rounded-xl"
                type="number"
                required
              />
              <input
                placeholder={t("common.stock")}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="p-3 border border-border rounded-xl"
                type="number"
              />
            </div>

            <p className="text-center text-xs text-foreground/40 mt-2">
              {t("common.appuyer_finaliser")}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
