import {
  DEFAULT_BACKEND_PORT,
  normalizeBackendUrl,
  parseBackendUrlList,
} from "src/lib/backendUrl";
import {
  isLocalBackendHost,
  isPlayerDistributionBuild,
  isPrivateLanHost,
} from "src/config/backendNetwork";

export {
  isLocalBackendHost,
  isPrivateLanHost,
  isPlayerDistributionBuild,
} from "src/config/backendNetwork";

/** Application Discord idols (idols-link) — pas l’app Retrac `1212184991732080700`. */
export const IDOLS_DISCORD_APPLICATION_ID = "1500098057994371072";

export const IDOLS_DEEP_LINK_SCHEME = "idols.launcher";

/** Redirect OAuth enregistré sur Discord — retour direct dans le launcher. */
export const IDOLS_DISCORD_REDIRECT_URI = `${IDOLS_DEEP_LINK_SCHEME}://auth`;

function filterUrlsForDistribution(urls: string[]): string[] {
  if (!isPlayerDistributionBuild) return urls;
  return urls.filter((url) => {
    try {
      const host = new URL(url).hostname;
      return !isLocalBackendHost(host) && !isPrivateLanHost(host);
    } catch {
      return false;
    }
  });
}

/** URLs compilées dans l’installateur. */
function resolveBakedBackendTryUrls(): string[] {
  const fromList = parseBackendUrlList(
    import.meta.env.VITE_IDOLS_API_URLS as string | undefined
  );
  if (fromList.length > 0) {
    return filterUrlsForDistribution([...new Set(fromList)]);
  }

  const urls = filterUrlsForDistribution([
    ...parseBackendUrlList(import.meta.env.VITE_IDOLS_API_URL as string | undefined),
    ...parseBackendUrlList(
      import.meta.env.VITE_IDOLS_API_URL_ALT as string | undefined
    ),
  ]);
  return [...new Set(urls)];
}

/** Adresse principale affichée / config par défaut (première URL du build). */
function resolveBakedBackend(): {
  host: string;
  port: number;
  baseUrl: string;
} {
  const tryUrls = resolveBakedBackendTryUrls();
  if (tryUrls[0]) {
    const parsed = new URL(tryUrls[0]);
    const port = parsed.port
      ? Number(parsed.port)
      : parsed.protocol === "https:"
        ? 443
        : DEFAULT_BACKEND_PORT;
    return {
      host: parsed.hostname,
      port,
      baseUrl: tryUrls[0],
    };
  }

  const rawUrl = (import.meta.env.VITE_IDOLS_API_URL as string | undefined)?.trim();
  if (rawUrl) {
    const normalized = normalizeBackendUrl(rawUrl);
    if (normalized) {
      const parsed = new URL(normalized);
      const port = parsed.port
        ? Number(parsed.port)
        : parsed.protocol === "https:"
          ? 443
          : DEFAULT_BACKEND_PORT;
      return {
        host: parsed.hostname,
        port,
        baseUrl: normalized,
      };
    }
  }

  const host = (
    import.meta.env.VITE_IDOLS_BACKEND_HOST as string | undefined
  )?.trim();
  const port = Number(
    (import.meta.env.VITE_IDOLS_BACKEND_PORT as string | undefined)?.trim()
  );

  if (host) {
    const p = port > 0 ? port : DEFAULT_BACKEND_PORT;
    return {
      host,
      port: p,
      baseUrl: `http://${host}:${p}`,
    };
  }

  if (import.meta.env.DEV) {
    return {
      host: "127.0.0.1",
      port: DEFAULT_BACKEND_PORT,
      baseUrl: `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`,
    };
  }

  console.error(
    "[idols launcher] VITE_IDOLS_API_URL manquant au build. Les joueurs ne pourront pas joindre ton backend."
  );
  return {
    host: "idols-backend",
    port: DEFAULT_BACKEND_PORT,
    baseUrl: `http://idols-backend:${DEFAULT_BACKEND_PORT}`,
  };
}

const bakedBackend = resolveBakedBackend();
const bakedBackendTryUrls = resolveBakedBackendTryUrls();

/** Constants aligned with idols-link (not Retrac cloud). */
export const IDOLS = {
  displayName: "idols launcher",
  bundleId: "hqnata.idols.launcher",
  deepLinkScheme: IDOLS_DEEP_LINK_SCHEME,

  /** Serveur idols hébergé (ton PC / VPS) — défini au build via .env */
  defaultBackendHost: bakedBackend.host,
  defaultBackendPort: bakedBackend.port,
  defaultBackendBaseUrl: bakedBackend.baseUrl,
  /** URLs de test au runtime (installateur joueurs = Cloudflare seulement). */
  backendTryUrls: bakedBackendTryUrls,
  isPlayerDistributionBuild,

  discordInvite: "https://discord.gg/D7YcfsT5RX",
  discordOAuth: {
    clientId:
      (import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined)?.trim() ||
      IDOLS_DISCORD_APPLICATION_ID,
    redirectUri:
      (import.meta.env.VITE_DISCORD_REDIRECT_URI as string | undefined)?.trim() ||
      IDOLS_DISCORD_REDIRECT_URI,
    scope: "identify",
    state: "IDOLS_LAUNCHER",
  },
  githubRepo:
    (import.meta.env.VITE_IDOLS_GITHUB_REPO as string | undefined)?.trim() ||
    "https://github.com/hqnatx/idols-launcher",
  githubReleases:
    (import.meta.env.VITE_IDOLS_GITHUB_RELEASES as string | undefined)?.trim() ||
    "https://github.com/hqnatx/idols-launcher/releases",
  launcherContentUrl:
    "https://raw.githubusercontent.com/hqnatx/idols-Link/main/launcher-content.json",
  /** Config distante idols-launcher (URL backend + MAJ) — publish-launcher-remote.ps1 */
  launcherRemoteConfigUrl:
    (import.meta.env.VITE_IDOLS_REMOTE_CONFIG_URL as string | undefined)?.trim() ||
    "https://raw.githubusercontent.com/hqnatx/idols-launcher/main/idols-launcher-remote.json",
  launcherGithubRepo:
    (import.meta.env.VITE_IDOLS_GITHUB_REPO_SLUG as string | undefined)?.trim() ||
    "hqnatx/idols-launcher",
  assetsBaseUrl:
    "https://raw.githubusercontent.com/hqnatx/idols-Link/main/idols_link_flutter/assets/images/",
  dllListApi:
    "https://api.github.com/repos/hqnatx/idols-Link/contents/idols_link_flutter/assets/dlls?ref=main",

  discordRpcAppId: IDOLS_DISCORD_APPLICATION_ID,
  dataDirName: "idols launcher",

  errorTitle: "idols launcher",
} as const;

export const idolsApiBaseUrl = (): string => IDOLS.defaultBackendBaseUrl;

export { buildBackendBaseUrl } from "src/lib/backendUrl";
