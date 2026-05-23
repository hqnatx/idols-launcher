# Fusion retrac × idols-link

## Principe

| Source | Rôle dans idols launcher |
|--------|---------------------------|
| **retrac** | 100 % du moteur : Tauri, `carter.rs`, API, library, play, auth, PAK |
| **idols-link** | UI uniquement : fond + blur, particules, sidebar, verre, couleurs, paramètres Apparence |

Le projet Flutter précédent dans ce dossier a été **remplacé** par une copie de retrac re-skinée.

Assets visuels : `public/` et `src-tauri/icons/` proviennent de **idols-link** (`idols_logo.png`, fond, bannières), pas de retrac.

## Fichiers clés

- `src-tauri/` — backend retrac (inchangé fonctionnellement)
- `src/components/idols/` — shell idols
- `src/state/appearance.ts` — blur, particules, langue
- `src/pages/idols-settings.tsx` — overlay paramètres

## Lancer

```bash
npm install
npm run tauri dev
```

(ou `yarn` si installé)
