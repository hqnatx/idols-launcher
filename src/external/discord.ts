import { buildDiscordAuthorizeUrl } from "src/lib/discordAuth";

/** OAuth Discord direct (PKCE + deep link). Aucun appel à GET /snow/discord. */
export const discord = async (): Promise<SnowResponse<string>> => {
  try {
    const url = await buildDiscordAuthorizeUrl();
    return { ok: true, data: url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Impossible de préparer la connexion Discord.";
    return { ok: false, error: message };
  }
};
