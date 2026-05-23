import axios from "axios";
import { isPlayerDistributionBuild } from "src/config/backendNetwork";
import { IDOLS, isLocalBackendHost, isPrivateLanHost } from "src/config/idols";
import {
  buildBackendBaseUrl,
  isReachableBackendUrl,
  setWorkingBackendBaseUrl,
} from "src/lib/backendUrl";
import { useConfigControl } from "src/state/config";

const TIMEOUT_LAN_MS = 5000;
const TIMEOUT_LOCALHOST_MS = 600;
const TIMEOUT_WAN_MS = 12000;

function hostFromBaseUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "";
  }
}

function timeoutForBaseUrl(baseUrl: string): number {
  const host = hostFromBaseUrl(baseUrl);
  if (isLocalBackendHost(host)) return TIMEOUT_LOCALHOST_MS;
  if (isPrivateLanHost(host)) return TIMEOUT_LAN_MS;
  return TIMEOUT_WAN_MS;
}

/** Dev : localhost d’abord. Prod : Internet, LAN, puis localhost (hôte). */
function sortTryUrls(urls: string[]): string[] {
  const score = (url: string) => {
    const host = hostFromBaseUrl(url);
    if (import.meta.env.DEV) {
      if (isLocalBackendHost(host)) return 0;
      if (isPrivateLanHost(host) && !isLocalBackendHost(host)) return 1;
      return 2;
    }
    if (!isLocalBackendHost(host) && !isPrivateLanHost(host)) return 0;
    if (isPrivateLanHost(host) && !isLocalBackendHost(host)) return 1;
    return 2;
  };
  return [...urls].sort((a, b) => score(a) - score(b));
}

function bakedUrlsIncludeLan(): boolean {
  return IDOLS.backendTryUrls.some((url) => {
    const host = hostFromBaseUrl(url);
    return isPrivateLanHost(host) && !isLocalBackendHost(host);
  });
}

export function getBackendBaseUrlsToTry(): string[] {
  const urls: string[] = [];

  const { backend_base_url, backend_host, backend_port } =
    useConfigControl.getState();
  if (backend_base_url?.trim()) {
    const stored = backend_base_url.trim().replace(/\/$/, "");
    if (isReachableBackendUrl(stored)) {
      urls.push(stored);
    }
  }

  for (const baked of IDOLS.backendTryUrls) {
    if (isReachableBackendUrl(baked)) urls.push(baked);
  }

  if (backend_host?.trim() && !isPlayerDistributionBuild) {
    urls.push(
      buildBackendBaseUrl(
        backend_host,
        backend_port,
        IDOLS.defaultBackendBaseUrl
      )
    );
  }

  if (!isPlayerDistributionBuild) {
    const includeLocalhost = import.meta.env.DEV || !bakedUrlsIncludeLan();
    if (
      includeLocalhost &&
      !urls.some((u) => isLocalBackendHost(hostFromBaseUrl(u)))
    ) {
      urls.push(
        buildBackendBaseUrl("127.0.0.1", IDOLS.defaultBackendPort, IDOLS.defaultBackendBaseUrl)
      );
    }
  }

  return sortTryUrls([...new Set(urls)]);
}

export type BackendPostResult<T> =
  | { ok: true; data: T; baseUrl: string }
  | { ok: false; error: string };

async function probeReachable(baseUrl: string): Promise<boolean> {
  try {
    await axios.get(`${baseUrl}/snow/launcher`, {
      timeout: timeoutForBaseUrl(baseUrl),
    });
    return true;
  } catch {
    return false;
  }
}

/** Au démarrage : trouve un backend joignable et mémorise son URL. */
export async function discoverWorkingBackendBaseUrl(): Promise<string | null> {
  for (const baseUrl of getBackendBaseUrlsToTry()) {
    if (await probeReachable(baseUrl)) {
      setWorkingBackendBaseUrl(baseUrl);
      return baseUrl;
    }
  }
  return null;
}

export async function postBackendJson<T>(
  path: string,
  body: unknown
): Promise<BackendPostResult<T>> {
  let lastError = isPlayerDistributionBuild
    ? "Serveur idols injoignable. L’hôte doit laisser le backend et le tunnel Cloudflare allumés."
    : "Serveur idols injoignable.";

  const tryUrls = getBackendBaseUrlsToTry();
  if (tryUrls.length === 0) {
    return {
      ok: false,
      error:
        "Aucune URL serveur configurée. Rebuild l’installateur avec l’URL Cloudflare (tunnel-url.txt).",
    };
  }

  for (const baseUrl of tryUrls) {
    const reachable = await probeReachable(baseUrl);
    if (!reachable) {
      lastError = "Serveur idols injoignable.";
      continue;
    }

    try {
      const response = await axios.post<T>(`${baseUrl}${path}`, body, {
        timeout: TIMEOUT_LAN_MS,
      });
      setWorkingBackendBaseUrl(baseUrl);
      return { ok: true, data: response.data, baseUrl };
    } catch (e: unknown) {
      const err = e as {
        code?: string;
        message?: string;
        response?: { data?: { error?: string }; status?: number };
      };
      if (err.response?.data?.error) {
        lastError = err.response.data.error;
      } else if (err.code === "ECONNREFUSED") {
        lastError =
          "Connexion refusée (backend arrêté ou pare-feu Windows — lance OUVRIR-PAREFEU-LAN.bat en admin).";
      } else if (
        err.code === "ETIMEDOUT" ||
        err.message?.toLowerCase().includes("timeout")
      ) {
        lastError =
          "Délai dépassé (pas le même Wi‑Fi, Wi‑Fi invité, ou mauvaise IP du serveur).";
      } else {
        lastError = err.message || "Serveur idols injoignable.";
      }
    }
  }

  return { ok: false, error: lastError };
}
