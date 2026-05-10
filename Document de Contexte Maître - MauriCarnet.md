# **DOCUMENT DE RÉFÉRENCE : MAURICARNET (SAAS LOCAL-FIRST)**

## **1\. VISION DU PROJET**

**Nom :** MauriCarnet **Objectif :** Digitaliser la gestion des ventes et du "carnet de dettes" des boutiques et supermarchés en Mauritanie. **Cœur de métier :** Une application Mobile-First, ultra-simple, permettant de suivre les ventes, de gérer les dettes clients de manière flexible (culturelle) et de calculer automatiquement la rentabilité (ROI).

## **2\. PROFIL DE L'ORCHESTRATEUR (L'UTILISATEUR)**

* **Compétences :** Logique de programmation solide (Python, R), analyse de données.  
* **Rôle :** Chef de Projet et Architecte. Je ne rédige pas la syntaxe Front-end (JS/TS), je délègue l'écriture à l'IA.  
* **Méthode :** Orchestration IA par "petites tâches" (atomisation). Je valide la logique métier via Python avant intégration.

## **3\. ARCHITECTURE TECHNIQUE & HÉBERGEMENT**

* **Framework Frontend :** Next.js (React) \+ Tailwind CSS (Mobile-first).  
* **Hébergement :** Vercel (Hobby Plan).  
* **Back-end (Logique) :** Fonctions Serverless Python sur Vercel pour les calculs complexes (ROI, statistiques).  
* **Base de données Cloud (SaaS) :** Supabase (PostgreSQL) \- Limite 500 Mo (Optimiser le poids des lignes).  
* **Base de données Locale (Offline) :** IndexedDB via la bibliothèque Dexie.js (pour la robustesse).  
* **PWA :** L'application doit être installable sur smartphone et fonctionner sans connexion.

## **4\. STRATÉGIE "OFFLINE-FIRST" (PRIORITAIRE)**

L'application doit privilégier le fonctionnement local pour contrer l'instabilité du réseau en Mauritanie.

1. **Écriture :** Toute transaction est inscrite immédiatement dans IndexedDB.  
2. **Sync :** Un Service Worker détecte la connexion et synchronise les données vers Supabase en arrière-plan.  
3. **Conflits :** En cas de conflit de données, la dernière modification locale prime.

## **5\. LOGIQUE MÉTIER SPÉCIFIQUE (MAURITANIE)**

* **Le Carnet (Dettes) :** Gérer les paiements partiels (Ex: Dette de 500 MRU, paiement de 200 MRU, reste 300 MRU).  
* **ROI Automatique :** Calculer la marge brute \= Prix\_Vente \- Prix\_Achat. Calculer le ROI net en soustrayant les charges fixes configurables (loyer, électricité).  
* **Simplicité :** Interface visuelle (icônes) pour minimiser la saisie de texte.

## **6\. STRUCTURE DE DONNÉES MINIMALE (V1)**

* **Table Produits :** id, nom, prix\_achat, prix\_vente, stock\_actuel, icône/emoji.  
* **Table Clients :** id, nom, telephone, total\_dette.  
* **Table Transactions :** id, produit\_id, client\_id (optionnel), type (cash/dette), montant\_payé, reste\_a\_payer, timestamp.

## **7\. RÈGLES D'OR POUR L'IA (INSTRUCTIONS SYSTÈME)**

1. **Modularité :** Ne génère jamais un fichier de plus de 150 lignes. Divise en petits composants.  
2. **Commentaires :** Tous les commentaires de code et les textes de l'interface doivent être en **Français**.  
3. **Validation :** Avant de coder une fonction de calcul, propose-moi l'algorithme en pseudo-code ou en Python pour validation.  
4. **Optimisation Vercel :** Minimise l'utilisation de bibliothèques externes lourdes pour rester dans les limites du plan gratuit.  
5. **Erreurs :** En cas d'erreur technique, explique la cause avant de proposer la correction.

**ÉTAPE ACTUELLE :** Initialisation du projet et définition du schéma de base de données Supabase.