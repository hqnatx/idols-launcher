import axios from "axios";
import { IDOLS } from "src/config/idols";
import {
  normalizeBackendUrl,
  setWorkingBackendBaseUrl,
} from "src/lib/backendUrl";

export type RemoteLauncherConfig = {
  updated_at?: string;
  backend_api_url?: string;
  launcher?: {
    latest_version?: string;
    download_url?: string;
    github_repo?: string;
    auto_update?: boolean;
    notes?: string;
  };
};

const CACHE_MS = 2 * 60 * 1000;
let cached: RemoteLauncherConfig | null = null;
let cachedAt = 0;

export async function fetchRemoteLauncherConfig(
  force = false
): Promise<RemoteLauncherConfig | null> {
  if (!force && cached && Date.now() - cachedAt < CACHE_MS) {
    return cached;
  }

  try {
    const url = `${IDOLS.launcherRemoteConfigUrl}?t=${Date.now()}`;
    const { data } = await axios.get<RemoteLauncherConfig>(url, {
      timeout: 12000,
      headers: { Accept: "application/json" },
    });
    if (!data || typeof data !== "object") return null;
    cached = data;
    cachedAt = Date.now();
    return data;
  } catch {
    return cached;
  }
}

/** Applique l’URL backend publiée sur GitHub (tunnel Cloudflare). */
export function applyRemoteBackendUrl(config: RemoteLauncherConfig | null): boolean {
  const raw = config?.backend_api_url?.trim();
  if (!raw) return false;
  const normalized = normalizeBackendUrl(raw);
  if (!normalized) return false;
  setWorkingBackendBaseUrl(normalized);
  return true;
}

export function clearRemoteConfigCache(): void {
  cached = null;
  cachedAt = 0;
}
