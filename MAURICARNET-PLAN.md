# MauriCarnet — Plan d'exécution & Journal

## 1. Dépendances & Prérequis
- Node.js 18+
- Compte Supabase (gratuit)
- Compte Vercel (Hobby)
- Navigateur moderne (PWA)

---

## 2. Phases & Journal de bord

### Phase 1 : Fondations
**Objectif :** Mettre en place le squelette du projet (Next.js, Supabase, Dexie, PWA)

- [x] Tâche 1.1 : Initialiser Next.js + Tailwind + TypeScript
- [x] Tâche 1.2 : Configurer Supabase (schéma + client)
- [x] Tâche 1.3 : Configurer Dexie.js (mêmes tables en local)
- [x] Tâche 1.4 : Structure PWA (manifest, service worker, icons)

**Fichiers créés :**
| Fichier | Rôle |
|---------|------|
| `src/lib/supabase.ts` | Client Supabase (via env vars) |
| `src/lib/db.ts` | Dexie DB avec types Produit, Client, Transaction |
| `supabase/schema.sql` | Schéma PostgreSQL (3 tables + index) |
| `src/app/manifest.ts` | Web App Manifest PWA |
| `public/sw.js` | Service Worker (cache-first, offline) |
| `public/icon-*.svg` | Icônes PWA (192x192, 512x512) |
| `.env.example` | Template des variables d'environnement |
| `next.config.ts` | Config Next.js (headers PWA) |

**Décisions :**
| Date | Décision | Justification |
|------|----------|---------------|
| 10/05/2026 | Next.js App Router + Tailwind | Stack légère, mobile-first, Vercel-native |
| 10/05/2026 | Dexie.js plutôt que localStorage brut | Transactions ACID, typage, query flexible |
| 10/05/2026 | Service worker custom (pas Serwist) | Évite dépendance lourde, contrôle total |
| 10/05/2026 | SVGs pour icônes PWA | Vectoriel = pas de génération d'images nécessaire |

**Problèmes rencontrés :**
| Date | Problème | Solution |
|------|----------|----------|
| 10/05/2026 | `create-next-app` refuse les majuscules dans le nom du dossier | Création dans un dossier `temp-next`, déplacement des fichiers vers la racine |
| 10/05/2026 | Warning `viewport` dans metadata export (Next.js 16) | Déplacer `viewport` dans un export `Viewport` séparé

---

### Phase 2 : Offline-First & Sync
**Objectif :** CRUD local + synchronisation asynchrone avec Supabase

- [x] Tâche 2.1 : CRUD local via Dexie
- [x] Tâche 2.2 : Service worker sync Supabase ← IndexedDB
- [x] Tâche 2.3 : Gestion conflits (last-write-wins local)

**Fichiers créés :**
| Fichier | Rôle |
|---------|------|
| `src/lib/crud.ts` | CRUD Produits, Clients, Transactions sur Dexie |
| `src/lib/sync.ts` | Sync locale → Supabase + pull produits |
| `public/sw.js` | Service worker v2 avec background sync (`sync-mauricarnet`) |
| `src/app/api/sync/route.ts` | API route /api/sync pour le SW |
| `src/app/offline/page.tsx` | Page offline affichée en cache |

**Décisions :**
| Date | Décision | Justification |
|------|----------|---------------|
| 10/05/2026 | CRUD encapsulé dans `crud.ts` (pas direct dans les composants) | Réutilisable, testable, un seul point de contact avec Dexie |
| 10/05/2026 | Sync déclenchée par l'event `sync` du service worker | Background sync natif, pas de polling |
| 10/05/2026 | Conflit : last-write-wins local | Simple, correspond au besoin terrain |

**Problèmes rencontrés :**
_— Aucun pour l'instant —_

---

### Phase 3 : Interface Mobile-First
**Objectif :** Pages principales avec navigation iconographique

- [x] Tâche 3.1 : Layout + navigation iconographique
- [x] Tâche 3.2 : Page Produits (CRUD)
- [x] Tâche 3.3 : Page Clients (CRUD + dette)
- [x] Tâche 3.4 : Page Transactions (vente cash/dette, paiement partiel)

**Fichiers créés :**
| Fichier | Rôle |
|---------|------|
| `src/components/BottomNav.tsx` | Barre de navigation mobile (Ventes, Produits, Clients) |
| `src/app/page.tsx` | Dashboard avec carte d'accès aux sections |
| `src/app/ventes/page.tsx` | Sélection produit, quantité, paiement cash/dette |
| `src/app/produits/page.tsx` | CRUD produits avec sélecteur d'icônes |
| `src/app/clients/page.tsx` | CRUD clients + détail dette + paiement partiel |
| `src/app/rapports/page.tsx` | ROI dashboard avec charges fixes configurables |

**Décisions :**
| Date | Décision | Justification |
|------|----------|---------------|
| 10/05/2026 | Bottom nav fixe en bas | Pattern mobile standard, toujours accessible |
| 10/05/2026 | Modal bottom sheet pour formulaires | UX mobile native, pas de navigation supplémentaire |

**Problèmes rencontrés :**
_— Aucun pour l'instant —_

---

### Phase 4 : Logique Métier
**Objectif :** Calcul automatique du ROI et tableau de bord

- [x] Tâche 4.1 : Validation Python de l'algo ROI (marge brute, charges fixes)
- [x] Tâche 4.2 : Implémentation ROI + Dashboard

**Fichiers créés :**
| Fichier | Rôle |
|---------|------|
| `scripts/validation_roi.py` | Validation Python de l'algo ROI |
| `src/lib/roi.ts` | Calcul ROI en TypeScript (marge, charges, ratio) |
| `src/app/rapports/page.tsx` | Dashboard Rapports avec formulaire charges + résultats |

**Décisions :**
| Date | Décision | Justification |
|------|----------|---------------|
| 10/05/2026 | ROI calculé côté client (Dexie) | Pas besoin de serveur, offline-first |
| 10/05/2026 | Charges fixes configurables dans l'UI | L'utilisateur connaît ses propres coûts |

**Problèmes rencontrés :**
_— Aucun pour l'instant —_

---

### Phase 5 : Déploiement
**Objectif :** Mise en production et validation mobile

- [ ] Tâche 5.1 : Push GitHub + Import Vercel
- [ ] Tâche 5.2 : Configurer les variables d'env dans Vercel
- [ ] Tâche 5.3 : Tests offline/online mobile
- [ ] Tâche 5.4 : Itérations

**Décisions :**
| Date | Décision | Justification |
|------|----------|---------------|
| 10/05/2026 | RLS + auth API sync | Sécurité : la clé anon est publique côté client |
| 10/05/2026 | CSP + headers sécurité | Protection XSS, clickjacking, MIME sniffing |
| 10/05/2026 | Service role key côté serveur | Bypasse RLS pour les opérations d'admin uniquement |

**Problèmes & Correctifs sécurité :**
| Problème | Correctif |
|----------|-----------|
| Aucune politique RLS sur Supabase | Ajout de RLS + policies "allow all" sur les 3 tables |
| Endpoint /api/sync sans auth | Ajout d'un Bearer token (API_SYNC_TOKEN) |
| Clé anon utilisée côté serveur | Switch vers SUPABASE_SERVICE_ROLE_KEY |
| Aucun header de sécurité | CSP, X-Frame-Options, HSTS, etc. dans next.config.ts |
| Service worker pas de timeout | AbortController 10s + validation same-origin |
| npm audit: 2 moderate (PostCSS) | Build-time only, pas de correctif sans casser Next.js |

**Configuration requise avant déploiement :**
1. Rotation de la clé anon Supabase (par précaution)
2. Récupérer la `service_role` key depuis Supabase → Settings → API
3. Générer un token aléatoire pour `API_SYNC_TOKEN`
4. Définir ces 3 variables dans le dashboard Vercel

**Problèmes rencontrés :**
| Date | Problème | Solution |
|------|----------|----------|
| 10/05/2026 | Build planté car `SUPABASE_SERVICE_ROLE_KEY` non défini au build | Client Supabase créé à l'intérieur du handler, pas en module scope |

---

## 3. Règles strictes
1. **Fichiers < 150 lignes** (sauf config)
2. **Commentaires & UI en français**
3. **Valider algo en Python avant implémentation**
4. **Chaque décision est datée et justifiée ici**
