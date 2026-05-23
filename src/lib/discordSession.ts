import { buildPersonFromDiscord, fetchDiscordMe } from "src/lib/discordProfile";
import { loginWithDiscordAccessToken } from "src/external/auth";

export type LoginSessionResult = {
  token: string;
  player: PersonResponse;
  discordOnly: boolean;
  /** Dernière erreur backend (réseau ou API) si discordOnly. */
  backendError?: string;
};

/**
 * Après OAuth Discord : enregistre le compte sur le backend idols, sinon profil Discord local.
 */
export async function resolveLoginSession(
  discordAccessToken: string
): Promise<LoginSessionResult> {
  const backend = await loginWithDiscordAccessToken(discordAccessToken);
  if (backend.ok && backend.data?.token && backend.data.player) {
    return {
      token: backend.data.token,
      player: backend.data.player,
      discordOnly: false,
    };
  }

  const backendErr = backend.ok ? undefined : backend.error;

  const discordUser = await fetchDiscordMe(discordAccessToken);
  return {
    token: discordAccessToken,
    player: buildPersonFromDiscord(discordUser),
    discordOnly: true,
    backendError: backendErr,
  };
}

export type DiscordAuthCallback =
  | { kind: "code"; code: string }
  | { kind: "token"; token: string; onboard: boolean };

export function parseDiscordCallbackUri(uri: string): DiscordAuthCallback | null {
  const trimmed = uri.trim();
  if (!trimmed) return null;

  const onboardLegacy = /idols\.launcher:\/\/auth_onboard:([^/?#]+)/i.exec(trimmed);
  if (onboardLegacy?.[1]) {
    return { kind: "token", token: onboardLegacy[1], onboard: true };
  }

  const tokenLegacy = /idols\.launcher:\/\/auth:([^/?#]+)/i.exec(trimmed);
  if (tokenLegacy?.[1] && !trimmed.includes("?")) {
    return { kind: "token", token: tokenLegacy[1], onboard: false };
  }

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code");
    if (!code) return null;

    const state = url.searchParams.get("state");
    if (state && state !== "IDOLS_LAUNCHER" && state !== "idols_launcher") {
      throw new Error("Réponse Discord invalide (state). Réessaie la connexion.");
    }

    return { kind: "code", code };
  } catch (e) {
    if (e instanceof Error && e.message.includes("state")) throw e;
    return null;
  }
}
