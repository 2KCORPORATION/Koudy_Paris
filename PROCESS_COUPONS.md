# 🎯 PROCESS GÉNÉRATION DE COUPONS

*Mis à jour le 28 Février 2026 — à appliquer dès demain*

---

## Étape 1 — Scraper les matchs du jour
- Récupérer tous les matchs disponibles sur 1xBet (football + basket)
- Identifier les ligues prioritaires (PL, Bundesliga, Ligue 1, Serie A, La Liga, NBA, FIBA)
- Vérifier les horaires pour ne pas rater les matchs qui commencent tôt

---

## Étape 2 — Recherches approfondies pour chaque équipe sélectionnée

### 🏥 Blessures & suspensions
- Chercher sur Google News : `"[équipe]" blessure OR blessé OR suspendu OR absent`
- Vérifier sur Sofascore / Transfermarkt / équipe officielle
- **Si un joueur clé est absent → retirer la sélection ou baisser la confiance**

### 📋 Compositions officielles
- Publiées ~1h avant le match
- Vérifier sur Sofascore, FlashScore, BBC Sport, L'Équipe
- **Ne finaliser les coupons qu'après publication des compos si possible**

### 📰 Conférences de presse d'avant-match
- Chercher : `"[équipe]" conférence presse OR press conference [date]`
- Chercher les déclarations de l'entraîneur sur la motivation, le contexte, la fatigue
- **Un entraîneur qui "tourne" son effectif avant une coupe = danger pour le coupon**

### 📱 Réseaux sociaux & actualité récente
- Twitter/X officiel des clubs pour les dernières infos
- Google News sur les 48h précédentes
- Chercher : incidents, tensions internes, fatigue après voyage, météo si match extérieur

---

## Étape 3 — Analyse et scoring de chaque sélection

Pour chaque sélection, noter :

| Critère | Poids |
|---------|-------|
| Forme récente (5 derniers matchs) | 25% |
| H2H (confrontations directes) | 20% |
| Domicile/Extérieur | 15% |
| Blessures clés vérifiées | 20% |
| Composition officielle | 10% |
| Conférence de presse / Motivation | 10% |

→ **Sélection retenue si score global ≥ 70%**

---

## Étape 4 — Construction des coupons

- **Footia** : 2 coupons football (4 matchs chacun max)
- **BetAI** : 5 coupons basket (2-4 matchs chacun)
- Cote totale minimum : ×2.0
- Mixer les strategies : Safe, Équilibré, Valeur

---

## Étape 5 — Génération des codes sur 1xBet

1. Naviguer vers les matchs sélectionnés
2. Ajouter les cotes au betslip
3. Cliquer "Enregistrer / charger des événements" → "Enregistrer"
4. Copier le code généré

---

## Étape 6 — Envoi aux APIs

- **Footia** : `GET https://appfootia.com/tipster/public/add-cupon-api?code=CODE&cote=COTE`
- **BetAI** : `POST https://api.appbetai.com/api/admin/coupons` avec `X-API-Key`

---

## ⚠️ Règles absolues

1. **Jamais de sélection sans vérification des blessures**
2. **Toujours vérifier la composition avant de finaliser** (si déjà publiée)
3. **Un doute = on retire la sélection** plutôt que de prendre un risque
4. **Documenter chaque coupon** dans `coupons/YYYY-MM-DD.md`
5. **Enregistrer les résultats** dans PERFORMANCE.md après les matchs

---

## 🚨 RÈGLES ANTI-ERREURS GRAVES (ajoutées le 28/02/2026)

### Règle 1 — ZÉRO doublon entre coupons [FAUTE GRAVE]
- Avant de finaliser les coupons, lister TOUTES les sélections de TOUS les coupons
- **Aucune sélection (match + type de pari) ne doit apparaître dans 2 coupons différents**
- Si un match revient deux fois → remplacer l'un des deux par un autre match
- Vérification obligatoire : faire la liste complète et chercher les doublons avant d'envoyer

### Règle 2 — Cote minimum 1.5 par sélection [FAUTE GRAVE]
- **Toute sélection dont la cote est inférieure à 1.50 est INTERDITE**
- Une cote à 1.07 ou 1.19 n'apporte rien et ajoute du risque inutile
- Si on ne trouve pas assez de sélections à cote ≥ 1.50 → réduire le nombre de matchs dans le coupon plutôt que de diluer avec des cotes de misère

### Récapitulatif des fautes du 28/02/2026
- CIV V1 (1.187) utilisé dans 3 coupons différents ❌
- Angola V2 dans 2 coupons ❌
- Heat V1 dans 2 coupons ❌
- Hornets OVER dans 2 coupons ❌
- Mali V2 à 1.068 placé dans un coupon ❌
- CIV V1 à 1.187 placé dans un coupon ❌

---

*Ce process est obligatoire. Pas de raccourcis.*
