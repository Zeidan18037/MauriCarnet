# Rapport Scientifique — Modèle de Ruine Stochastique pour le Scoring de Crédit Informel

## MauriCarnet — Cramér–Lundberg Risk Engine

---

## Abstract

Dans l'économie informelle mauritanienne, l'octroi de crédit par les
boutiquiers repose sur une confiance interpersonnelle sans garantie
formelle ni historique de crédit standardisé. Ce rapport présente un
modèle mathématique de scoring de crédit basé sur la **théorie de la
ruine stochastique** pour quantifier la solvabilité d'un micro-commerçant.

Le processus de risque de Cramér–Lundberg modélise la trésorerie du
boutiquier comme un processus de Poisson composé : le profit journalier
constitue le drift positif, tandis que les chocs exogènes (impayés,
vols, pannes, maladies) sont les sauts négatifs. Sous l'hypothèse de
sévérité exponentielle des chocs, nous dérivons une forme fermée pour
la probabilité de ruine à horizon infini, utilisée comme métrique de
solvabilité.

**Mots-clés :** ruine stochastique, processus de Poisson composé,
Cramér–Lundberg, scoring de crédit, économie informelle, Mauritanie.

---

## 1. Introduction

Le secteur informel représente plus de 40 % du PIB en Mauritanie.
L'accès au crédit bancaire y est quasi inexistant pour les micro-entrepreneurs
(boutiquiers, vendeurs de rue, artisans). Le crédit fournisseur —
souvent appelé « crédit boutiquier » — est la norme : le commerçant
avance des marchandises sans intérêt, avec un remboursement aléatoire.

MauriCarnet est une application PWA (Progressive Web App) qui numérise
ce carnet de crédit traditionnel. Elle permet au boutiquier de suivre
ses ventes, ses stocks, et les dettes de ses clients.

Le présent rapport détaille le **moteur de risque mathématique** intégré
à MauriCarnet, qui attribue une note de solvabilité au boutiquier
lui-même (et non à ses clients) — un score de « santé d'entreprise »
pour l'économie informelle.

---

## 2. Modèle de Cramér–Lundberg

### 2.1 Définition du processus

Soit $U(t)$ la trésorerie du boutiquier à l'instant $t \geq 0$.
Le modèle de Cramér–Lundberg (1930) postule :

$$
U(t) = U_0 + ct - \sum_{i=1}^{N(t)} Y_i
$$

où :

| Symbole | Description | Unité |
|---------|-------------|-------|
| $U_0$ | Capital initial ajusté | MRU |
| $c$ | Taux de prime (profit journalier) | MRU/jour |
| $N(t)$ | Processus de Poisson de taux $\lambda$ | — |
| $\{Y_i\}$ | Chocs i.i.d. de loi $\text{Exp}(\beta)$ | MRU |

### 2.2 Interprétation dans le contexte boutiquier

- **$U_0$ (capital initial ajusté)** : trésorerie disponible du
  boutiquier augmentée des créances clients, pondérées par le risque
  de défaut.

  $$
  U_0 = \text{Cash} + \sum \text{Dettes}_\text{clients} \times (1 - p_\text{défaut})
  $$

  Le terme $(1 - p_\text{défaut})$ amortit les créances douteuses :
  si le boutiquier estime que 15 % de ses clients ne rembourseront
  jamais, seules 85 % des dettes sont considérées comme du capital
  effectif.

- **$c$ (taux de prime)** : profit net journalier moyen du boutiquier.
  Calculé comme la marge brute totale sur une période divisée par le
  nombre de jours de cette période.

- **$\lambda$ (fréquence des chocs)** : nombre moyen de « mauvais jours »
  par unité de temps. Un choc peut être un impayé massif, une panne
  d'équipement, un vol, une maladie, ou tout événement réduisant
  brutalement la trésorerie. Dans le modèle, $\lambda = 1/T$ où $T$
  est le nombre moyen de jours entre deux chocs.

- **$Y_i$ (sévérité des chocs)** : montant de la perte lors d'un
  mauvais jour. Suit une loi exponentielle de paramètre $\beta$,
  donc d'espérance $1/\beta$. Cette hypothèse est standard en théorie
  de la ruine (Asmussen & Albrecher, 2010) car elle permet des
  formes fermées pour les grandeurs d'intérêt.

### 2.3 Condition de bénéfice net

Le processus $U(t)$ a un **drift** (tendance) de :

$$
\mathbb{E}[U(t) - U_0] = \left(c - \frac{\lambda}{\beta}\right) t
$$

Pour que le processus ne soit pas presque sûrement ruiné à long terme,
il faut que le drift soit strictement positif :

$$
c > \frac{\lambda}{\beta}
$$

Cette condition exprime que le profit journalier moyen excède la perte
moyenne journalière due aux chocs. Si elle n'est pas vérifiée, la ruine
est certaine ($\Psi(U_0) = 1$).

### 2.4 Processus de Poisson composé

Soit $S(t) = \sum_{i=1}^{N(t)} Y_i$ le processus de saut. Par les
propriétés du processus de Poisson composé :

- $\mathbb{E}[S(t)] = \lambda t \cdot \mathbb{E}[Y] = \lambda t / \beta$
- $\text{Var}[S(t)] = \lambda t \cdot \mathbb{E}[Y^2] = 2\lambda t / \beta^2$

---

## 3. Dérivation des Formules

### 3.1 Espérance de la trésorerie

Par linéarité de l'espérance :

$$
\begin{aligned}
\mathbb{E}[U(t)] &= \mathbb{E}\left[U_0 + ct - \sum_{i=1}^{N(t)} Y_i\right] \\
&= U_0 + ct - \mathbb{E}[S(t)] \\
&= U_0 + ct - \frac{\lambda t}{\beta} \\
&= U_0 + \left(c - \frac{\lambda}{\beta}\right) t
\end{aligned}
$$

### 3.2 Variance de la trésorerie

Utilisant la formule de Wald pour la variance d'une somme composée :

$$
\begin{aligned}
\text{Var}(U(t)) &= \text{Var}\left(\sum_{i=1}^{N(t)} Y_i\right) \\
&= \mathbb{E}[N(t)] \cdot \text{Var}(Y) + \text{Var}(N(t)) \cdot \mathbb{E}[Y]^2 \\
&= \lambda t \cdot \frac{1}{\beta^2} + \lambda t \cdot \frac{1}{\beta^2} \\
&= \frac{2\lambda t}{\beta^2}
\end{aligned}
$$

### 3.3 Probabilité de ruine à horizon infini

La probabilité de ruine est définie comme :

$$
\Psi(u) = \mathbb{P}\left(\inf_{t \geq 0} U(t) < 0 \;\middle|\; U(0) = u\right)
$$

Pour le modèle de Cramér–Lundberg avec chocs exponentiels, la probabilité
de ruine (à horizon infini) admet une forme fermée.

#### Équation intégro-différentielle de la ruine

Soit $\Psi(u)$ la probabilité de ruine conditionnelle au capital initial
$u$. En conditionnant sur le premier choc, on obtient l'équation de
renouvellement de la ruine (Gerber, 1979) :

$$
\Psi(u) = \frac{\lambda}{c} \int_0^u \Psi(u - y) \, dF_Y(y) + \frac{\lambda}{c} \int_u^\infty dF_Y(y)
$$

où $F_Y$ est la fonction de répartition des chocs $Y_i$.

#### Solution pour des chocs exponentiels

Pour $Y_i \sim \text{Exp}(\beta)$, on a $f_Y(y) = \beta e^{-\beta y}$.
L'équation devient :

$$
\Psi(u) = \frac{\lambda}{c} \int_0^u \Psi(u - y) \beta e^{-\beta y} dy + \frac{\lambda}{c} e^{-\beta u}
$$

Par changement de variable $z = u - y$ :

$$
\Psi(u) = \frac{\lambda\beta}{c} \int_0^u \Psi(z) e^{-\beta(u-z)} dz + \frac{\lambda}{c} e^{-\beta u}
$$

En multipliant par $e^{\beta u}$ :

$$
\Psi(u) e^{\beta u} = \frac{\lambda\beta}{c} \int_0^u \Psi(z) e^{\beta z} dz + \frac{\lambda}{c}
$$

En dérivant par rapport à $u$ :

$$
\Psi'(u) e^{\beta u} + \beta \Psi(u) e^{\beta u} = \frac{\lambda\beta}{c} \Psi(u) e^{\beta u}
$$

Soit :

$$
\Psi'(u) = -\left(\beta - \frac{\lambda\beta}{c}\right) \Psi(u) = -\beta\left(1 - \frac{\lambda}{c\beta}\right) \Psi(u)
$$

En posant $R = \beta - \lambda/c$ (l'exposant d'ajustement), l'équation
différentielle s'écrit :

$$
\Psi'(u) = -R \cdot \Psi(u)
$$

La solution générale est $\Psi(u) = K \cdot e^{-R u}$.

La constante $K$ est déterminée par la condition $\Psi(0) = \lambda/(c\beta)$
(probabilité de ruine avec capital initial nul) :

$$
\Psi(u) = \frac{\lambda}{c\beta} e^{-\left(\beta - \frac{\lambda}{c}\right) u}
$$

#### Formule finale

$$
\Psi(U_0) = \frac{\lambda}{c\beta} \exp\left(-\left(\beta - \frac{\lambda}{c}\right) U_0\right)
$$

sous la condition $c > \lambda/\beta$.

### 3.4 Score de stabilité

Le score de stabilité est une transformation affine de la probabilité
de ruine, normalisée sur 100 :

$$
\text{Score} = 100 \times (1 - \Psi(U_0)) \in [0, 100]
$$

---

## 4. Grille de Notation (Rating)

| Score | Rating | Interprétation |
|------:|:------:|----------------|
| ≥ 95  | **AAA** | Risque quasi nul. Excellente santé financière. |
| ≥ 90  | **AA**  | Risque très faible. Très bonne résilience. |
| ≥ 80  | **A**   | Risque faible. Bonne capacité à absorber les chocs. |
| ≥ 70  | **BBB** | Risque modéré. Surveillance recommandée. |
| ≥ 60  | **BB**  | Risque notable. Vulnérable aux chocs. |
| ≥ 50  | **B**   | Risque élevé. Difficilement résilient. |
| ≥ 30  | **CCC** | Risque très élevé. Proche de la ruine. |
| < 30  | **D**   | Ruine probable. Intervention urgente nécessaire. |

Cette grille suit la nomenclature standard des agences de notation
(S&P, Moody's) adaptée au contexte de la micro-finance informelle.

---

## 5. Exemple Numérique

### 5.1 Données d'entrée

Reprenons l'exemple d'un boutiquier type :

| Paramètre | Valeur | Unité |
|-----------|-------:|-------|
| Trésorerie disponible | 2 000 | MRU |
| Profit journalier moyen | 500 | MRU/j |
| Créances clients | 7 379 | MRU |
| Taux de défaut estimé | 15 % | — |
| Intervalle moyen entre chocs | 30 | jours |
| Sévérité moyenne d'un choc | 4 000 | MRU |

### 5.2 Calcul des paramètres

$$
\begin{aligned}
U_0 &= 2\,000 + 7\,379 \times (1 - 0{,}15) = 2\,000 + 6\,272{,}15 = 8\,272{,}15 \text{ MRU} \\
\lambda &= \frac{1}{30} \approx 0{,}03333 \text{ chocs/jour} \\
\beta &= \frac{1}{4\,000} = 0{,}00025 \\
\frac{\lambda}{\beta} &= \frac{0{,}03333}{0{,}00025} = 133{,}33 \\
c &= 500 > 133{,}33 \quad \Rightarrow \text{condition de bénéfice net vérifiée}
\end{aligned}
$$

### 5.3 Métriques

$$
\begin{aligned}
\mathbb{E}[U(365)] &= 8\,272{,}15 + (500 - 133{,}33) \times 365 \\
&= 8\,272{,}15 + 366{,}67 \times 365 \\
&= 8\,272{,}15 + 133\,833{,}33 \\
&= 142\,105{,}48 \text{ MRU} \\
\\
\text{Var}(U(365)) &= 0{,}03333 \times \frac{2}{0{,}00025^2} \times 365 \\
&= 0{,}03333 \times 32\,000\,000 \times 365 \\
&\approx 389\,333\,333 \text{ MRU}^2 \\
\\
\Psi(U_0) &= \frac{0{,}03333}{500 \times 0{,}00025} \times
\exp\left(-(0{,}00025 - \frac{0{,}03333}{500}) \times 8\,272{,}15\right) \\
&= 0{,}26667 \times \exp(-0{,}00018333 \times 8\,272{,}15) \\
&= 0{,}26667 \times \exp(-1{,}5167) \\
&= 0{,}26667 \times 0{,}2194 \\
&\approx 0{,}0585 \;(5{,}85\,\%) \\
\\
\text{Score} &= 100 \times (1 - 0{,}0585) \approx 94{,}15 \;\rightarrow\; \textbf{AA}
\end{aligned}
$$

### 5.4 Interprétation

Le boutiquier a un score de 94,15/100 — notation **AA**. Il présente
un risque très faible de ruine sur l'horizon considéré. Sa trésorerie
projetée à 1 an est de 142 105 MRU en moyenne, avec une forte variance
(écart-type ≈ 19 733 MRU) due à la stochasticité des chocs.

---

## 6. Implémentation

### 6.1 Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js)              │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Dashboard    │  │ Page Rapports            │  │
│  │ (Score Risk) │  │ (ROI + Risk détaillé)    │  │
│  └──────┬──────┘  └──────────┬───────────────┘  │
│         │                    │                  │
│  ┌──────┴────────────────────┴───────────────┐  │
│  │         src/lib/risk.ts                   │  │
│  │  generateRiskReport(input) → RiskReport    │  │
│  └──────┬────────────────────────────────────┘  │
│         │ appel direct (client-side)           │
│         │ ou via fetch(/api/risk)              │
│  ┌──────┴────────────────────────────────────┐  │
│  │  Dexie (IndexedDB) / Supabase              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 6.2 Modules

| Fichier | Langage | Rôle |
|---------|---------|------|
| `scripts/risk_model.py` | Python | Validation mathématique standalone. Calcule les mêmes formules, exécutable en ligne de commande. |
| `src/lib/risk.ts` | TypeScript | Moteur de risque intégré à l'application. Exporte `generateRiskReport()` et `buildRiskInputFromDB()`. |
| `src/app/api/risk/route.ts` | TypeScript | Endpoint POST qui construit le RiskReport à partir de données JSON (authentifié par JWT Supabase). |

### 6.3 Mapping des données

| Supabase / Dexie | Paramètre du modèle | Notation |
|------------------|--------------------|----------|
| `SUM(cash transactions)` (proxy) | Trésorerie | $U_0$ (partie cash) |
| `daily_profit_avg` | Profit journalier | $c$ |
| `SUM(clients.total_dette)` | Créances | $\sum \text{Dettes}$ |
| `estimated_default_rate` | Risque de défaut | $p_{\text{défaut}}$ |
| `shock_frequency_days` | Intervalle entre chocs | $1/\lambda$ |
| `avg_shock_severity` | Sévérité moyenne | $1/\beta$ |

---

## 7. Limites et Extensions

### 7.1 Limites du modèle actuel

- **Horizon infini** : la formule $\Psi(U_0)$ suppose un horizon
  temporel infini. En pratique, un horizon fini $T$ serait plus
  réaliste, mais ne possède pas de forme fermée simple.

- **Chocs exponentiels** : l'hypothèse de sévérité exponentielle
  simplifie les calculs mais peut sous-estimer les queues lourdes
  (chocs extrêmes rares mais catastrophiques).

- **Stationnarité** : $\lambda$ et $\beta$ sont supposés constants
  dans le temps. En réalité, la fréquence et la sévérité des chocs
  peuvent varier saisonnièrement.

- **Indépendance** : les chocs sont supposés indépendants, ce qui
  ignore les effets de contagion (ex. une crise économique affectant
  tous les clients simultanément).

- **Absence de réassurance** : le modèle ne permet pas au boutiquier
  de se couvrir contre les chocs (épargne de précaution, tontine,
  micro-assurance).

### 7.2 Extensions possibles

| Extension | Description | Référence |
|-----------|-------------|-----------|
| **Horizon fini** | $\Psi(u, T)$ par transformée de Laplace inverse ou méthode de Monte Carlo | Asmussen (2010), ch. V |
| **Chocs de Pareto** | $Y_i \sim \text{Pareto}(\alpha, x_m)$ pour capturer les queues lourdes | Embrechts et al. (1997) |
| **Processus de Cox** | $\lambda(t)$ stochastique pour modéliser la saisonnalité | Grandell (1991) |
| **Barrière de dividendes** | Le boutiquier peut retirer de l'argent quand $U(t)$ dépasse un seuil | Albrecher & Teugels (2006) |
| **Réassurance stop-loss** | Limitation de la perte maximale par choc | Schmidli (2002) |
| **Processus de Hawkes** | Chocs auto-excités (un sinistre en provoque d'autres) | Hawkes (1971) |
| **Modèle multi-états** | Chaîne de Markov modulant l'intensité des chocs (régime normal vs. crise) | Hamilton (1989) |

### 7.3 Calibration des paramètres

Les paramètres $\lambda$ et $\beta$ sont actuellement fixés par défaut
($\lambda = 1/30$ jours, $\beta = 1/4\,000$ MRU). Une extension future
pourrait les calibrer automatiquement à partir de l'historique des
transactions du boutiquier :

- $\hat{\lambda}$ = nombre moyen de transactions à perte (marge
  négative) par jour, ou d'impayés clients.
- $\hat{\beta}$ = 1 / marge brute moyenne des jours négatifs.

---

## 8. Références

1. **Cramér, H.** (1955). *Collective Risk Theory*. Skandia Jubilee
   Volume, Stockholm.

2. **Lundberg, F.** (1903). *Approximerad framställning av
   sannolikhetsfunktionen*. PhD thesis, Uppsala.

3. **Asmussen, S. & Albrecher, H.** (2010). *Ruin Probabilities*.
   2nd ed., World Scientific. ISBN: 978-981-4282-52-9.

4. **Grandell, J.** (1991). *Aspects of Risk Theory*. Springer.
   ISBN: 978-0-387-97368-1.

5. **Gerber, H.U.** (1979). *An Introduction to Mathematical Risk
   Theory*. S.S. Huebner Foundation, Wharton School.

6. **Embrechts, P., Klüppelberg, C. & Mikosch, T.** (1997).
   *Modelling Extremal Events*. Springer. ISBN: 978-3-540-60931-5.

7. **Schmidli, H.** (2002). *Risk Theory*. Lecture Notes, University
   of Copenhagen.

8. **Albrecher, H. & Teugels, J.L.** (2006). *Exponential behavior in
   the presence of constant dividend barriers*. Insurance: Mathematics
   and Economics, 38(1), 183–199.

9. **Hawkes, A.G.** (1971). *Spectra of some self-exciting and
   mutually exciting point processes*. Biometrika, 58(1), 83–90.

10. **Hamilton, J.D.** (1989). *A new approach to the economic analysis
    of nonstationary time series*. Econometrica, 57(2), 357–384.

---

## Annexe A — Code Python (scripts/risk_model.py)

Le fichier `scripts/risk_model.py` contient une implémentation
standalone du modèle qui peut être exécutée pour validation :

```bash
python scripts/risk_model.py
```

La classe `InformalRiskModel` prend un dictionnaire `RiskInput`
et expose les méthodes `adjusted_capital()`, `expected_cash(t)`,
`variance_cash(t)`, `ruin_probability()`, `stability_score()`,
et `generate_report()`.

---

## Annexe B — Code TypeScript (src/lib/risk.ts)

Le fichier `src/lib/risk.ts` porte les mêmes formules en TypeScript
pour une intégration directe dans l'écosystème Next.js. Il exporte
également `buildRiskInputFromDB(userId)` qui construit automatiquement
le `RiskInput` à partir des données Dexie (IndexedDB).

---

*Document rédigé pour le projet MauriCarnet — Mai 2026.*
*Contact : équipe de développement MauriCarnet.*
