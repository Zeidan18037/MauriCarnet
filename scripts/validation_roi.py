"""
Validation de l'algorithme de calcul du ROI avant intégration dans MauriCarnet.

Règles métier:
  - Marge brute par vente = prix_vente - prix_achat
  - ROI net = somme(marges_brutes) - charges_fixes (loyer, électricité, etc.)
  - Les charges fixes sont configurables (mensuelles)
"""

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class Produit:
    nom: str
    prix_achat: float
    prix_vente: float


@dataclass
class Vente:
    produit: Produit
    quantite: int
    date: datetime


@dataclass
class ChargesFixes:
    loyer: float = 0
    electricite: float = 0
    salaires: float = 0
    autres: float = 0

    def total(self) -> float:
        return self.loyer + self.electricite + self.salaires + self.autres


def marge_brute(vente: Vente) -> float:
    return (vente.produit.prix_vente - vente.produit.prix_achat) * vente.quantite


def marge_brute_totale(ventes: list[Vente]) -> float:
    return sum(marge_brute(v) for v in ventes)


def marge_par_produit(ventes: list[Vente]) -> dict[str, float]:
    result: dict[str, float] = {}
    for v in ventes:
        result[v.produit.nom] = result.get(v.produit.nom, 0) + marge_brute(v)
    return result


def roi_net(ventes: list[Vente], charges: ChargesFixes) -> dict:
    brut = marge_brute_totale(ventes)
    frais = charges.total()
    net = brut - frais
    ratio = ((brut - frais) / brut * 100) if brut > 0 else 0

    return {
        "marge_brute_totale": round(brut, 2),
        "charges_fixes": round(frais, 2),
        "roi_net": round(net, 2),
        "ratio_roi_pourcent": round(ratio, 1),
        "rentable": net >= 0,
        "par_produit": {
            p: round(m, 2) for p, m in sorted(marge_par_produit(ventes).items())
        },
    }


if __name__ == "__main__":
    # Données de test simulées
    produits = [
        Produit("Lait", 200, 250),
        Produit("Pain", 50, 80),
        Produit("Riz", 300, 400),
        Produit("Huile", 350, 500),
    ]

    ventes = [
        Vente(produits[0], 10, datetime.now() - timedelta(days=1)),
        Vente(produits[1], 30, datetime.now() - timedelta(days=1)),
        Vente(produits[2], 5, datetime.now() - timedelta(days=1)),
        Vente(produits[3], 3, datetime.now() - timedelta(hours=2)),
    ]

    charges = ChargesFixes(loyer=5000, electricite=2000, salaires=15000, autres=1000)

    resultat = roi_net(ventes, charges)

    print("=" * 45)
    print("VALIDATION ROI - MauriCarnet")
    print("=" * 45)
    print(f"\nMarge brute totale: {resultat['marge_brute_totale']:>8} MRU")
    print(f"Charges fixes:       {resultat['charges_fixes']:>8} MRU")
    print("-" * 45)
    statut = "RENTABLE" if resultat["rentable"] else "PERTE"
    print(f"{statut:>15s}: {resultat['roi_net']:>8} MRU")
    print(f"Ratio ROI:            {resultat['ratio_roi_pourcent']:>7}%")
    print(f"\nPar produit:")
    for p, m in resultat["par_produit"].items():
        print(f"  {p:12s} -> {m:>8} MRU")
