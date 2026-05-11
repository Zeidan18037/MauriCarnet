"use client";

import { useState, useEffect } from "react";
import { calculerROI, type ResultatROI, type ChargesFixes } from "@/lib/roi";
import { getProduits, getClients, migrerAnciennesDonnees } from "@/lib/crud";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";

const CHARGES_PAR_DEFAUT: ChargesFixes = {
  loyer: 0,
  electricite: 0,
  salaires: 0,
  autres: 0,
};

export default function RapportsPage() {
  const { t } = useTranslation();
  const [resultat, setResultat] = useState<ResultatROI | null>(null);
  const [charges, setCharges] = useState<ChargesFixes>(CHARGES_PAR_DEFAUT);
  const [nbProduits, setNbProduits] = useState(0);
  const [nbClients, setNbClients] = useState(0);

  const { user } = useAuth();
  const uid = user?.id ?? 0;

  useEffect(() => {
    if (!uid) return;
    migrerAnciennesDonnees(uid);
    getProduits(uid).then((p) => setNbProduits(p.length));
    getClients(uid).then((c) => setNbClients(c.length));
  }, [uid]);

  async function handleCalculer() {
    const r = await calculerROI(uid, charges);
    setResultat(r);
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">{t("rapports.title")}</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Produits" value={nbProduits} icon="📦" />
        <StatCard label="Clients" value={nbClients} icon="👥" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <h2 className="font-bold mb-3">{t("rapports.charges_fixes")}</h2>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <ChargeInput label={t("rapports.loyer")} value={charges.loyer} onChange={(v) => setCharges((c) => ({ ...c, loyer: v }))} />
          <ChargeInput label={t("rapports.electricite")} value={charges.electricite} onChange={(v) => setCharges((c) => ({ ...c, electricite: v }))} />
          <ChargeInput label="Salaires" value={charges.salaires} onChange={(v) => setCharges((c) => ({ ...c, salaires: v }))} />
          <ChargeInput label="Autres" value={charges.autres} onChange={(v) => setCharges((c) => ({ ...c, autres: v }))} />
        </div>
        <button
          onClick={handleCalculer}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold"
        >
          {t("rapports.calculer")} {t("rapports.roi")}
        </button>
      </div>

      {resultat && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-bold mb-3">{t("rapports.resultat")}</h2>
          <div className="space-y-2 mb-4">
            <Ligne label="Marge brute totale" value={`${resultat.marge_brute_totale} MRU`} />
            <Ligne label={t("rapports.charges_fixes")} value={`-${resultat.charges_fixes} MRU`} />
            <div className="h-px bg-border" />
            <Ligne
              label={`${t("rapports.roi")} net`}
              value={`${resultat.roi_net} MRU`}
              color={resultat.rentable ? "text-success" : "text-danger"}
            />
            <Ligne label={`Ratio ${t("rapports.roi")}`} value={`${resultat.ratio_roi_pourcent}%`} />
          </div>

          {Object.keys(resultat.par_produit).length > 0 && (
            <>
              <h3 className="font-semibold mb-2 text-sm">Par produit :</h3>
              {Object.entries(resultat.par_produit).map(([nom, marge]) => (
                <div key={nom} className="flex justify-between text-sm py-1">
                  <span>{nom}</span>
                  <span className="font-medium">{marge} MRU</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {!resultat && (
        <p className="text-center text-foreground/50 py-6">
          Configurez les {t("rapports.charges_fixes")} et cliquez sur {t("rapports.calculer")}.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <span className="text-2xl block mb-1">{icon}</span>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs block text-foreground/50">{label}</span>
    </div>
  );
}

function ChargeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-foreground/60 block mb-1">{label}</label>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full p-2 border border-border rounded-lg text-sm"
        placeholder="0"
      />
    </div>
  );
}

function Ligne({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-sm">{label}</span>
      <span className={`font-semibold text-sm ${color ?? ""}`}>{value}</span>
    </div>
  );
}
