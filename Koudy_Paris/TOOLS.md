# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics - the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Browser Automation (1xBet) — Anti-blocage & Débogage Complet

> ⚠️ **Règle absolue : Koudy ne demande JAMAIS à l'utilisateur de déboguer le navigateur. Il se débrouille seul, étape par étape.**

---

### Comprendre les deux profils

| Profil | Quand l'utiliser | Avantage | Inconvénient |
|--------|-----------------|----------|--------------|
| `profile=chrome` | Si l'utilisateur a activé le Browser Relay (badge ON sur l'onglet) | Utilise le vrai Chrome de l'user | Nécessite un onglet attaché manuellement |
| `profile=openclaw` | Par défaut, toujours disponible | Autonome, pas besoin d'action user | Navigateur isolé, pas les cookies du user |

**→ Utiliser `profile=openclaw` par défaut pour 1xBet. C'est plus fiable.**

---

### Procédure de démarrage (avant chaque session 1xBet)

```
Étape 1 : Vérifier le statut
  → browser(action=status, profile=openclaw)

Étape 2 : Si navigateur non démarré ou erreur
  → browser(action=start, profile=openclaw)
  → Attendre 3-5 secondes

Étape 3 : Ouvrir 1xBet
  → browser(action=open, profile=openclaw, url="https://1xlite-96866.pro/fr/")
  → Attendre le chargement complet (4-6 secondes)

Étape 4 : Prendre un snapshot pour vérifier
  → browser(action=snapshot, profile=openclaw, refs=aria)
  → Vérifier que la page 1xBet est visible
```

---

### Arbre de Décision — Quand ça bloque

```
Problème navigateur détecté ?
│
├── "No tab connected" ou "relay not active"
│   └── → Basculer sur profile=openclaw (pas profile=chrome)
│
├── "Browser not started" / "Session expired"
│   └── → browser(action=start, profile=openclaw)
│       → Puis browser(action=open, url=...)
│
├── Page blanche ou timeout lors du snapshot
│   └── → browser(action=navigate, url="https://1xlite-96866.pro/fr/")
│       → Attendre 5 secondes
│       → Reprendre le snapshot
│
├── Gateway down / "connection refused"
│   └── → exec: openclaw gateway restart
│       → Attendre 5 secondes
│       → Reprendre depuis Étape 1
│
├── 1xBet charge mais affiche CAPTCHA / blocage
│   └── → Attendre 30 secondes puis recharger
│       → Si persiste : utiliser une URL miroir (voir SKILL.md §11)
│       → Ne pas spammer les rechargements (aggrave le blocage)
│
└── Snapshot retourne une page vide / erreur JS
    └── → browser(action=navigate, url="https://1xlite-96866.pro/fr/line/football")
        → Forcer le rechargement avec Ctrl+Shift+R via act
        → Reprendre depuis le snapshot
```

---

### Séquence d'auto-correction complète (à exécuter sans demander)

Si quelque chose bloque, Koudy exécute cette séquence dans l'ordre, s'arrête dès que ça marche :

```
1. browser(status, chrome)          → A un onglet relay actif ?
   OUI → continuer avec chrome
   NON → passer à openclaw

2. browser(status, openclaw)        → Navigateur démarré ?
   OUI → browser(open, openclaw, url=1xBet)
   NON → browser(start, openclaw) → browser(open, ...)

3. browser(snapshot, openclaw)      → Page 1xBet visible ?
   OUI → continuer le travail
   NON → openclaw gateway restart → recommencer depuis 2

4. Si gateway restart ne suffit pas :
   exec: pkill -f "openclaw gateway" && sleep 2 && openclaw gateway start
   → Attendre 5 secondes → recommencer depuis 1
```

---

### Pour 1xBet spécifiquement

- **Snapshot** : toujours utiliser `refs=aria` (plus stable que `refs=role` sur les interfaces JS dynamiques)
- **Login** : après ouverture, vérifier si déjà connecté (chercher `.balance` ou `.user-info` dans le snapshot)
- **Code coupon** : naviguer vers le panneau coupon → `Enregistrer / charger des événements` → `Enregistrer` → lire le code affiché
- **Si la page tourne infiniment** : c'est souvent le mode headless qui est détecté → le profil `openclaw` tourne en mode visible par défaut, ce qui contourne ça
- **Anti-détection bot** : ne pas faire plus de 3 clics/seconde, ajouter des `wait` entre les actions importantes

---

### Commandes utiles de diagnostic

```bash
# Statut du gateway OpenClaw
openclaw gateway status

# Redémarrer le gateway
openclaw gateway restart

# Voir les logs du gateway (pour déboguer)
openclaw gateway logs

# Tuer les processus Chrome orphelins
pkill -f google-chrome
pkill -f chromium

# Vérifier que Chrome est disponible
which google-chrome && google-chrome --version
```
