# 🎯 Koudy Paris

Agent de génération et placement automatique de coupons sportifs sur 1xBet.
Envoi vers **appfootia.com** (Footia) et **api.appbetai.com** (BetAI).

---

## 🧠 Qui est Koudy ?

Koudy est un agent IA spécialisé dans les paris sportifs. Il génère des coupons football et basket en analysant les matchs, les cotes, les blessures et les compositions d'équipes. Ce repo contient sa configuration et ses scripts pour fonctionner en autonomie.

---

## 📁 Structure

```
Koudy_Paris/
├── SOUL.md              # Personnalité et valeurs de Koudy
├── AGENTS.md            # Instructions de fonctionnement
├── TOOLS.md             # Notes techniques (navigateur, APIs, débug)
├── IDENTITY.md          # Identité et mission
├── PROCESS_COUPONS.md   # Process complet de génération de coupons
├── PERFORMANCE.md       # Suivi des résultats
└── scripts/
    ├── run_daily.js              ← SCRIPT PRINCIPAL (lancer chaque matin)
    ├── place_coupon_1xbet.js     ← Module: ajouter sélections + sauvegarder
    ├── send_coupon_api.js        ← Module: envoyer aux APIs Footia + BetAI
    ├── fetch_matches.js          ← Récupérer les matchs du jour
    └── package.json
```

---

## 🚀 Installation

```bash
cd scripts
npm install
```

---

## 📋 Usage journalier

### 1. Modifier les coupons dans `run_daily.js`

Ouvrir `scripts/run_daily.js` et remplir `COUPONS_DU_JOUR` avec les matchs du jour :

```js
const COUPONS_DU_JOUR = [
  {
    name: 'Footia-1 - Classiker',
    platform: ['footia'],
    total_odds: 5.27,
    selections: [
      { slug: 'borussia-dortmund-bayern-munich', label: 'V2' },
      { slug: 'liverpool-west-ham-united',       label: 'V1' },
      { slug: 'monaco-angers-sco',               label: 'V1' },
    ]
  },
  {
    name: 'BetAI-1 - NBA Safe',
    platform: ['betai'],
    total_odds: 2.19,
    selections: [
      { slug: 'charlotte-hornets-portland', label: 'V1' },
      { slug: 'miami-heat-houston-rockets', label: 'V2' },
    ]
  },
];
```

### 2. Lancer le script

```bash
node scripts/run_daily.js
```

---

## 🔑 Comment trouver le `slug` d'un match ?

Le slug est la **partie finale de l'URL 1xBet** du match.

Exemple :
```
https://1xlite-96866.pro/fr/line/basketball/13589-nba/309548948-charlotte-hornets-portland-trail-blazers
                                                        ↑ slug = "charlotte-hornets-portland-trail-blazers"
```

---

## 🏷️ Labels de cotes disponibles

| Label | Description |
|-------|-------------|
| `V1` | Victoire équipe 1 (domicile) |
| `V2` | Victoire équipe 2 (extérieur) |
| `229.5 Plus de` | Over 229.5 points |
| `229.5 Moins de` | Under 229.5 points |
| `1X` | Double chance domicile/nul |
| `X2` | Double chance nul/extérieur |

---

## ⚠️ Règles absolues (ne jamais violer)

1. **Cote minimum par sélection : 1.50** — en dessous c'est interdit
2. **Zéro doublon** — une sélection ne peut apparaître que dans 1 coupon par jour
3. **Vérifier les blessures** avant de finaliser (Google News + Sofascore)
4. **Vérifier les compositions** publiées 1h avant le match
5. **Un doute = on retire la sélection**

---

## 📡 APIs

### Footia
```
GET https://appfootia.com/tipster/public/add-cupon-api?code=CODE&cote=COTE
```

### BetAI
```
POST https://api.appbetai.com/api/admin/coupons
Headers: X-API-Key: vkjuhriouhgrljherihenokhbreoiughggpiub_BAI
Body: { date, coupon_name, code, strategy, total_odds, start_time, end_time, events[] }
```

---

## 📊 Suivi des performances

Les résultats des coupons sont trackés dans `PERFORMANCE.md`.

---

*Projet maintenu par Koudy 🎯 — Agent IA Paris Sportifs*
