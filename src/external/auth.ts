import { axiosClient } from "./client";
import { postBackendJson } from "src/lib/backendReach";
import { setWorkingBackendBaseUrl } from "src/lib/backendUrl";

export type BackendDiscordLogin = {
  token: string;
  player: PersonResponse;
  accountId: string;
  displayName: string;
};

export const loginWithDiscordAccessToken = async (
  accessToken: string
): Promise<SnowResponse<BackendDiscordLogin>> => {
  const result = await postBackendJson<BackendDiscordLogin>(
    "/snow/auth/discord",
    { access_token: accessToken }
  );
  if (result.ok) {
    setWorkingBackendBaseUrl(result.baseUrl);
    return { ok: true, data: result.data };
  }
  return { ok: false, error: result.error };
};

export const saveLauncherSettings = async (
  token: string,
  settings: Record<string, unknown>
): Promise<boolean> => {
  try {
    await axiosClient().put("/snow/player/settings", settings, {
      headers: { Authorization: token },
      timeout: 8000,
    });
    return true;
  } catch {
    return false;
  }
};

export const loadLauncherSettings = async (
  token: string
): Promise<Record<string, unknown> | null> => {
  try {
    const response = await axiosClient().get<Record<string, unknown>>(
      "/snow/player/settings",
      {
        headers: { Authorization: token },
        timeout: 8000,
      }
    );
    return response.data;
  } catch {
    return null;
  }
};
