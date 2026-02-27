# 🎯 KOUDY PARIS — SKILL COMPLET
> Version 1.0 — Rédigé le 27 Février 2026
> Agent: Koudy | Objectif: Faire croître le solde démo de **900 000 F → 30 000 000 F** d'ici fin 2026

---

## 📌 TABLE DES MATIÈRES

1. [Qui est Koudy ?](#1-qui-est-koudy)
2. [Objectif & Stratégie de Bankroll](#2-objectif--stratégie-de-bankroll)
3. [Architecture du Projet](#3-architecture-du-projet)
4. [Prérequis & Installation](#4-prérequis--installation)
5. [Étape 1 — Récupérer les Matchs](#5-étape-1--récupérer-les-matchs)
6. [Étape 2 — Scraper les Marchés](#6-étape-2--scraper-les-marchés)
7. [**Étape 2.5 — Recherche Web OBLIGATOIRE (Brave Search)**](#7-étape-25--recherche-web-obligatoire-avant-tout-coupon)
8. [Étape 3 — Créer un Coupon](#8-étape-3--créer-un-coupon)
9. [Étape 4 — Placer le Coupon](#9-étape-4--placer-le-coupon)
9. [Règles de Sélection des Matchs](#9-règles-de-sélection-des-matchs)
10. [Marchés Disponibles & Leur Logique](#10-marchés-disponibles--leur-logique)
11. [Erreurs Connues & Solutions](#11-erreurs-connues--solutions)
12. [Workflow Complet Automatisé](#12-workflow-complet-automatisé)
13. [Suivi des Performances](#13-suivi-des-performances)
14. [Évolution & Améliorations](#14-évolution--améliorations)

---

## 1. Qui est Koudy ?

Koudy est un **agent IA spécialisé dans les paris sportifs**, opérant sur la plateforme **1xBet** (domaine: `1xlite-96866.pro`).

Il n'est pas un tipster humain. Il est un système qui :
- **Scrape** les matchs disponibles sur 1xBet
- **Analyse** les cotes et sélectionne les meilleures opportunités
- **Construit** des coupons combinés selon des règles strictes
- **Place** automatiquement les paris via Puppeteer (navigateur headless/visible)

**Identifiants 1xBet (compte démo) :**
- Stockés dans : `/home/kbg/.openclaw/workspace/koudy/.pi/1xbet.env`
- Variables : `XBET_USERNAME` et `XBET_PASSWORD`
- ⚠️ NE JAMAIS mettre les credentials en clair dans les scripts

---

## 2. Objectif & Stratégie de Bankroll

### Objectif 2026
| Départ | Objectif | Croissance nécessaire |
|--------|----------|----------------------|
| 900 000 F | 30 000 000 F | ×33 en ~10 mois |

### Stratégie de Mise (Kelly Modifié)
Pour atteindre ×33, Koudy applique une **mise progressive** :

```
Phase 1 (900k → 3M):   Mise = 5% du solde par coupon
Phase 2 (3M → 10M):    Mise = 4% du solde par coupon  
Phase 3 (10M → 30M):   Mise = 3% du solde par coupon
```

**Règle d'or** : Ne jamais miser plus de 5% du solde total sur un seul coupon.

### Structure des Coupons
- **4 matchs minimum** par coupon (pour une cote combinée intéressante)
- **Cote totale cible** : entre 3.0 et 8.0 (équilibre risque/gain)
- **Cote individuelle par sélection** : entre 1.5 et 3.0
- Sports cibles : **Football** en priorité, Tennis en secondaire

---

## 3. Architecture du Projet

```
/home/kbg/.openclaw/workspace/koudy/
├── Koudy_Paris/
│   ├── SKILL.md                ← Ce fichier (documentation maître)
│   ├── PERFORMANCE.md          ← Historique des coupons et résultats
│   ├── scripts/                ← Copies des scripts actifs
│   └── data/                   ← Données JSON du jour
│
├── aris_bet/                   ← Scripts opérationnels actifs
│   ├── fetch_matches.js        ← Scraper les matchs disponibles
│   ├── xbet_markets_scraper.js ← Récupérer les marchés détaillés
│   ├── place_bet.js            ← Placement manuel assisté
│   ├── auto_place.js           ← Placement automatique avec login
│   ├── run_coupon_4.js         ← Script tout-en-un (recommandé)
│   ├── xbet_matches_with_markets.json ← Matchs du jour
│   └── last_coupon_result.json ← Résultat du dernier coupon
│
└── .pi/
    └── 1xbet.env               ← Credentials (JAMAIS dans git)
        XBET_USERNAME=...
        XBET_PASSWORD=...
```

---

## 4. Prérequis & Installation

### Logiciels Requis
```bash
# Node.js (version 18+)
node --version   # doit afficher v18.x ou v22.x

# Google Chrome (headless)
google-chrome --version
# ou: /usr/bin/google-chrome

# npm packages dans le dossier aris_bet
cd /home/kbg/.openclaw/workspace/koudy/aris_bet
npm install
```

### Vérification rapide
```bash
cd /home/kbg/.openclaw/workspace/koudy/aris_bet
node -e "const p = require('puppeteer-core'); console.log('Puppeteer OK');"
# Doit afficher: Puppeteer OK
```

### Structure du fichier credentials
```bash
# Fichier: /home/kbg/.openclaw/workspace/koudy/.pi/1xbet.env
XBET_USERNAME=1551336487
XBET_PASSWORD=AU5fvxbC
```

---

## 5. Étape 1 — Récupérer les Matchs

### Script : `aris_bet/fetch_matches.js`

**Ce que ça fait :**
- Ouvre Chrome en mode **headless** (invisible)
- Navigue vers `https://1xlite-96866.pro/fr/line/football`
- Scrape tous les blocs `.dashboard-game-block`
- Extrait : équipes, ligue, date, cotes 1X2, URL du match, ID du match
- Sauvegarde dans `xbet_matches_with_markets.json`
- 3 tentatives automatiques si la page échoue à charger

### Exécution
```bash
cd /home/kbg/.openclaw/workspace/koudy/aris_bet
node fetch_matches.js
```

### Sortie console attendue
```
🔄 Initialisation du scraper 1xBet (headless)...
🌐 Navigation vers 1xBet Football... (tentative 1/3)
✅ Page Football chargée
📋 Extraction des matchs disponibles sur 1xBet (1X2 uniquement)...
✅ 47 matchs extraits de 1xBet
📁 Marchés sauvegardés: /path/to/xbet_matches_with_markets.json
   📊 47 matchs | Moyenne: 1 marchés/match
```

### Structure JSON de sortie
```json
{
  "date": "2026-02-27",
  "timestamp": "2026-02-27T10:00:00.000Z",
  "total_matches": 47,
  "matches": [
    {
      "index": 0,
      "home_team": "Chelsea",
      "away_team": "Arsenal",
      "league": "Premier League",
      "date": "27/02 15:00",
      "odds_1x2": { "home": 2.1, "draw": 3.4, "away": 3.2 },
      "match_url": "https://1xlite-96866.pro/fr/line/football/...",
      "match_id": "290864063",
      "available_markets": ["1X2"]
    }
  ]
}
```

### Sélecteurs CSS utilisés
```javascript
// Bloc principal d'un match
'.dashboard-game-block'

// Noms des équipes (sélecteurs primaires)
'.dashboard-game-block__link > span > span > span > div:nth-child(1) > div > div > span:nth-child(2)'
'.dashboard-game-block__link > span > span > span > div:nth-child(2) > div > div > span:nth-child(2)'

// Cotes 1X2
'.ui-market__toggle, .dashboard-game-block__odd'

// Nom de la ligue
'.dashboard-champ-name__caption'

// Lien vers la page du match
'a.dashboard-game-block__link'
```

---

## 6. Étape 2 — Scraper les Marchés Détaillés

### Script : `aris_bet/xbet_markets_scraper.js`

**Ce que ça fait :**
- Navigue sur la page de détail de chaque match
- Intercepte les appels API `GetGameZip` (données complètes des marchés)
- Extrait : 1X2, BTTS, Double Chance, Over/Under 2.5, Asian Handicap, etc.
- Sauvegarde les données structurées pour le placement

### Quand l'utiliser
Ce script est **optionnel** mais recommandé pour des coupons plus sophistiqués.
Si tu as seulement les cotes 1X2 depuis `fetch_matches.js`, tu peux déjà construire un coupon.
Le scraper de marchés est utile pour ajouter BTTS, Over/Under, Double Chance.

### Interception API GetGameZip
1xBet expose une API interne `GetGameZip` qui contient **toutes les cotes d'un match**.
Le scraper écoute les réponses réseau et intercepte cette requête :

```javascript
// Interception de la requête GetGameZip
page.on('response', async (res) => {
  const url = res.url();
  if (!url.includes('/service-api/LineFeed/GetGameZip')) return;
  if (url.includes('isLive=true')) return; // Ignorer le live

  const json = await res.json();
  if (json?.Success) {
    const markets = parseMarkets(json);
    // markets contient: match_winner, btts, over_under_25, double_chance, etc.
  }
});
```

### Utilisation en code
```javascript
const XBetMarketsScraper = require('./xbet_markets_scraper');
const scraper = new XBetMarketsScraper('/usr/bin/google-chrome');

const markets = await scraper.fetchMatchMarkets(
  'https://1xlite-96866.pro/fr/line/football/.../306528402-chelsea-arsenal',
  { home_team: 'Chelsea', away_team: 'Arsenal' }
);

// Résultats disponibles:
console.log(markets.match_winner);    // { '1': 2.1, 'X': 3.4, '2': 3.2 }
console.log(markets.btts);            // { 'Oui': 1.8, 'Non': 2.0 }
console.log(markets.over_under_25);   // { 'Over': 1.75, 'Under': 2.05 }
console.log(markets.double_chance);   // { '1X': 1.3, '12': 1.25, 'X2': 1.4 }
console.log(markets.asian_handicap);  // { 'home_0': 1.95, 'away_0': 1.88 }

await scraper.close();
```

---

## 7. Étape 2.5 — Recherche Web (OBLIGATOIRE avant tout coupon)

> ⚠️ **Cette étape est non négociable. Koudy ne construit JAMAIS un coupon sans avoir fait ses recherches.**

Avant de sélectionner les matchs, Koudy doit utiliser l'outil **`web_search` (Brave Search API)** pour collecter des infos fraîches sur chaque match potentiel.

### Objectif
Ne pas se fier uniquement aux cotes de 1xBet. Les cotes reflètent l'opinion du bookmaker, pas la réalité du terrain. Koudy doit **croiser les sources** pour détecter :
- Joueurs blessés ou suspendus
- Équipes en forme / en crise
- Historique des confrontations directes
- Pronostics des sites spécialisés
- Compositions d'équipes probables

### Protocole de Recherche

Pour **chaque match** envisagé dans le coupon, lancer **au minimum 2 recherches web** :

```
1. "[Équipe A] vs [Équipe B] prédiction [date]"
2. "[Équipe A] blessures absences [date]"
3. "[Équipe B] forme derniers matchs"
```

**Total minimum : 6 requêtes web** pour un coupon de 4 matchs (certains matchs partagent des recherches).

### Sources à Consulter (minimum 6 sites différents)

| Type de source | Sites recommandés |
|---------------|-------------------|
| **Pronostics** | forebet.com, betexplorer.com, soccerway.com, footystats.org |
| **Stats & forme** | fbref.com, sofascore.com, flashscore.com, whoscored.com |
| **Blessures/compos** | transfermarkt.com, l'équipe.fr, bbc sport, skysports.com |
| **Head-to-head** | 11v11.com, soccerhistory.net |
| **Pronostics FR** | pronostics-en-or.com, butfootballclub.fr |

### Ce que Koudy cherche

Pour chaque match, extraire :

```
✅ Forme récente (5 derniers matchs): W-D-L-W-W ?
✅ Blessés / Suspendus (joueurs clés absents ?)
✅ Confrontations directes: qui domine historiquement ?
✅ Motivation du match (début de saison? finale? relégation?)
✅ Terrain (domicile fort ou non?)
✅ Score moyen des matchs (équipes offensives ou défensives?)
✅ Pronostic des sites spécialisés (consensus ou divergences?)
```

### Exemple de Recherche en Pratique

Pour un match **PSG vs Marseille** :

```
Recherche 1: "PSG Marseille prediction 2026"
Recherche 2: "PSG blessures absences février 2026"
Recherche 3: "Marseille form derniers matchs 2026"
Recherche 4: "PSG Marseille head to head stats"
```

Après lecture des résultats → Koudy décide :
- PSG à domicile, favori clair, Mbappé présent → **Paris: PSG gagne @ 1.55** ✅
- Si Mbappé blessé → passer à **Double Chance 1X @ 1.20** (moins de confiance)

### Grille de Décision post-recherche

```
Score de confiance par sélection (sur 5) :

5/5 → Mise normale (inclure dans le coupon)
3-4/5 → Inclure mais choisir marché plus sûr (Double Chance, DNB)
1-2/5 → EXCLURE ce match du coupon
```

**Si un match tombe à 1-2/5 → le remplacer par un autre match bien recherché.**

### Résumé obligatoire avant coupon

Avant de présenter le coupon final, Koudy doit afficher un **tableau de synthèse** :

```
| Match | Source | Forme DOM | Forme EXT | Blessés clés | Prono | Confiance |
|-------|--------|-----------|-----------|--------------|-------|-----------|
| PSG-OM | forebet+sofascore | W W W D W | L D W W L | Neymar(out) | PSG 1 | 4/5 |
| ...   | ...    | ...       | ...       | ...          | ...   | ...  |
```

---

## 8. Étape 3 — Créer un Coupon

### Principe de Construction

Un coupon est une **combinaison de 4 sélections** sur des matchs différents.
La cote totale = multiplication de toutes les cotes individuelles.

**Exemple :**
```
Chelsea gagne @ 2.1
PSG gagne    @ 1.7
BTTS Oui     @ 1.8
Over 2.5     @ 1.65

Cote totale = 2.1 × 1.7 × 1.8 × 1.65 = 10.6  ← Trop risqué
→ Remplacer Chelsea par Double Chance 1X @ 1.3
Nouvelle cote = 1.3 × 1.7 × 1.8 × 1.65 = 6.5  ✅ Dans la cible
```

### Algorithme de sélection (run_coupon_4.js)
```javascript
const picks = (data.matches || [])
  // Filtre 1: URL valide et noms d'équipes présents
  .filter(m => m.match_url && m.home_team && m.away_team)
  // Filtre 2: Exclure les paris spéciaux (noms bizarres)
  .filter(m => !/paris spéciaux|à domicile|à l'extérieur|home|away/i.test(
    `${m.home_team} ${m.away_team}`
  ))
  // Prendre les 4 premiers matchs valides
  .slice(0, 4);
```

**Amélioration possible :** Trier par qualité de cote avant de sélectionner.

### Règles de construction manuelle (pour Koudy l'IA)

Quand l'utilisateur demande à Koudy de créer un coupon, Koudy doit :

1. **Lire** `xbet_matches_with_markets.json`
2. **Filtrer** les matchs avec cotes 1X2 disponibles
3. **Analyser** chaque match :
   - Favori clair ? (cote ≤ 2.0 d'un côté) → prendre le favori
   - Équilibré ? (cotes 2.5-3.5 des deux côtés) → prendre Double Chance
   - Deux équipes offensives ? → BTTS Oui
4. **Calculer** la cote totale provisoire
5. **Ajuster** si nécessaire (remplacer sélections pour rester entre 3.0 et 8.0)
6. **Présenter** le coupon à l'utilisateur avec justification

---

## 8. Étape 4 — Placer le Coupon

### Script recommandé : `run_coupon_4.js`

Ce script fait **tout automatiquement** :
1. Charge les matchs depuis `xbet_matches_with_markets.json`
2. Sélectionne 4 matchs selon les filtres
3. Ouvre Chrome en mode **visible** (headless: false)
4. Se connecte automatiquement avec les credentials
5. Navigue sur chaque match et clique la meilleure cote disponible
6. Tente de sauvegarder le coupon
7. Extrait et affiche le code coupon

### Exécution
```bash
cd /home/kbg/.openclaw/workspace/koudy/aris_bet
node run_coupon_4.js
```

### Processus de connexion automatique
```javascript
// Chargement des credentials depuis le fichier .env
function loadEnv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

const env = loadEnv('../.pi/1xbet.env');
// env.XBET_USERNAME = identifiant
// env.XBET_PASSWORD = mot de passe
```

### Processus de clic sur les cotes
```javascript
// Sur chaque page de match, cherche une cote valide (1.5 à 3.5)
const clicked = await page.evaluate(() => {
  const candidateSelectors = [
    '.bet_type',
    '.ui-market__toggle',
    '.dashboard-game-block__odd',
    '[data-type="event"] .coef',
    '.c-bets__bet'
  ];

  for (const sel of candidateSelectors) {
    for (const el of document.querySelectorAll(sel)) {
      const match = (el.textContent || '').replace(',', '.').match(/\d+(?:\.\d+)?/);
      if (!match) continue;
      const odd = parseFloat(match[0]);
      if (odd >= 1.5 && odd <= 3.5) {
        el.click();
        return { ok: true, odd };
      }
    }
  }
  return { ok: false };
});
```

### Sauvegarde du coupon
Après avoir cliqué les 4 sélections :
```javascript
// Cherche le bouton de sauvegarde du coupon
const buttons = Array.from(document.querySelectorAll('button, a, div, span'));
const saveTargets = buttons.filter(el => {
  const t = (el.textContent || '').toLowerCase();
  return t.includes('sauveg') || t.includes('enregistrer') || t.includes('save');
});

// Clique tous les candidats
for (const el of saveTargets) { el.click(); }

// Extrait le code coupon (regex)
const codeMatch = bodyText.match(/(?:code\s*(?:coupon)?\s*[:#-]?\s*)([A-Z0-9]{6,12})/i)
  || bodyText.match(/\b[A-Z0-9]{8,12}\b/);
```

### Résultat sauvegardé dans `last_coupon_result.json`
```json
{
  "timestamp": "2026-02-27T10:30:00.000Z",
  "added": 4,
  "matches": [
    { "home": "Chelsea", "away": "Arsenal", "url": "https://..." },
    { "home": "PSG", "away": "Monaco", "url": "https://..." },
    { "home": "Bayern", "away": "Dortmund", "url": "https://..." },
    { "home": "Man City", "away": "Liverpool", "url": "https://..." }
  ],
  "couponCode": "ABC12345",
  "saveClickedCandidates": 3
}
```

---

## 9. Règles de Sélection des Matchs

> 🔎 **Rappel** : Ces règles s'appliquent APRÈS la recherche web (Étape 2.5). Ne jamais sélectionner un match sans avoir vérifié la forme, les blessures et les pronostics via Brave Search.

### 🏆 RÈGLE D'OR — COTE TOTALE DU COMBINÉ

> **La cote totale d'un coupon combiné doit être comprise entre 2.5 et 10.**

- Cote totale < 2.5 → ❌ **trop faible, pas rentable** — ajouter un match ou choisir des cotes plus hautes
- Cote totale entre 2.5 et 10 → ✅ **zone cible**
- Cote totale > 10 → ❌ **trop risqué** — retirer un match ou baisser les cotes

**En pratique :**
- 3 matchs × 1.8 × 1.7 × 1.6 = 4.90 ✅
- 2 matchs × 1.55 × 1.50 = 2.33 ❌ (< 2.5 → ajouter une sélection)
- 4 matchs × 2.5 × 2.0 × 1.8 × 1.6 = 14.4 ❌ (> 10 → retirer un match)

**Comment atteindre la zone 2.5–10 :**
- Préférer 3-4 matchs avec des cotes entre 1.5 et 2.5 chacun
- Éviter de multiplier les cotes faibles (1.5 × 1.5 × 1.5 = 3.4 → ok mais limite)
- Éviter de multiplier des cotes élevées (2.5 × 2.5 × 2.0 = 12.5 → trop haut)

---

### 🚫 RÈGLE ABSOLUE SUR LES COTES INDIVIDUELLES

> **Ne JAMAIS sélectionner une cote inférieure à 1.5.**

- Cote ≥ 1.5 → ✅ eligible
- Cote < 1.5 → ❌ **rejetée, peu importe la confiance**

**Pourquoi ?** Une cote < 1.5 signifie que le bookmaker considère l'issue quasi-certaine. Mais :
- Le risque reste réel (upsets arrivent)
- Le gain potentiel ne justifie pas le risque
- Sur un combiné, une cote à 1.22 plafonne tout le reste
- Koudy ne parie que sur des valeurs, pas sur des "certitudes" mal rémunérées

**En pratique :**
- Dynamo Kyiv à 1.26 → ❌ exclure, chercher un autre match
- Chakhtar à 1.22 → ❌ exclure, chercher un autre match
- Aston Villa à 1.55 → ✅ acceptable
- Parma à 2.00 → ✅ bon

**Alternative si le match est bon mais la cote trop basse :**
→ Passer sur le marché **Double Chance (1X ou X2)** qui offre souvent des cotes > 1.5
→ Ou **Over 1.5 buts** si le match est offensif

---

### ✅ Matchs à PRIVILÉGIER
- Grandes ligues européennes (Premier League, Champions League, La Liga, Bundesliga, Serie A, Ligue 1)
- Matchs avec favori clair (une cote ≤ 2.0)
- Matchs avec historique de buts élevé (BTTS Oui accessible à cote raisonnable)
- Matchs en soirée (17h-22h) : plus de données et moins de variabilité

### ❌ Matchs à ÉVITER
- Noms d'équipes bizarres : "À domicile", "À l'extérieur", "Paris spéciaux", "Home", "Away"
- Matchs où toutes les cotes sont proches de 3.33 (trop incertain, résultat aléatoire)
- Matchs avec toutes cotes 1X2 > 3.0 (incertitude maximale)
- Ligues inconnues sans statistiques fiables
- Matchs dans moins de 30 minutes (peut avoir commencé ou cotes verrouillées)
- Matchs avec seulement 1 cote disponible (pari déjà en cours ou erreur)

### 📊 Grille de Décision par Marché
| Marché | Quand l'utiliser | Cote idéale |
|--------|-----------------|-------------|
| 1 (Victoire Domicile) | Équipe favorite claire à domicile | 1.5 – 2.2 |
| 2 (Victoire Extérieur) | Grande équipe en déplacement, cote raisonnable | 1.8 – 2.5 |
| 1X (Double Chance) | Domicile fort mais match incertain | 1.2 – 1.6 |
| X2 (Double Chance) | Légère domination extérieure | 1.3 – 1.7 |
| BTTS Oui | Deux équipes offensives, peu de défenses solides | 1.6 – 2.0 |
| Over 2.5 | Matchs à haut scoring attendu | 1.5 – 2.0 |
| Under 2.5 | Matchs défensifs, buts rares attendus | 1.7 – 2.2 |
| Draw No Bet (DNB) | Favori léger, protection si nul | 1.5 – 2.0 |

### Calcul de la cote totale
```
Cote totale = Cote1 × Cote2 × Cote3 × Cote4

Objectif: 3.0 ≤ Cote totale ≤ 8.0

Exemple bon coupon:
  1.6 × 1.8 × 1.7 × 1.9 = 9.3 → Trop haut, remplacer le 1.9 par 1.4
  1.6 × 1.8 × 1.7 × 1.4 = 6.9 → OK ✅
```

---

## 10. Marchés Disponibles & Leur Logique

### Décodage de l'API GetGameZip (Structure Complète)

```
Structure Value (root):
  I  = permanentId du match (ID unique permanent)
  CI = gameId (ID dans le système de jeu)
  S  = timestamp Unix de début du match
  L  = identifiant de ligue
  LN = nom de la ligue
  GE = tableau des groupes de marchés (Game Events)

Structure d'un Event (E):
  I  = id de la sélection (pour placer le pari)
  T  = typeId (identifie la sélection: 1=Dom, 2=Nul, 3=Ext...)
  C  = cote (coefficient flottant)
  P  = param (valeur du handicap ou Over/Under)
  L  = isLocked (true = pari bloqué, IGNORER)
  LV = isLive (true = pari live, IGNORER en pré-match)
  N  = nom de la sélection (si disponible)
  B  = nom alternatif
```

### Tous les Groupes (G) par ID
```
G=1    : 1X2 — Résultat du match
  T=1  → Victoire Domicile
  T=2  → Nul
  T=3  → Victoire Extérieur

G=8    : Double Chance
  T=4  → 1X (Domicile OU Nul)
  T=5  → 12 (Domicile OU Extérieur = pas de nul)
  T=6  → X2 (Nul OU Extérieur)

G=10   : Draw No Bet (DNB — remboursé si nul)
  T=1  → Domicile gagne
  T=3  → Extérieur gagne
  T=794 → Domicile (format alternatif)
  T=795 → Extérieur (format alternatif)

G=17   : Over/Under — Total de buts
  P=1.5, T=9/10 → Over/Under 1.5 buts
  P=2.5, T=9/10 → Over/Under 2.5 buts (LE PLUS COMMUN)
  P=3.5, T=9/10 → Over/Under 3.5 buts
  Note: T=9 = Over, T=10 = Under

G=19   : BTTS — Les deux équipes marquent
  T=180 → Oui (les deux équipes marquent)
  T=181 → Non (au moins une équipe ne marque pas)

G=62   : Asian Handicap
  T=13/3829/1 → Handicap Domicile
  T=14/3830/3 → Handicap Extérieur
  P=0    → AH 0 (le plus équilibré, recommandé)
  P=0.5  → AH 0.5
  P=-0.5 → AH -0.5

G=99   : Asian Over/Under
  T=3827/9  → Over
  T=3828/10 → Under
  P=2.25 → Paramètre le plus commun (recommandé)
  P=2.75 → Alternative courante
  P=2.5  → Alternative courante

G=225  : Total Corners (Corners totaux du match)
G=238  : Asian Corners — Over
G=239  : Asian Corners — Under
  P=9.5  → Le plus commun pour corners
  P=10.5 → Alternative
  T=9=Over, T=10=Under

G=104  : Méthode du 1er but
  T=818, P=1 → Via tir (le plus probable)
```

---

## 11. Navigateur pour le Placement — RÈGLE ABSOLUE

> 🚨 **JAMAIS Puppeteer pour créer/placer les coupons. TOUJOURS le navigateur OpenClaw (Chrome Relay).**

### Pourquoi ?
- Puppeteer ouvre un Chrome séparé, isolé, **non connecté** au compte 1xBet
- Le Chrome Relay OpenClaw utilise **le vrai Chrome de l'utilisateur**, déjà connecté avec la session 1xBet active
- Puppeteer est réservé au **scraping headless** (récupération des matchs uniquement)

### Règle claire par usage

| Action | Outil autorisé |
|--------|---------------|
| Scraper les matchs 1xBet | ✅ Puppeteer (headless) |
| Créer/placer des coupons | ✅ **OpenClaw browser tool** UNIQUEMENT |
| Cliquer les cotes | ✅ **browser(action=act/snapshot, profile=chrome)** |
| Saisir la mise | ✅ **browser(action=act)** |
| Sauvegarder le coupon | ✅ **browser(action=act/snapshot)** |

### Comment placer un coupon via OpenClaw

```
1. browser(action=snapshot, profile=chrome, refs=aria)
   → Vérifier que la page 1xBet est visible + session connectée

2. Pour chaque match du coupon:
   browser(action=navigate, url="URL_MATCH_1XBET")
   → Attendre 2-3s
   browser(action=snapshot, refs=aria)
   → Trouver le ref de la cote cible (1, X, 2, BTTS...)
   browser(action=act, request={kind:"click", ref="REF_COTE"})

3. Après toutes les sélections:
   browser(action=snapshot)
   → Lire la cote totale du coupon dans le panier
   → Lire le code coupon si disponible

4. ENVOYER AUX APIs (avant la mise):
   → fetch appfootia.com
   → fetch api.appbetai.com

5. Saisir la mise et confirmer:
   browser(action=act, request={kind:"fill", ref="INPUT_MISE", text="2000"})
   browser(action=act, request={kind:"click", ref="BTN_CONFIRMER"})
```

### Si Chrome Relay n'est pas attaché
→ Basculer sur `profile=openclaw` (voir TOOLS.md pour la procédure complète)
→ **Ne jamais revenir à Puppeteer pour le placement**

---

## 12. Débogage Navigateur — Règle d'or

> **Koudy ne demande JAMAIS à l'utilisateur de déboguer le navigateur.** Il suit la procédure ci-dessous seul, jusqu'à ce que ça marche.

### Priorité des profils
1. `profile=openclaw` → **toujours en premier** pour 1xBet (autonome)
2. `profile=chrome` → seulement si l'utilisateur a **explicitement** activé le Browser Relay (badge ON)

### Séquence d'auto-correction (dans l'ordre)
```
1. browser(status, openclaw)
   → Non démarré ? → browser(start, openclaw)

2. browser(open, openclaw, url="https://1xlite-96866.pro/fr/")
   → Attendre 4-6s

3. browser(snapshot, openclaw, refs=aria)
   → Page vide ou erreur ? → openclaw gateway restart → reprendre depuis 1

4. Si gateway restart ne suffit pas :
   → exec: pkill -f "openclaw gateway" && sleep 3 && openclaw gateway start
   → Attendre 5s → reprendre depuis 1
```

### Jamais acceptables
- ❌ "Pouvez-vous ouvrir le navigateur ?"
- ❌ "Activez le relay et réessayez."
- ❌ Abandonner après une seule erreur navigateur.

**→ Consulter TOOLS.md pour l'arbre de décision complet.**

---

## 12. Erreurs Connues & Solutions

### ❌ Erreur 1 : `waitForSelector timeout`
**Message** :
```
TimeoutError: Waiting for selector '.dashboard-game-block' failed: Timeout exceeded
```

**Causes possibles :**
- La page 1xBet met trop de temps à charger (lenteur réseau)
- Le sélecteur CSS `.dashboard-game-block` a changé (1xBet modifie son interface régulièrement)
- 1xBet bloque les accès automatisés (bot detection)

**Solutions :**
```javascript
// Solution 1: Augmenter le timeout à 60 secondes
await page.waitForSelector('.dashboard-game-block', { timeout: 60000 });

// Solution 2: Essayer plusieurs sélecteurs alternatifs
await page.waitForSelector(
  '.dashboard-game-block, .c-events__item, .game-block, [class*="game-block"]',
  { timeout: 60000 }
);

// Solution 3: Prendre un screenshot pour voir ce qui est chargé
await page.screenshot({ path: 'debug_page.png', fullPage: true });
console.log('Screenshot sauvegardé: debug_page.png');

// Solution 4: Vérifier le HTML de la page
const html = await page.content();
console.log(html.slice(0, 2000)); // Premiers 2000 caractères
```

---

### ❌ Erreur 2 : `net::ERR_NAME_NOT_RESOLVED`
**Message** :
```
Error: net::ERR_NAME_NOT_RESOLVED at https://1xlite-96866.pro/fr/line/football
```

**Causes possibles :**
- Connexion internet coupée
- Le domaine `1xlite-96866.pro` est down ou bloqué
- DNS ne résout pas le domaine (ISP, firewall)

**Solutions :**
```bash
# Test 1: Vérifier la connectivité
ping google.com

# Test 2: Résoudre le DNS manuellement
nslookup 1xlite-96866.pro
dig 1xlite-96866.pro

# Test 3: Si le domaine est bloqué, 1xBet utilise des miroirs
# Chercher le domaine miroir actuel sur le site officiel ou Telegram 1xBet
# Puis mettre à jour baseUrl dans tous les scripts:
grep -r "1xlite-96866.pro" /home/kbg/.openclaw/workspace/koudy/aris_bet/
# Remplacer par le nouveau domaine avec sed:
# sed -i 's/1xlite-96866.pro/NOUVEAU_DOMAINE/g' *.js
```

---

### ❌ Erreur 3 : Login échoué
**Message** : `Login form not found (maybe already logged in / different UI). Continuing...`

**Mais la session n'est pas connectée.**

**Causes possibles :**
- L'interface de connexion a changé (sélecteurs CSS différents)
- CAPTCHA activé (1xBet suspecte un bot)
- Session précédente expirée

**Solutions :**
```javascript
// Vérifier si l'utilisateur est connecté après tentative
const isLoggedIn = await page.evaluate(() => {
  // Cherche des éléments typiques d'une session connectée
  return !!(
    document.querySelector('.user-info') ||
    document.querySelector('.profile-btn') ||
    document.querySelector('[data-id="user"]') ||
    document.querySelector('.user-header') ||
    document.querySelector('.balance')
  );
});

if (!isLoggedIn) {
  console.log('❌ Non connecté. Tentative avec sélecteurs alternatifs...');
  
  // Essayer différents sélecteurs de bouton login
  const loginSelectors = [
    '.login-btn',
    '.top-login__btn',
    '[data-id="login"]',
    'a[href*="login"]',
    'button:contains("Connexion")'
  ];
  
  for (const sel of loginSelectors) {
    try {
      await page.click(sel);
      await sleep(2000);
      break;
    } catch (_) {}
  }
}
```

---

### ❌ Erreur 4 : 0 cotes ajoutées
**Message** : `Error: Only 0 selections added`

**Causes possibles :**
- Les sélecteurs de cotes ont changé dans l'interface 1xBet
- La page du match ne charge pas les cotes (JS désactivé, erreur réseau)
- Toutes les cotes disponibles sont hors plage [1.5 – 3.5]

**Diagnostic :**
```javascript
// Voir toutes les cotes disponibles sur la page
const allOdds = await page.evaluate(() => {
  const results = [];
  const selectors = [
    '.bet_type', '.ui-market__toggle',
    '.dashboard-game-block__odd', '.c-bets__bet',
    '[class*="odd"]', '[class*="coef"]'
  ];
  
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach(el => {
      const text = el.textContent.trim();
      if (/^\d+[.,]\d+$/.test(text)) {
        results.push({ selector: sel, text, class: el.className });
      }
    });
  }
  return results;
});

console.log('Cotes détectées:', JSON.stringify(allOdds, null, 2));
```

**Solutions :**
```javascript
// Élargir la plage de cotes pour debug
if (odd >= 1.3 && odd <= 5.0) { // Plage élargie
  el.click();
  return { ok: true, odd };
}

// Ou accepter n'importe quelle cote valide
if (odd > 1.01 && odd < 20) {
  el.click();
  return { ok: true, odd };
}
```

---

### ❌ Erreur 5 : Code coupon non détecté
**Message** : `Coupon code not detected automatically. Saved diagnostic to last_coupon_result.json`

**Causes possibles :**
- Le coupon n'a pas été sauvegardé (bouton non cliqué ou mauvais bouton)
- Le code est dans un format différent de la regex attendue
- L'interface de coupon a changé

**Diagnostic :**
```javascript
// Prendre un screenshot immédiatement après la sauvegarde
await page.screenshot({ path: 'after_save.png', fullPage: true });

// Afficher tout le texte de la page (chercher manuellement le code)
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('Texte page (2000 premiers chars):', bodyText.slice(0, 2000));
```

**Solutions avec regex élargie :**
```javascript
const patterns = [
  /code\s*[:#]\s*([A-Z0-9]{6,14})/i,           // "Code: ABC123"
  /coupon[^:]*[:#]\s*([A-Z0-9]{6,14})/i,        // "Coupon: ABC123"
  /([A-Z]{2,4}[0-9]{4,10})/,                    // Lettres + chiffres
  /\b([0-9]{8,14})\b/,                           // Que des chiffres (8-14)
  /\b([A-Z0-9]{8,14})\b/                         // Alphanumérique 8-14 chars
];

let code = null;
for (const pattern of patterns) {
  const match = bodyText.match(pattern);
  if (match) { code = match[1] || match[0]; break; }
}
```

---

### ❌ Erreur 6 : Chrome ne démarre pas
**Message** :
```
Error: Failed to launch the browser process!
/usr/bin/google-chrome: error while loading shared libraries...
```

**Solutions :**
```bash
# Vérifier que Chrome est installé
which google-chrome
google-chrome --version

# Tuer les processus Chrome zombies
pkill -f google-chrome
pkill -f chrome

# Test headless minimal
google-chrome --no-sandbox --headless --dump-dom about:blank 2>&1 | head -5

# Si Chrome n'est pas installé
sudo apt update
sudo apt install google-chrome-stable

# Alternative: Chromium
sudo apt install chromium-browser
# Puis mettre à jour le chemin dans les scripts:
# executablePath: '/usr/bin/chromium-browser'
```

---

### ❌ Erreur 7 : GetGameZip non intercepté
**Message** : `⏳ Timeout: GetGameZip non intercepté`

**Causes possibles :**
- La page du match charge mais l'API n'est pas appelée (URL incorrecte)
- Le match n'existe plus (terminé ou supprimé)
- L'interception de requête ne capture pas la bonne URL

**Diagnostic :**
```javascript
// Logger TOUTES les requêtes API pour trouver la bonne
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('/service-api/LineFeed/')) {
    console.log('API endpoint:', url.replace(/.*(\/service-api\/LineFeed\/.*)/, '$1'));
  }
});
```

**Solutions :**
```javascript
// Augmenter le timeout de 15s à 30s
const timeout = setTimeout(() => resolve(null), 30000);

// Attendre plus longtemps avant de timeout
await new Promise(r => setTimeout(r, 12000)); // Au lieu de 8000

// Si l'endpoint a changé, adapter le filtre
if (!url.includes('/service-api/LineFeed/GetGameZip') &&
    !url.includes('/service-api/LineFeed/Get')) return;
```

---

### ❌ Erreur 8 : Credentials manquants
**Message** : `Missing credentials in ../.pi/1xbet.env`

**Causes possibles :**
- Fichier `.env` inexistant
- Chemin relatif incorrect (dépend du répertoire d'exécution)
- Variables mal nommées dans le fichier

**Solutions :**
```bash
# Vérifier l'existence du fichier
ls -la /home/kbg/.openclaw/workspace/koudy/.pi/1xbet.env

# Créer le fichier si absent
mkdir -p /home/kbg/.openclaw/workspace/koudy/.pi
cat > /home/kbg/.openclaw/workspace/koudy/.pi/1xbet.env << 'EOF'
XBET_USERNAME=1551336487
XBET_PASSWORD=AU5fvxbC
EOF
chmod 600 /home/kbg/.openclaw/workspace/koudy/.pi/1xbet.env

# Vérifier le contenu
cat /home/kbg/.openclaw/workspace/koudy/.pi/1xbet.env
```

---

### ❌ Erreur 9 : Pas assez de matchs (`Not enough matches`)
**Message** : `Not enough matches to build a 4-match coupon`

**Causes possibles :**
- `xbet_matches_with_markets.json` est vide ou obsolète
- Tous les matchs sont filtrés (noms aberrants)
- Le fichier JSON est corrompu

**Solutions :**
```bash
# Vérifier le fichier de matchs
cat /home/kbg/.openclaw/workspace/koudy/aris_bet/xbet_matches_with_markets.json | python3 -m json.tool | head -30

# Compter les matchs disponibles
node -e "
  const d = require('./xbet_matches_with_markets.json');
  console.log('Total matchs:', d.total_matches);
  console.log('Matchs valides:', d.matches.filter(m => m.match_url).length);
"

# Si fichier absent ou trop vieux: re-fetcher
node fetch_matches.js
```

---

## 12. Workflow Complet Automatisé

### Séquence d'exécution optimale

```bash
# === ÉTAPE 1: Mettre à jour les matchs du jour ===
cd /home/kbg/.openclaw/workspace/koudy/aris_bet
node fetch_matches.js
# Durée: ~30-60 secondes
# Résultat: xbet_matches_with_markets.json mis à jour

# === ÉTAPE 2 (optionnel): Enrichir avec marchés détaillés ===
# Seulement si tu veux BTTS/Over/Under/Double Chance
# ATTENTION: Prend 5-10 minutes selon le nombre de matchs
# node xbet_markets_scraper.js

# === ÉTAPE 3: Générer et placer le coupon ===
node run_coupon_4.js
# Durée: ~2-5 minutes
# Résultat: coupon placé + last_coupon_result.json

# === ÉTAPE 4: Vérifier le résultat ===
cat last_coupon_result.json
```

### Script d'automatisation quotidienne
```javascript
// workflow_complet.js — À créer dans aris_bet/
const XBetScraper = require('./fetch_matches');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runDailyCoupon() {
  const startTime = new Date();
  console.log(`🎯 [${startTime.toISOString()}] Démarrage workflow Koudy Paris`);
  
  // === 1. Récupérer les matchs ===
  console.log('\n📡 Étape 1: Récupération des matchs...');
  const scraper = new XBetScraper();
  let matches = [];
  
  try {
    matches = await scraper.fetchAvailableMatches();
  } finally {
    await scraper.close();
  }
  
  if (matches.length < 4) {
    console.error(`❌ Seulement ${matches.length} matchs disponibles. Minimum requis: 4`);
    return { success: false, reason: 'not_enough_matches' };
  }
  
  console.log(`✅ ${matches.length} matchs récupérés`);
  
  // === 2. Placer le coupon ===
  console.log('\n🎰 Étape 2: Placement du coupon...');
  
  try {
    execSync('node run_coupon_4.js', {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (err) {
    console.error('❌ Erreur lors du placement:', err.message);
    return { success: false, reason: 'placement_failed' };
  }
  
  // === 3. Lire et afficher le résultat ===
  const resultPath = path.join(__dirname, 'last_coupon_result.json');
  
  if (fs.existsSync(resultPath)) {
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    console.log('\n📊 Résultat du coupon:');
    console.log(`   Matchs ajoutés: ${result.added}/4`);
    console.log(`   Code coupon: ${result.couponCode || 'Non détecté'}`);
    
    result.matches.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.home} vs ${m.away}`);
    });
    
    return { success: result.added >= 4, couponCode: result.couponCode };
  }
  
  return { success: false, reason: 'no_result_file' };
}

runDailyCoupon()
  .then(result => {
    if (result.success) {
      console.log(`\n✅ Workflow terminé avec succès! Code: ${result.couponCode}`);
    } else {
      console.log(`\n❌ Workflow échoué: ${result.reason}`);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  });
```

---

## 13. Suivi des Performances

### Fichier `PERFORMANCE.md`

Créer et tenir à jour ce fichier dans `Koudy_Paris/`.

```markdown
# PERFORMANCE.md — Suivi des Coupons Koudy

## Solde actuel: 900 000 F
## Objectif: 30 000 000 F

---

## Format d'entrée
Date | Matchs sélectionnés | Cote totale | Mise | Résultat | Gain/Perte | Nouveau solde

---

## Historique

### Février 2026
| Date | Matchs | Cote | Mise | Résultat | +/- | Solde |
|------|--------|------|------|----------|-----|-------|
| 2026-02-27 | PSG-Monaco(1), Chelsea-Ars(1X2), Bayern-BVB(BTTS), MCity-LFC(O2.5) | 5.8 | 45 000 | ✅ Gagné | +261 000 | 1 161 000 |
```

### KPIs à suivre
- **Taux de réussite** : % de coupons gagnants / total coupons joués
- **ROI global** : (Total gagné - Total misé) / Total misé × 100
- **Gain moyen par coupon gagné**
- **Perte moyenne par coupon perdu**
- **Série gagnante maximale**
- **Série perdante maximale** (alerte si ≥ 5)

### Règle de sécurité absolue
```
Si 5 coupons perdus consécutivement :
  1. PAUSE de 48h obligatoire
  2. Analyser les 5 coupons perdus (pourquoi ?)
  3. Réduire temporairement les mises à 2% du solde
  4. Ne reprendre qu'avec une stratégie révisée
```

### Objectifs intermédiaires
| Phase | Solde Cible | Mise par coupon |
|-------|-------------|-----------------|
| Départ | 900 000 F | 45 000 F (5%) |
| Phase 1 | 3 000 000 F | 150 000 F (5%) |
| Phase 2 | 10 000 000 F | 400 000 F (4%) |
| Phase 3 | 30 000 000 F | ← Objectif final |

---

## 14. Évolution & Améliorations

### Fonctionnalités à développer

**Court terme (1-2 semaines) :**
- [ ] `workflow_complet.js` : script unique qui enchaîne fetch + place
- [ ] Cookies persistants : éviter le re-login à chaque run
- [ ] Mode dry-run : tester la sélection sans placer réellement

**Moyen terme (1 mois) :**
- [ ] Intégration stats football (football-data.org API gratuite)
  - Forme des 5 derniers matchs de chaque équipe
  - Buts marqués/encaissés en moyenne
  - Confrontations directes récentes
- [ ] Sélection intelligente basée sur les statistiques (pas juste les cotes)
- [ ] Notification automatique des résultats (Telegram/email)

**Long terme :**
- [ ] Machine learning sur les résultats passés
- [ ] Analyse des tendances (équipes en forme, avant/après pause internationale)
- [ ] Multi-sports : Tennis, Basketball NBA

### Optimisations techniques
```javascript
// Cookies persistants (éviter re-login)
const cookiesPath = './1xbet_cookies.json';

// Sauvegarder les cookies après login
const cookies = await page.cookies();
fs.writeFileSync(cookiesPath, JSON.stringify(cookies));

// Recharger les cookies au prochain démarrage
if (fs.existsSync(cookiesPath)) {
  const cookies = JSON.parse(fs.readFileSync(cookiesPath));
  await page.setCookie(...cookies);
  // Si les cookies sont valides, pas besoin de re-login
}
```

---

## 15. Envoi des Coupons aux APIs Externes

> ⚠️ **Ces APIs sont en ENVOI UNIQUEMENT. On ne reçoit rien, on ne lit rien. On envoie, c'est tout.**

Après chaque placement réussi sur 1xBet (code coupon obtenu), Koudy doit envoyer vers **deux destinations** :

---

### 1. appfootia.com — Publication du coupon

**URL :** `https://appfootia.com/tipster/public/add-cupon-api`
**Méthode :** `GET` avec query params
**Paramètres :**
- `code` = le code coupon 1xBet (ex: `ABC12345`)
- `cote` = la cote totale du coupon (arrondie à 2 décimales, ex: `4.35`)

**Exemple :**
```
GET https://appfootia.com/tipster/public/add-cupon-api?code=ABC12345&cote=4.35
```

**Règle importante :** N'envoyer **que si la cote totale >= 2.0**. En dessous, ignorer.

**Implémentation dans le code :**
```javascript
const FOOTIA_API_URL = 'https://appfootia.com/tipster/public/add-cupon-api';

if (totalOdds >= 2.0) {
    const apiUrl = `${FOOTIA_API_URL}?code=${encodeURIComponent(couponCode)}&cote=${parseFloat(totalOdds.toFixed(2))}`;
    const response = await fetch(apiUrl, { method: 'GET' });
    if (response.ok) {
        console.log(`✅ Coupon envoyé à appfootia.com`);
        // Marquer comme envoyé: placement.sent_to_footia = true
    }
}
```

**En cas d'échec :** Le script `sync_placements_to_footia.js` permet de renvoyer les coupons non envoyés (flag `sent_to_footia: false` dans le fichier `data/placements/YYYY-MM-DD.json`).

---

### 2. api.appbetai.com — Enregistrement du placement

**URL :** `https://api.appbetai.com/api/admin/coupons`
**Méthode :** `POST` avec JSON body
**Authentification :** Header `X-API-Key: vkjuhriouhgrljherihenokhbreoiughggpiub_BAI`

**Body JSON envoyé :**
```json
{
  "date": "2026-02-27",
  "coupon_name": "Coupon Sûr 1",
  "code": "ABC12345",
  "strategy": "safe",
  "total_odds": 4.35,
  "start_time": "2026-02-27T10:30:00.000Z",
  "end_time": "2026-02-27T12:30:00.000Z",
  "events": [
    {
      "home_team": "PSG",
      "away_team": "Monaco",
      "bet_type": "1X2",
      "bet_value": "1",
      "home_team_logo": "https://...",
      "away_team_logo": "https://...",
      "match_time": "2026-02-27T20:00:00.000Z"
    }
  ]
}
```

**Implémentation dans le code :**
```javascript
async function sendPlacementToAPI(placementData) {
    const response = await fetch('https://api.appbetai.com/api/admin/coupons', {
        method: 'POST',
        headers: {
            'X-API-Key': 'vkjuhriouhgrljherihenokhbreoiughggpiub_BAI',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(placementData)
    });
    // Pas de lecture de retour nécessaire
}
```

**Note :** api.appbetai.com est aussi utilisé en **source de données** pour récupérer les fixtures avec prédictions IA (`GET /api/admin/fixtures?api_key=...`). Mais pour les coupons, c'est uniquement un envoi POST.

---

### Ordre d'envoi — WORKFLOW EXACT

> ⚠️ **Les coupons sont envoyés aux deux sites AVANT de miser l'argent.**
> On publie d'abord, on mise ensuite. Jamais l'inverse.

```
1. Construire le coupon sur 1xBet (sélections ajoutées au panier)
2. Sauvegarder le coupon sur 1xBet → obtenir le CODE coupon
3. ──── ENVOI AUX APIS (AVANT la mise) ────
   3a. Envoyer à appfootia.com (GET, si cote >= 2.0)
   3b. Envoyer à api.appbetai.com (POST)
4. Sauvegarder dans data/placements/YYYY-MM-DD.json
5. Marquer sent_to_footia = true dans le fichier placements
6. ──── MISER L'ARGENT (après publication) ────
   → Confirmer la mise sur 1xBet
```

**Pourquoi cet ordre ?**
- Le code coupon est généré dès la sauvegarde, sans avoir encore misé
- On publie le coupon (pour les abonnés/visiteurs) avant d'engager les fonds
- Si l'envoi API échoue → ne pas bloquer la mise, logger et rattraper via `sync_placements_to_footia.js`

### En cas d'erreur d'envoi
- Ne pas bloquer le workflow → continuer avec le coupon suivant
- Logger l'erreur (`[API] Erreur: ...`)
- Les coupons non envoyés à footia peuvent être synchronisés via : `node sync_placements_to_footia.js`

---

## 🔴 RAPPELS PERMANENTS

0. **RECHERCHE WEB OBLIGATOIRE** — Minimum 6 sites via `web_search` (Brave) avant tout coupon. Forme, blessures, pronostics, H2H. Sans recherche = pas de coupon.
1. **Compte DÉMO** — Aucun argent réel n'est risqué pour l'instant
2. **Credentials dans `.pi/1xbet.env`** — Ne JAMAIS les mettre dans les scripts
3. **Vérifier le solde** avant chaque coupon (via l'interface 1xBet)
4. **Documenter chaque coupon** dans `PERFORMANCE.md`
5. **Si 1xBet change son domaine** → mettre à jour `baseUrl` dans tous les scripts
6. **Backup régulier** de `last_coupon_result.json` et `xbet_matches_with_markets.json`
7. **Ne jamais modifier** les credentials directement depuis un script

---

## 🚀 DÉMARRAGE RAPIDE (Pour le prochain modèle IA)

Si tu reprends ce projet pour la première fois, voici les étapes minimales :

```bash
# 1. Vérifier que tout est en place
ls /home/kbg/.openclaw/workspace/koudy/aris_bet/
ls /home/kbg/.openclaw/workspace/koudy/.pi/1xbet.env

# 2. Vérifier Node et Chrome
node --version && google-chrome --version

# 3. Installer les dépendances si nécessaire
cd /home/kbg/.openclaw/workspace/koudy/aris_bet
npm install

# 4. Tester le scraper de matchs
node fetch_matches.js

# 5. Si tout fonctionne, placer un coupon
node run_coupon_4.js

# 6. Mettre à jour PERFORMANCE.md avec le résultat
```

**En cas de problème** → Consulter la section **11. Erreurs Connues & Solutions**

---

*Dernière mise à jour : 27 Février 2026*
*Auteur : Koudy — Agent IA Paris Sportifs*
*Objectif : 900 000 F → 30 000 000 F d'ici fin 2026*
