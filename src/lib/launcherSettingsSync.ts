import { loadLauncherSettings, saveLauncherSettings } from "src/external/auth";
import { useAppearance } from "src/state/appearance";
import { useConfigControl } from "src/state/config";
import { useUserControl } from "src/state/user";

const PERSIST_KEYS = ["config.control", "idols.launcher.appearance"] as const;

export async function pullLauncherSettingsFromBackend(): Promise<void> {
  const token = useUserControl.getState().access_token?.trim();
  if (!token || sessionStorage.getItem("idols.auth.discordOnly") === "1") return;

  const remote = await loadLauncherSettings(token);
  if (!remote || typeof remote !== "object") return;

  if (remote.config && typeof remote.config === "object") {
    const cfg = remote.config as Record<string, unknown>;
    const { backend_host: _h, backend_port: _p, ...safe } = cfg;
    useConfigControl.setState((s) => ({ ...s, ...safe }));
  }
  if (remote.appearance && typeof remote.appearance === "object") {
    const app = remote.appearance as Record<string, unknown>;
    useAppearance.setState((s) => ({ ...s, ...app }));
  }
}

export async function pushLauncherSettingsToBackend(): Promise<void> {
  const token = useUserControl.getState().access_token?.trim();
  if (!token || sessionStorage.getItem("idols.auth.discordOnly") === "1") return;

  const config = useConfigControl.getState();
  const appearance = useAppearance.getState();

  await saveLauncherSettings(token, {
    config: {
      bubble_builds: config.bubble_builds,
      reset_on_release: config.reset_on_release,
      disable_pre_edit: config.disable_pre_edit,
      one_session: config.one_session,
      size: config.size,
      always_on_top: config.always_on_top,
    },
    appearance: {
      darkMode: appearance.darkMode,
      particlesOpacity: appearance.particlesOpacity,
      glassBlurPercent: appearance.glassBlurPercent,
      language: appearance.language,
    },
  });
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;

export function schedulePushLauncherSettings(): void {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushLauncherSettingsToBackend();
  }, 1200);
}

export function watchLocalSettingsPersistence(): void {
  if (typeof window === "undefined") return;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if ((PERSIST_KEYS as readonly string[]).includes(key)) {
      schedulePushLauncherSettings();
    }
  };
}
