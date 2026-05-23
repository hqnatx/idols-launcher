import {
  IDOLS,
  IDOLS_DISCORD_APPLICATION_ID,
  IDOLS_DISCORD_REDIRECT_URI,
} from "src/config/idols";

const PKCE_STORAGE_KEY = "idols.discord.pkce.verifier";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";

/** Ancienne app Retrac — ignorée. */
const RETRAC_DISCORD_CLIENT_ID = "1212184991732080700";
const RETRAC_MARKERS = [
  "retrac.site",
  "retrac.0xkaede.xyz",
  "0xkaede",
  RETRAC_DISCORD_CLIENT_ID,
];

export function isRetracDiscordOAuthUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return RETRAC_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

export function resolveDiscordClientId(): string {
  const fromEnv = IDOLS.discordOAuth.clientId.trim();
  return fromEnv || IDOLS_DISCORD_APPLICATION_ID;
}

export function resolveDiscordRedirectUri(): string {
  const fromEnv = IDOLS.discordOAuth.redirectUri.trim();
  return fromEnv || IDOLS_DISCORD_REDIRECT_URI;
}

const pkceCharset =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

function randomPkceVerifier(length = 64): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => pkceCharset[b % pkceCharset.length]).join("");
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkceChallengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(digest);
}

export function storePkceVerifier(verifier: string): void {
  sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);
}

export function takePkceVerifier(): string | null {
  const verifier = sessionStorage.getItem(PKCE_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
  return verifier;
}

/** URL OAuth2 + PKCE (public client, sans secret, sans backend). */
export async function buildDiscordAuthorizeUrl(): Promise<string> {
  const verifier = randomPkceVerifier();
  storePkceVerifier(verifier);
  const challenge = await pkceChallengeFromVerifier(verifier);

  const params = new URLSearchParams({
    client_id: resolveDiscordClientId(),
    redirect_uri: resolveDiscordRedirectUri(),
    response_type: "code",
    scope: IDOLS.discordOAuth.scope,
    state: IDOLS.discordOAuth.state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

/** Échange le code reçu via deep link contre un access_token Discord. */
export async function exchangeDiscordCode(code: string): Promise<string> {
  const verifier = takePkceVerifier();
  if (!verifier) {
    throw new Error(
      "Session OAuth expirée. Ferme le launcher, relance et reconnecte-toi."
    );
  }

  const body = new URLSearchParams({
    client_id: resolveDiscordClientId(),
    grant_type: "authorization_code",
    code,
    redirect_uri: resolveDiscordRedirectUri(),
    code_verifier: verifier,
  });

  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as DiscordTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Discord token exchange failed (${response.status})`
    );
  }

  if (!payload.access_token) {
    throw new Error("Discord n’a pas renvoyé de jeton d’accès.");
  }

  return payload.access_token;
}

