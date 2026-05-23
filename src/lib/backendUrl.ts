import {
  isLocalBackendHost,
  isPlayerDistributionBuild,
  isPrivateLanHost,
} from "src/config/backendNetwork";
import { useConfigControl } from "src/state/config";

export const DEFAULT_BACKEND_PORT = 3551;

export function portFromParsedUrl(parsed: URL): number {
  if (parsed.port) return Number(parsed.port);
  if (parsed.protocol === "https:") return 443;
  return DEFAULT_BACKEND_PORT;
}

/** Normalise une URL API (HTTPS Cloudflare = port 443 implicite, pas :3551). */
export function normalizeBackendUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme = trimmed.startsWith("http") ? trimmed : `http://${trimmed}`;
    const parsed = new URL(withScheme);
    if (parsed.port) {
      return `${parsed.protocol}//${parsed.hostname}:${parsed.port}`;
    }
    if (parsed.protocol === "https:") {
      return `${parsed.protocol}//${parsed.hostname}`;
    }
    return `${parsed.protocol}//${parsed.hostname}:${DEFAULT_BACKEND_PORT}`;
  } catch {
    return null;
  }
}

export function parseBackendUrlList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map(normalizeBackendUrl)
    .filter((u): u is string => Boolean(u));
}

function defaultBaseUrlFromEnv(): string {
  const fromEnv = normalizeBackendUrl(
    (import.meta.env.VITE_IDOLS_API_URL as string | undefined) || ""
  );
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV && !isPlayerDistributionBuild) {
    return `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;
  }
  return `http://idols-backend:${DEFAULT_BACKEND_PORT}`;
}

/** URL API à partir de host/port. */
export function buildBackendBaseUrl(
  host: string,
  port: number,
  fallbackBaseUrl?: string
): string {
  const fallback = fallbackBaseUrl || defaultBaseUrlFromEnv();
  const h = (host || "").trim();
  const p = port > 0 ? port : DEFAULT_BACKEND_PORT;

  if (h.startsWith("http://") || h.startsWith("https://")) {
    const normalized = normalizeBackendUrl(h);
    return normalized || h.replace(/\/$/, "");
  }

  if (!h) {
    return fallback;
  }

  if (isLocalBackendHost(h)) {
    if (import.meta.env.DEV && !isPlayerDistributionBuild) {
      return `http://127.0.0.1:${p}`;
    }
    return fallback;
  }

  if (isPrivateLanHost(h) && isPlayerDistributionBuild) {
    return fallback;
  }

  return `http://${h}:${p}`;
}

export function resolveAxiosBaseUrl(fallbackBaseUrl?: string): string {
  const stored = useConfigControl.getState().backend_base_url?.trim();
  if (stored) {
    const normalized = normalizeBackendUrl(stored);
    if (normalized) return normalized;
  }
  const { backend_host, backend_port } = useConfigControl.getState();
  return buildBackendBaseUrl(backend_host, backend_port, fallbackBaseUrl);
}

export function resolveGameBackendTarget(fallbackBaseUrl?: string): {
  host: string;
  port: number;
} {
  const base = resolveAxiosBaseUrl(fallbackBaseUrl);
  try {
    const parsed = new URL(base);
    return {
      host: parsed.hostname,
      port: portFromParsedUrl(parsed),
    };
  } catch {
    const state = useConfigControl.getState();
    return { host: state.backend_host, port: state.backend_port };
  }
}

export function setWorkingBackendBaseUrl(baseUrl: string): void {
  const normalized = normalizeBackendUrl(baseUrl);
  if (!normalized) return;

  try {
    const parsed = new URL(normalized);
    const port = portFromParsedUrl(parsed);
    const state = useConfigControl.getState();
    state.set_backend_base_url(normalized);
    state.set_backend_host(parsed.hostname);
    state.set_backend_port(port);
  } catch {
    /* ignore */
  }
}

export function isReachableBackendUrl(url: string): boolean {
  if (!isPlayerDistributionBuild) return true;
  try {
    const host = new URL(url).hostname;
    return !isLocalBackendHost(host) && !isPrivateLanHost(host);
  } catch {
    return false;
  }
}
