import axios from "axios";
import { invoke } from "@tauri-apps/api/tauri";
import { getVersion } from "@tauri-apps/api/app";
import { cacheDir, join } from "@tauri-apps/api/path";
import { IDOLS } from "src/config/idols";
import { isNewerVersion } from "src/lib/versionCompare";
import type { RemoteLauncherConfig } from "src/lib/remoteConfig";
import { fetchRemoteLauncherConfig } from "src/lib/remoteConfig";

export type LauncherUpdateOffer = {
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  notes?: string;
};

type GhRelease = {
  tag_name?: string;
  html_url?: string;
  body?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
};

function pickLauncherAssetUrl(assets: GhRelease["assets"]): string | null {
  if (!assets?.length) return null;
  let installerExe: string | null = null;
  let setupExe: string | null = null;
  let anyExe: string | null = null;
  let fallback: string | null = null;

  for (const asset of assets) {
    const url = asset.browser_download_url?.trim();
    if (!url) continue;
    fallback ??= url;
    const name = (asset.name || "").toLowerCase();
    if (!name.includes("launcher") && !name.includes("idols")) continue;
    if (!name.endsWith(".exe")) continue;
    if (name.includes("setup") || name.includes("installer")) {
      installerExe ??= url;
    } else if (name.includes("install")) {
      setupExe ??= url;
    } else {
      anyExe ??= url;
    }
  }

  return installerExe || setupExe || anyExe || fallback;
}

async function fetchGitHubRelease(
  repo: string
): Promise<{ version: string; downloadUrl: string; notes?: string } | null> {
  const slug = repo.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
  if (!slug.includes("/")) return null;

  try {
    const { data } = await axios.get<GhRelease>(
      `https://api.github.com/repos/${slug}/releases/latest`,
      {
        timeout: 15000,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "idols-launcher",
        },
      }
    );
    const version = (data.tag_name || "").trim();
    const downloadUrl =
      pickLauncherAssetUrl(data.assets) || (data.html_url || "").trim();
    if (!version || !downloadUrl) return null;
    return {
      version,
      downloadUrl,
      notes: data.body?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export async function checkForLauncherUpdate(
  remote?: RemoteLauncherConfig | null
): Promise<LauncherUpdateOffer | null> {
  const cfg = remote ?? (await fetchRemoteLauncherConfig());
  const currentVersion = await getVersion();

  let latestVersion = cfg?.launcher?.latest_version?.trim() || "";
  let downloadUrl = cfg?.launcher?.download_url?.trim() || "";
  let notes = cfg?.launcher?.notes?.trim();

  if (!latestVersion || !downloadUrl) {
    const repo =
      cfg?.launcher?.github_repo?.trim() || IDOLS.launcherGithubRepo;
    const gh = await fetchGitHubRelease(repo);
    if (gh) {
      if (!latestVersion) latestVersion = gh.version;
      if (!downloadUrl) downloadUrl = gh.downloadUrl;
      notes ??= gh.notes;
    }
  }

  if (!latestVersion || !downloadUrl) return null;
  if (!isNewerVersion(latestVersion, currentVersion)) return null;

  return {
    currentVersion,
    latestVersion,
    downloadUrl,
    notes,
  };
}

let updateInProgress = false;

export function isLauncherUpdateInProgress(): boolean {
  return updateInProgress;
}

/** Télécharge l’installateur GitHub et lance la mise à jour (Inno silent). */
export async function applyLauncherUpdate(
  offer: LauncherUpdateOffer
): Promise<void> {
  if (updateInProgress) return;
  updateInProgress = true;

  try {
    const dir = await cacheDir();
    const dest = await join(dir, "idols-launcher-update.exe");

    await invoke<boolean>("download_url", {
      url: offer.downloadUrl,
      destPath: dest,
    });

    await invoke("run_installer_update", { installerPath: dest });
  } finally {
    updateInProgress = false;
  }
}

export async function shouldAutoUpdate(
  remote?: RemoteLauncherConfig | null
): Promise<boolean> {
  const cfg = remote ?? (await fetchRemoteLauncherConfig());
  return cfg?.launcher?.auto_update !== false;
}
