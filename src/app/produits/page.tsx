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
  getCategorieName,
} from "@/lib/crud";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmModal from "@/components/ConfirmModal";
import AlertModal from "@/components/AlertModal";
import type { Produit, Categorie } from "@/lib/db";

export default function ProduitsPage() {
  const { t, locale } = useTranslation();
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
  const [categorieId, setCategorieId] = useState<number | "">("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [alertData, setAlertData] = useState<{ icon: string; title: string; message: string } | null>(null);

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
    setCategorieId("");
    setShowForm(true);
  }

  function ouvrirEdition(p: Produit) {
    setEditing(p);
    setNom(p.nom);
    setPrixAchat(String(p.prix_achat));
    setPrixVente(String(p.prix_vente));
    setStock(String(p.stock_actuel));
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
          categorie_id: categorieId || undefined,
        });
      } else {
        await ajouterProduit({
          user_id: uid,
          nom,
          prix_achat: parseFloat(prixAchat) || 0,
          prix_vente: parseFloat(prixVente) || 0,
          stock_actuel: parseInt(stock) || 0,
          categorie_id: categorieId || undefined,
        });
      }
      setShowForm(false);
      await charger();
    } catch (err) {
      console.error("Erreur:", err);
      setAlertData({ icon: "⚠️", title: t("common.erreur"), message: String(err) });
    }
  }

  async function handleSupprimer(id: number) {
    setDeleteTarget(id);
  }

  async function doDelete() {
    if (deleteTarget === null) return;
    try {
      await supprimerProduit(deleteTarget);
      await charger();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
    setDeleteTarget(null);
  }

  const mapCategorie = new Map(categories.map((c) => [c.id, c]));
  const grouped = new Map<number | undefined, Produit[]>();
  for (const p of produits) {
    const key = p.categorie_id ?? undefined;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }
  const ordreCats = [...grouped.keys()].sort((a, b) => {
    const na = a ? getCategorieName(mapCategorie.get(a), locale, "") : "";
    const nb = b ? getCategorieName(mapCategorie.get(b), locale, "") : "";
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
              {cat ? `${cat.icone} ${getCategorieName(cat, locale)}` : t("produits.general")}
            </h3>
            <div className="flex flex-col gap-2">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="card-soft flex items-center gap-3 p-4"
                >
                  <span className="text-2xl">{mapCategorie.get(p.categorie_id)?.icone ?? "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{p.nom}</div>
                    <div className="text-[10px] text-foreground/50">
                      {t("produits.achat_vente_stock", { achat: p.prix_achat, vente: p.prix_vente, stock: p.stock_actuel })}
                    </div>
                  </div>
                  <button
                    onClick={() => ouvrirEdition(p)}
                    className="flex items-center justify-center w-11 h-11 rounded-xl text-lg hover:bg-primary/10 transition-colors"
                    title={t("common.editer")}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleSupprimer(p.id!)}
                    className="flex items-center justify-center w-11 h-11 rounded-xl text-lg hover:bg-danger/10 transition-colors"
                    title={t("common.supprimer")}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <ConfirmModal
        open={deleteTarget !== null}
        icon="🗑️"
        title={t("common.confirmer_suppression_title")}
        message={t("common.confirmer_suppression", { item: "produit" })}
        confirmDanger
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AlertModal
        open={alertData !== null}
        icon={alertData?.icon}
        title={alertData?.title ?? ""}
        message={alertData?.message ?? ""}
        onClose={() => setAlertData(null)}
      />

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
              <button type="button" onClick={() => setShowForm(false)} className="text-foreground/50">
                ✕
              </button>
            </div>

            <select
              value={categorieId}
              onChange={(e) => setCategorieId(e.target.value ? Number(e.target.value) : "")}
              className="w-full p-3 mb-3 border border-border rounded-xl text-sm bg-white"
            >
              <option value="">{t("produits.categorie")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id!}>
                  {c.icone} {getCategorieName(c, locale)}
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

            <button
              type="submit"
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-base mb-2"
            >
              ✓ {t("produits.finaliser")}
            </button>

            <p className="text-center text-xs text-foreground/40 mt-2">
              {t("common.appuyer_finaliser")}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
