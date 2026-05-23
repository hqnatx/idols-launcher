/** Installateur joueurs : uniquement Internet (Cloudflare), pas LAN/localhost. */
export const isPlayerDistributionBuild =
  import.meta.env.VITE_IDOLS_PLAYER_BUILD === "true" ||
  import.meta.env.VITE_IDOLS_PLAYER_BUILD === "1";

export const isLocalBackendHost = (host: string): boolean => {
  const h = host.trim().toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
};

export const isPrivateLanHost = (host: string): boolean => {
  const h = host.trim().toLowerCase();
  if (isLocalBackendHost(h)) return true;
  if (h.startsWith("192.168.") || h.startsWith("10.")) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(h);
};
