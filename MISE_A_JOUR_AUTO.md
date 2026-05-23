# Mises à jour automatiques — idols launcher

> **idols launcher** = ce projet (Tauri).  
> **idols-link** = autre app (Flutter) ; seules quelques images passent encore par son repo GitHub.

## Principe

1. Fichier hébergé sur GitHub : **`idols-launcher/idols-launcher-remote.json`**
2. Au lancement, idols launcher le télécharge et applique :
   - **`backend_api_url`** → ton tunnel Cloudflare (MongoDB chez toi)
   - **`launcher.latest_version`** + releases GitHub **idols-launcher** → MAJ auto de l’exe

Les joueurs n’ont pas besoin d’un nouvel installateur quand l’URL Cloudflare change — il faut pousser ce JSON sur GitHub.

## Quand le tunnel Cloudflare change

```powershell
cd c:\dev\idols-publique\backend_idols
.\LANCER-INTERNET-CLOUDFLARE.bat
```

Puis pousse le fichier (repo **idols-launcher** sur GitHub) :

```powershell
git add idols-launcher/idols-launcher-remote.json
git commit -m "chore: update backend URL"
git push
```

## Quand tu publies une nouvelle version du launcher

1. Monte la version dans `package.json` et `src-tauri/tauri.conf.json`
2. `installer\build-installer.ps1`
3. **GitHub Release** sur `hqnatx/idols-launcher` avec `idols launcher Setup-x.x.x.exe`
4. Relance `publish-launcher-remote.ps1` (met à jour `latest_version`)
5. `git push`

## Repo GitHub

Par défaut : `https://github.com/hqnatx/idols-launcher`  
Si ton repo a un autre nom, mets dans `.env.production` :

```env
VITE_IDOLS_GITHUB_REPO_SLUG=ton-user/ton-repo
VITE_IDOLS_REMOTE_CONFIG_URL=https://raw.githubusercontent.com/ton-user/ton-repo/main/idols-launcher-remote.json
```
