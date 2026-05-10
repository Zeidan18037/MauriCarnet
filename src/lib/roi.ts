import { db } from "./db";

export interface ChargesFixes {
  loyer: number;
  electricite: number;
  salaires: number;
  autres: number;
}

export interface ResultatROI {
  marge_brute_totale: number;
  charges_fixes: number;
  roi_net: number;
  ratio_roi_pourcent: number;
  rentable: boolean;
  par_produit: Record<string, number>;
  periode: {
    debut: string;
    fin: string;
  };
}

export async function calculerROI(
  charges: ChargesFixes,
  depuis?: Date,
  jusqua?: Date
): Promise<ResultatROI> {
  const transactions = await db.transactions.toArray();
  const produits = await db.produits.toArray();

  const debut = depuis ?? new Date(0);
  const fin = jusqua ?? new Date();

  const filtrees = transactions.filter((t) => {
    const d = new Date(t.timestamp);
    return d >= debut && d <= fin;
  });

  const mapProduits = new Map(produits.map((p) => [p.id, p]));
  const parProduit: Record<string, number> = {};
  let margeTotale = 0;

  for (const t of filtrees) {
    const p = mapProduits.get(t.produit_id);
    if (!p) continue;
    const marge = (p.prix_vente - p.prix_achat);
    margeTotale += marge;
    parProduit[p.nom] = (parProduit[p.nom] ?? 0) + marge;
  }

  const frais = charges.loyer + charges.electricite + charges.salaires + charges.autres;
  const net = margeTotale - frais;
  const ratio = margeTotale > 0 ? ((net) / margeTotale) * 100 : 0;

  return {
    marge_brute_totale: Math.round(margeTotale * 100) / 100,
    charges_fixes: Math.round(frais * 100) / 100,
    roi_net: Math.round(net * 100) / 100,
    ratio_roi_pourcent: Math.round(ratio * 10) / 10,
    rentable: net >= 0,
    par_produit: Object.fromEntries(
      Object.entries(parProduit)
        .map(([k, v]) => [k, Math.round(v * 100) / 100])
        .sort(([, a], [, b]) => (b as number) - (a as number))
    ),
    periode: {
      debut: debut.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0],
    },
  };
}
