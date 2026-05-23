import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { useUserControl } from "src/state/user";
import { open } from "@tauri-apps/api/shell";
import { queryClient } from "src/app/app";
import { IDOLS } from "src/config/idols";
import { exchangeDiscordCode } from "src/lib/discordAuth";
import {
  parseDiscordCallbackUri,
  resolveLoginSession,
} from "src/lib/discordSession";
import { discord } from "src/external/discord";
import { discoverWorkingBackendBaseUrl } from "src/lib/backendReach";
import {
  applyRemoteBackendUrl,
  fetchRemoteLauncherConfig,
} from "src/lib/remoteConfig";

const parseAuthHash = (hash: string) => {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith("auth")) return null;
  const token = raw.includes(":") ? raw.split(":").slice(1).join(":") : "";
  if (!token) return null;
  return { token, onboard: raw.includes("onboard") };
};

const CredentialsPage = () => {
  const navigate = useNavigate();
  const userControl = useUserControl();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const finishLogin = useCallback(
    async (token: string, onboard: boolean) => {
      setStatus("Connexion en cours…");
      setError(null);

      try {
        const session = await resolveLoginSession(token);
        window.location.hash = "";

        if (session.discordOnly) {
          sessionStorage.removeItem("idols.auth.discordOnly");
          queryClient.setQueryData(["player"], null);
          setError(
            session.backendError ||
              "Impossible de joindre le serveur idols (Cloudflare). L’hôte doit lancer backend_idols + le tunnel Internet, puis te renvoyer un installateur à jour."
          );
          setStatus(null);
          return;
        }

        sessionStorage.setItem("idols.auth.discordOnly", "0");
        queryClient.setQueryData(["player"], session.player);
        userControl.new_token(session.token);

        setStatus(`Connecté : ${session.player.Account.DisplayName}`);

        const { pushLauncherSettingsToBackend, pullLauncherSettingsFromBackend } =
          await import("src/lib/launcherSettingsSync");
        await pullLauncherSettingsFromBackend();
        await pushLauncherSettingsToBackend();

        navigate({ to: onboard ? "/onboard" : "/snow/player" });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Impossible de finaliser la connexion."
        );
        setStatus(null);
      }
    },
    [navigate, userControl]
  );

  const processAuthCallback = useCallback(
    async (uri: string) => {
      const parsed = parseDiscordCallbackUri(uri);
      if (!parsed) return;

      if (parsed.kind === "code") {
        setError(null);
        setStatus("Finalisation avec Discord…");
        try {
          const accessToken = await exchangeDiscordCode(parsed.code);
          await finishLogin(accessToken, false);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Échec de la connexion Discord."
          );
          setStatus(null);
        }
        return;
      }

      await finishLogin(parsed.token, parsed.onboard);
    },
    [finishLogin]
  );

  const handleHash = useCallback(async () => {
    const parsed = parseAuthHash(window.location.hash);
    if (!parsed) return;
    await finishLogin(parsed.token, parsed.onboard);
  }, [finishLogin]);

  useEffect(() => {
    void handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [handleHash]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("idols-launcher-auth", (event) => {
      void processAuthCallback(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [processAuthCallback]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setStatus("Recherche du serveur idols…");

    const remote = await fetchRemoteLauncherConfig(true);
    applyRemoteBackendUrl(remote);

    const backendUrl = await discoverWorkingBackendBaseUrl();
    if (!backendUrl) {
      setLoading(false);
      setError(
        "Serveur idols injoignable. Sur le PC hôte : npm start dans backend_idols + LANCER-INTERNET-CLOUDFLARE.bat, puis rebuild l’installateur."
      );
      setStatus(null);
      return;
    }

    setStatus(null);

    const discordRes = await discord();
    setLoading(false);

    if (!discordRes.ok) {
      setError(discordRes.error || "Impossible de préparer la connexion Discord.");
      return;
    }
    if (!discordRes.data) {
      setError("URL Discord manquante.");
      return;
    }

    setStatus("Ouvre Discord dans ton navigateur…");
    await open(discordRes.data);
    setStatus("Après « Autoriser », reviens ici — ne ferme pas le launcher.");
  };

  return (
    <div className="snowPage idolsCredentials">
      <img className="idolsCredentialsLogo" src="/idols_logo.png" alt="idols" />
      <h1 className="idolsCredentialsTitle">Connexion</h1>
      <p className="idolsCredentialsHint">
        Connecte-toi avec Discord pour enregistrer ton compte sur idols.
      </p>

      {status && <p className="idolsCredentialsStatus">{status}</p>}
      {error && <p className="idolsCredentialsError">{error}</p>}

      <button
        type="button"
        className="default purple idolsConnectBtn"
        onClick={handleConnect}
        disabled={loading}
      >
        <img className="idolsDiscordIcon" src="/discord.webp" alt="" />
        {loading ? "Chargement…" : "Se connecter avec Discord"}
      </button>

      <a
        className="idolsCredentialsLink"
        href={IDOLS.discordInvite}
        target="_blank"
        rel="noreferrer"
      >
        Rejoindre le Discord idols
      </a>
    </div>
  );
};

export default CredentialsPage;
