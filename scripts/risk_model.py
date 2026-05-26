"""
Modèle de risque stochastique (Cramér-Lundberg) — MauriCarnet.
================================================================

Évalue la solvabilité d'un boutiquier de l'économie informelle
mauritanienne à l'aide de la théorie de la ruine.

Références :
  - Asmussen & Albrecher, "Ruin Probabilities" (2010)
  - Grandell, "Aspects of Risk Theory" (1991)
  - Cramér, "Collective Risk Theory" (1955)

Formules clés :
  E[U(t)] = U_0 + (c - lambda/beta) * t
  Var[U(t)] = lambda * 2/beta^2 * t
  Psi(U_0) = (lambda/(c*beta)) * exp(-(beta - lambda/c) * U_0)
"""

import math
from dataclasses import dataclass


# ────────────────────────────────
#  Structures de données
# ────────────────────────────────


@dataclass
class RiskInput:
    """Paramètres d'entrée du modèle, typiquement extraits de Supabase / Dexie."""

    cash_on_hand: float
    """Trésorerie disponible (MRU)."""

    daily_profit_avg: float
    """Profit journalier moyen c (MRU/jour)."""

    debts_owed_to_shop: float
    """Somme des créances clients (MRU)."""

    estimated_default_rate: float
    """Taux de défaut estimé p_defaut (0..1)."""

    shock_frequency_days: float
    """Intervalle moyen entre deux mauvais jours (jours). Inversement proportionnel à lambda."""

    avg_shock_severity: float
    """Sévérité moyenne d'un choc (MRU). Inversement proportionnel à beta."""


@dataclass
class RiskReport:
    """Métriques de risque calculées par le modèle."""

    adjusted_capital: float
    daily_profit_rate: float
    shock_frequency_lambda: float
    mean_shock_severity: float
    net_profit_condition_met: bool
    expected_cash_1y: float
    variance_cash_1y: float
    ruin_probability: float
    stability_score: float
    risk_rating: str


# ────────────────────────────────
#  Moteur de risque
# ────────────────────────────────


_RATING_CUTOFFS: list[tuple[float, str]] = [
    (95, "AAA"),
    (90, "AA"),
    (80, "A"),
    (70, "BBB"),
    (60, "BB"),
    (50, "B"),
    (30, "CCC"),
    (0, "D"),
]


class InformalRiskModel:
    """Modèle de Cramér-Lundberg pour le scoring de crédit informel.

    Paramètres du processus de risque :
        U0 : capital initial ajusté (MRU)
        c  : taux de prime / profit journalier (MRU/jour)
        Y_i ~ Exp(beta) : sévérité des chocs
        N(t) ~ Poisson(lambda t) : fréquence des chocs

    Condition de bénéfice net (drift > 0) : c > lambda / beta

    Méthodes
    --------
    adjusted_capital()
        U0 = Cash + Σ Dettes * (1 - p_defaut)

    expected_cash(t)
        E[U(t)] = U0 + (c - lambda/beta) * t

    variance_cash(t)
        Var(U(t)) = lambda * (2 / beta^2) * t

    ruin_probability()
        Psi(U0) = (lambda/(c*beta)) * exp(-(beta - lambda/c) * U0)

    stability_score()
        Score = 100 * (1 - Psi(U0)), borné [0, 100]

    generate_report(horizon_days=365)
        Agrège toutes les métriques dans un RiskReport.
    """

    def __init__(self, data: RiskInput):
        self.cash = data.cash_on_hand
        self.c = data.daily_profit_avg
        self.debts = data.debts_owed_to_shop
        self.p_def = data.estimated_default_rate
        self.lambd = 1.0 / data.shock_frequency_days
        self.beta = 1.0 / data.avg_shock_severity
        self.U0 = self.adjusted_capital()
        self.net_condition = self.c > self.lambd / self.beta

    def adjusted_capital(self) -> float:
        """U0 = cash + somme(dettes_clients * (1 - p_defaut))"""
        return self.cash + self.debts * (1.0 - self.p_def)

    def expected_cash(self, t: float) -> float:
        """E[U(t)] = U0 + (c - lambda/beta) * t"""
        return self.U0 + (self.c - self.lambd / self.beta) * t

    def variance_cash(self, t: float) -> float:
        """Var(U(t)) = lambda * (2 / beta^2) * t"""
        return self.lambd * (2.0 / (self.beta**2)) * t

    def ruin_probability(self) -> float:
        """Psi(U0) = (lambda/(c*beta)) * exp(-(beta - lambda/c) * U0)

        Formule exacte pour chocs exponentiels, horizon infini.
        Retourne 1.0 si la condition de bénéfice net n'est pas vérifiée.
        """
        if not self.net_condition or self.U0 <= 0:
            return 1.0
        return (self.lambd / (self.c * self.beta)) * math.exp(
            -(self.beta - self.lambd / self.c) * self.U0
        )

    def stability_score(self) -> float:
        """Score de stabilité sur 100 = max(0, min(100, 100*(1-Psi(U0))))"""
        psi = self.ruin_probability()
        return max(0.0, min(100.0, 100.0 * (1.0 - psi)))

    @staticmethod
    def _rating(score: float) -> str:
        for seuil, label in _RATING_CUTOFFS:
            if score >= seuil:
                return label
        return "D"

    def generate_report(self, horizon_days: float = 365.0) -> RiskReport:
        """Calcule et retourne toutes les métriques agregees.

        Parametres
        ----------
        horizon_days : float
            Horizon de projection en jours (defaut: 1 an).

        Retourne
        --------
        RiskReport
            Dictionnaire structure pret pour le frontend.
        """
        psi = self.ruin_probability()
        score = self.stability_score()

        return RiskReport(
            adjusted_capital=round(self.U0, 2),
            daily_profit_rate=round(self.c, 2),
            shock_frequency_lambda=round(self.lambd, 6),
            mean_shock_severity=round(1.0 / self.beta, 2),
            net_profit_condition_met=self.net_condition,
            expected_cash_1y=round(self.expected_cash(horizon_days), 2),
            variance_cash_1y=round(self.variance_cash(horizon_days), 2),
            ruin_probability=round(psi, 6),
            stability_score=round(score, 2),
            risk_rating=self._rating(score),
        )


# ────────────────────────────────
#  Point d'entree (tests)
# ────────────────────────────────

if __name__ == "__main__":
    # Données de l'exemple utilisateur
    test_input = RiskInput(
        cash_on_hand=2000,
        daily_profit_avg=500,
        debts_owed_to_shop=7379,
        estimated_default_rate=0.15,
        shock_frequency_days=30,
        avg_shock_severity=4000,
    )

    model = InformalRiskModel(test_input)
    report = model.generate_report()

    print("=" * 50)
    print("  MODÈLE DE RISQUE — CRAMÉR-LUNDBERG")
    print("  MauriCarnet — Scoring de crédit informel")
    print("=" * 50)
    print(f"\nParamètres du processus :")
    print(f"  Capital ajusté (U0)   : {report.adjusted_capital:>10.2f} MRU")
    print(f"  Profit journalier (c) : {report.daily_profit_rate:>10.2f} MRU/j")
    print(f"  Lambda (fréq. chocs)  : {report.shock_frequency_lambda:>10.6f} /jour")
    print(f"  Beta (1/sévérité)     : {report.mean_shock_severity:>10.2f} MRU")
    print(f"  Condition benefice    : {'OUI' if report.net_profit_condition_met else 'NON'}")

    print(f"\nProjection à 1 an :")
    print(f"  E[U(365)]            : {report.expected_cash_1y:>10.2f} MRU")
    print(f"  Var[U(365)]          : {report.variance_cash_1y:>10.2f} MRU²")

    print(f"\nRisque de ruine :")
    print(f"  Psi(U0)              : {report.ruin_probability:>10.6f} ({report.ruin_probability * 100:.4f}%)")
    print(f"  Score de stabilité   : {report.stability_score:>10.2f} / 100")
    print(f"  Notation risque      : {report.risk_rating:>10s}")

    print(f"\nInterpretation :")
    rating_desc = {
        "AAA": "Risque quasi nul. Excellente santé financière.",
        "AA":  "Risque très faible. Très bonne résilience.",
        "A":   "Risque faible. Bonne capacité à absorber les chocs.",
        "BBB": "Risque modéré. Surveillance recommandée.",
        "BB":  "Risque notable. Vulnérable aux chocs.",
        "B":   "Risque élevé. Difficilement résilient.",
        "CCC": "Risque très élevé. Proche de la ruine.",
        "D":   "Ruine probable. Intervention urgente nécessaire.",
    }
    print(f"  {report.risk_rating} — {rating_desc.get(report.risk_rating, '')}")
    print()
