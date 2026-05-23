# Connexion Discord — directement dans le launcher

Le launcher ne redirige **pas** vers `http://127.0.0.1:3551/...`.  
Après « Autoriser », Discord renvoie vers :

```
idols.launcher://auth
```

Le launcher échange le code avec Discord (PKCE, sans secret) et enregistre la session.

## Portail Discord (obligatoire)

Application **idols** — Client ID `1500098057994371072`

1. [Discord Developer Portal](https://discord.com/developers/applications) → ton app idols
2. **OAuth2** → **Redirects** → ajoute **exactement** :
   ```
   idols.launcher://auth
   ```
3. Sauvegarde

Si tu vois « redirect_uri OAuth2 non valide », cette URL n’est pas (ou pas exactement) dans la liste.

## Flux technique

1. Clic « Se connecter avec Discord » → URL `discord.com/oauth2/authorize` (PKCE)
2. Autorisation → `idols.launcher://auth?code=...&state=IDOLS_LAUNCHER`
3. Le launcher échange le code → `access_token` Discord
4. Le launcher appelle `POST /snow/auth/discord` avec l’`access_token` → compte MongoDB + JWT launcher
5. Les appels suivants (`GET /snow/player`, settings, code de jeu…) utilisent ce **JWT**, pas le token Discord

Le **backend** enregistre le compte ; il n’est pas la page de callback OAuth dans le navigateur.

## `.env` (optionnel)

```env
VITE_DISCORD_CLIENT_ID=1500098057994371072
VITE_DISCORD_REDIRECT_URI=idols.launcher://auth
```

## Test

1. Redirect `idols.launcher://auth` dans le portail Discord
2. Rebuild ou `npm run tauri dev`
3. Connexion → autoriser → retour automatique dans idols launcher
