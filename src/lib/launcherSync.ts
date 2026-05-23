import { discoverWorkingBackendBaseUrl } from "src/lib/backendReach";
import {
  applyRemoteBackendUrl,
  fetchRemoteLauncherConfig,
} from "src/lib/remoteConfig";
import {
  applyLauncherUpdate,
  checkForLauncherUpdate,
  isLauncherUpdateInProgress,
  shouldAutoUpdate,
} from "src/lib/launcherUpdate";

export type LauncherSyncResult = {
  backendApplied: boolean;
  backendReachable: boolean;
  updateStarted: boolean;
};

/**
 * Au démarrage (et périodiquement) : URL backend depuis GitHub + MAJ launcher.
 */
export async function runLauncherRemoteSync(): Promise<LauncherSyncResult> {
  const remote = await fetchRemoteLauncherConfig(true);
  const backendApplied = applyRemoteBackendUrl(remote);

  const backendReachable = Boolean(await discoverWorkingBackendBaseUrl());

  let updateStarted = false;
  if (!isLauncherUpdateInProgress() && (await shouldAutoUpdate(remote))) {
    const offer = await checkForLauncherUpdate(remote);
    if (offer) {
      updateStarted = true;
      void applyLauncherUpdate(offer);
    }
  }

  return { backendApplied, backendReachable, updateStarted };
}
