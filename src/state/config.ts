import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { IDOLS, isLocalBackendHost, isPrivateLanHost } from "src/config/idols";

type point = {
  x: number;
  y: number;
};

type ConfigState = {
  bubble_builds: boolean;
  set_bubble_builds: (bubble_builds: boolean) => void;

  reset_on_release: boolean;
  set_reset_on_release: (edit_on_release: boolean) => void;

  disable_pre_edit: boolean;
  set_disable_pre_edit: (disable_pre_edit: boolean) => void;

  one_session: boolean;
  set_one_session: (one_session: boolean) => void;

  use_passwordless: boolean;
  set_use_passwordless: (dev: boolean) => void;

  raw_credentials: string;
  set_raw_credentials: (username: string) => void;

  use_localhost: boolean;
  set_use_localhost: (dev: boolean) => void;

  backend_host: string;
  set_backend_host: (host: string) => void;

  backend_port: number;
  set_backend_port: (port: number) => void;

  /** URL complète du backend idols qui a répondu (prioritaire pour les requêtes API). */
  backend_base_url: string;
  set_backend_base_url: (url: string) => void;

  size: point;
  set_size: (size: point) => void;

  always_on_top: boolean;
  set_always_on_top: (always_on_top: boolean) => void;
};

export const useConfigControl = create<ConfigState>()(
  persist(
    (set) => ({
      bubble_builds: false,
      set_bubble_builds: (bubble_builds: boolean) => set({ bubble_builds }),
      reset_on_release: false,
      set_reset_on_release: (edit_on_release: boolean) =>
        set({ reset_on_release: edit_on_release }),
      disable_pre_edit: false,
      set_disable_pre_edit: (disable_pre_edit: boolean) =>
        set({ disable_pre_edit }),
      one_session: true,
      set_one_session: (one_session: boolean) => set({ one_session }),
      use_passwordless: false,
      set_use_passwordless: (dev: boolean) => set({ use_passwordless: dev }),
      raw_credentials: "",
      set_raw_credentials: (raw_credentials: string) =>
        set({ raw_credentials }),
      use_localhost: false,
      set_use_localhost: (dev: boolean) => set({ use_localhost: dev }),
      backend_host: IDOLS.defaultBackendHost,
      set_backend_host: (backend_host: string) => set({ backend_host }),
      backend_port: IDOLS.defaultBackendPort,
      set_backend_port: (backend_port: number) => set({ backend_port }),
      backend_base_url: IDOLS.defaultBackendBaseUrl,
      set_backend_base_url: (backend_base_url: string) =>
        set({ backend_base_url }),
      size: { x: 720, y: 530 },
      set_size: (size: point) => set({ size }),
      always_on_top: false,
      set_always_on_top: (always_on_top: boolean) => set({ always_on_top }),
    }),
    {
      name: "config.control",
      version: 5,
      migrate: (persisted) => {
        const state = persisted as Partial<ConfigState> | undefined;
        if (!state || typeof state !== "object") return persisted;
        const host =
          state.backend_host &&
          (isPrivateLanHost(state.backend_host) ||
            !isLocalBackendHost(state.backend_host))
            ? state.backend_host
            : IDOLS.defaultBackendHost;
        const baseUrl =
          state.backend_base_url?.trim() || IDOLS.defaultBackendBaseUrl;
        return {
          ...state,
          use_passwordless: false,
          use_localhost: false,
          backend_host: host,
          backend_port: IDOLS.defaultBackendPort,
          backend_base_url: baseUrl,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.use_passwordless) state.set_use_passwordless(false);
        const host = state.backend_host?.trim() || "";
        if (
          !host ||
          host === "idols-backend" ||
          (!isPrivateLanHost(host) && isLocalBackendHost(host))
        ) {
          state.set_backend_host(IDOLS.defaultBackendHost);
          state.set_backend_port(IDOLS.defaultBackendPort);
          state.set_backend_base_url(IDOLS.defaultBackendBaseUrl);
        }
      },
      storage: createJSONStorage(() => localStorage),
    }
  )
);
