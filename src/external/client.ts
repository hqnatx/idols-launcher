import axios from "axios";
import { IDOLS } from "src/config/idols";
import { resolveAxiosBaseUrl } from "src/lib/backendUrl";
import { discord } from "./discord";
import { code, okay, player, playersInfo } from "./person";
import {
  content_pages,
  get_item,
  items,
  leaderboards,
  servers,
  shop,
  sizes,
  stats,
  version,
} from "./launcher";
export const isDevBuildMode = import.meta.env.MODE === "development";

/** Toutes les requêtes API passent par le backend idols (URL mémorisée ou host/port). */
export const axiosClient = () => {
  return axios.create({
    baseURL: resolveAxiosBaseUrl(IDOLS.defaultBackendBaseUrl),
  });
};

/** Chemins API (compat backend idols / snow). Pas d’appel au cloud Retrac. */
export const endpoints = {
  GET_DISCORD_ENDPOINT: "/snow/discord",
  GET_PLAYER_ENDPOINT: "/snow/player",
  GET_PLAYER_OKAY_ENDPOINT: "/snow/player/okay",
  POST_PLAYER_CODE_ENDPOINT: "/snow/player/code",
  GET_LAUNCHER_STATS: "/snow/launcher",
  GET_BUCKET_ASSET_SIZES: "/snow/launcher/sizes",
  GET_SERVERS: "/snow/servers",
  GET_LEADERBOARD: "/snow/player/leaderboards",
  GET_ACCOUNTS: "/account/api/public/account",
  GET_SHOP: "/admin/shop/today",
  GET_COSMETICS: "/snow/cosmetics",
  CONTENT_PAGES: "/content/api/pages/fortnite-game",
};

const client = {
  discord,
  player,
  okay,
  code,
  stats,
  sizes,
  version,
  servers,
  playersInfo,
  leaderboards,
  shop,
  catalog_items: items,
  get_item,
  content_pages,
};

export { IDOLS };
export default client;
