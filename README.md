# idols launcher

Launcher **Tauri + React** (moteur de lancement retrac/carter) avec l’interface et la config **idols-link** (backend local, pas de cloud Retrac).

## idols-link vs Retrac

| | idols launcher | Retrac d’origine |
|--|----------------|------------------|
| API | `http://127.0.0.1:3551` (backend idols) | `https://retrac.0xkaede.xyz/` |
| Deep link | `idols.launcher://auth:…` | `snow://` |
| PAK Retrac | non (pas de `pakchunkRetrac`) | oui |
| Anti-cheat | **non** (`-noeac`, pas de `Retrac_EAC.exe`) | oui |
| CDN 0xkaede | non | oui |

Constantes : `src/config/idols.ts` (Discord, GitHub, port 3551, etc.).

## Prérequis (Windows)

1. **Node.js** 18+ (`node`, `npm`)
2. **Rust** : [https://rustup.rs](https://rustup.rs) puis redémarrer le terminal (`cargo`, `rustc`)
3. **Visual Studio Build Tools** — charge de travail « Développement Desktop en C++ » (linker MSVC)
4. **WebView2** — en général déjà installé sur Windows 11

## Développement (fenêtre de dev)

```powershell
cd c:\dev\idols-publique\idols-launcher
npm install
npm run tauri dev
```

## Build exécutable (.exe)

```powershell
cd c:\dev\idols-publique\idols-launcher
npm install
npm run tauri build
```

Sortie typique :

- `src-tauri\target\release\idols launcher.exe`
- Installateur MSI/NSIS dans `src-tauri\target\release\bundle\` (selon config Tauri)

Build **frontend seul** (sans Tauri) :

```powershell
npm run build
```

→ dossier `dist\` (utile pour debug Vite, pas pour distribuer l’app desktop).

Lance le **backend idols** sur le port configuré (défaut **3551**) avant de jouer en mode passwordless.

## Installateur Windows (Inno Setup)

1. [Inno Setup 6](https://jrsoftware.org/isinfo.php)
2. Rust + Node (voir prérequis ci-dessus)

```powershell
cd c:\dev\idols-publique\idols-launcher
powershell -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

Produit : **`dist\idols launcher Setup-1.0.0.exe`** (version lue depuis `src-tauri\tauri.conf.json`).

Options :
- `-SkipTauriBuild` — ne recompile pas Tauri (utilise déjà `src-tauri\target\release\`)
- `-SkipInnoCompile` — build Tauri seulement, pas l’Inno

Alternative sans Inno : après `npm run tauri build`, installateur Tauri dans `src-tauri\target\release\bundle\` (msi/nsis).

## Identité app

- **Bundle ID** : `hqnata.idols.launcher`
- **Nom** : idols launcher
- App **distincte** d’idols-link (ne pas confondre au lancement Windows)

## UI idols

- `src/components/idols/` — shell, sidebar, particules
- `src/state/appearance.ts` — blur, particules, langue
- `src/pages/idols-settings.tsx` — Apparence + Jeu
