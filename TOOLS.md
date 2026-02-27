# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

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

## Browser Automation (1xBet) — Anti-blocage

### Règle permanente
- **Ne plus demander à l’utilisateur de déboguer l’ouverture navigateur.**
- Si `profile=chrome` n’a pas d’onglet attaché Relay, **basculer automatiquement sur `profile=openclaw`** et continuer.

### Procédure standard (auto-correction)
1. Vérifier `browser.status` sur `chrome`.
2. Si pas d’onglet attaché / pas de relay actif:
   - `openclaw gateway restart`
   - `browser.start` avec `profile=openclaw`
   - `browser.open` sur l’URL cible
3. Continuer l’automatisation dans `openclaw` (snapshot/act), sans demander d’action côté user.

### Pour 1xBet
- Prioriser `profile=openclaw` si urgence/exécution immédiate.
- Utiliser les refs ARIA (`snapshot refs=aria`) pour des clics stables.
- Pour code coupon: utiliser le panneau coupon → `Enregistrer / charger des événements` → `Enregistrer`, puis lire le code affiché.
