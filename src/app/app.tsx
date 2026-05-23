import { useEffect } from "react";
import TauriListener from "src/components/listener";
import { useConfigControl } from "src/state/config";
import { discoverWorkingBackendBaseUrl } from "src/lib/backendReach";
import {
  applyRemoteBackendUrl,
  fetchRemoteLauncherConfig,
} from "src/lib/remoteConfig";
import { runLauncherRemoteSync } from "src/lib/launcherSync";
import {
  pullLauncherSettingsFromBackend,
  watchLocalSettingsPersistence,
} from "src/lib/launcherSettingsSync";

import { RouterProvider } from "@tanstack/react-router";
import router from "src/app/router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
export const queryClient = new QueryClient();

import "src/styles/app.css";
import "src/styles/defaults.css";
import "src/styles/idols-shell.css";
const App = () => {
  const preventDefault = (e: Event) => e.preventDefault();

  useEffect(() => {
    useConfigControl.getState().set_use_passwordless(false);
    watchLocalSettingsPersistence();

    void (async () => {
      await runLauncherRemoteSync();
      void pullLauncherSettingsFromBackend();
    })();

    const refreshBackend = window.setInterval(() => {
      void (async () => {
        const remote = await fetchRemoteLauncherConfig(true);
        if (applyRemoteBackendUrl(remote)) {
          await discoverWorkingBackendBaseUrl();
        }
      })();
    }, 3 * 60 * 1000);

    return () => window.clearInterval(refreshBackend);
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      root.classList.add("theme1");
      root.classList.remove("theme2", "theme3", "theme4", "theme5", "party");
    }

    window.addEventListener("contextmenu", preventDefault);
    window.addEventListener("beforeprint", preventDefault);
    return () => {
      window.removeEventListener("contextmenu", preventDefault);
      window.removeEventListener("beforeprint", preventDefault);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TauriListener />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

export default App;
