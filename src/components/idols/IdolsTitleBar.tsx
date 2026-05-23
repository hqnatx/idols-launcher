import { useQuery } from "@tanstack/react-query";
import { appWindow } from "@tauri-apps/api/window";
import { useConfigControl } from "src/state/config";
import { queryPerson, queryStats } from "src/external/query";
import { HiMinusSm, HiX } from "react-icons/hi";

const IdolsTitleBar = () => {
  const passwordless = useConfigControl((s) => s.use_passwordless);

  const { data: launcherStats, error } = useQuery({
    queryKey: ["launcher"],
    queryFn: queryStats,
    initialData: { PlayersOnline: 0, CurrentBuild: "0.0", CurrentSeason: 0 },
    enabled: !passwordless,
    refetchInterval: 10000,
  });

  const { data: player } = useQuery({
    queryKey: ["player"],
    queryFn: queryPerson,
    enabled: !passwordless,
  });

  const displayName =
    player?.Account?.DisplayName?.trim() || "Joueur";

  return (
    <header className="idolsTitleBar" data-tauri-drag-region>
      <div className="idolsTitleBarLeft" data-tauri-drag-region>
        <span className="idolsGreeting" data-tauri-drag-region>
          Bonjour, {displayName}
        </span>
        {!passwordless && (
          <span className="idolsOnlineMeta" data-tauri-drag-region>
            {!error ? launcherStats.PlayersOnline : 0} joueurs en ligne
          </span>
        )}
      </div>
      <div className="idolsTitleBarActions">
        <button
          type="button"
          className="idolsWinBtn"
          data-tauri-drag-region
          onClick={() => appWindow.minimize()}
          aria-label="Réduire"
        >
          <HiMinusSm />
        </button>
        <button
          type="button"
          className="idolsWinBtn close"
          data-tauri-drag-region
          onClick={() => appWindow.close()}
          aria-label="Fermer"
        >
          <HiX />
        </button>
      </div>
    </header>
  );
};

export default IdolsTitleBar;
