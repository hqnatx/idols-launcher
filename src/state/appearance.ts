import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppearanceState = {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  backgroundBlur: number;
  setBackgroundBlur: (v: number) => void;
  glassBlurPercent: number;
  setGlassBlurPercent: (v: number) => void;
  particlesOpacity: number;
  setParticlesOpacity: (v: number) => void;
  popupBlur: boolean;
  setPopupBlur: (v: boolean) => void;
  language: "" | "en" | "fr";
  setLanguage: (v: "" | "en" | "fr") => void;
};

export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      darkMode: true,
      setDarkMode: (darkMode) => set({ darkMode }),
      backgroundBlur: 15,
      setBackgroundBlur: (backgroundBlur) => set({ backgroundBlur }),
      glassBlurPercent: 40,
      setGlassBlurPercent: (glassBlurPercent) => set({ glassBlurPercent }),
      particlesOpacity: 1,
      setParticlesOpacity: (particlesOpacity) => set({ particlesOpacity }),
      popupBlur: true,
      setPopupBlur: (popupBlur) => set({ popupBlur }),
      language: "",
      setLanguage: (language) => set({ language }),
    }),
    { name: "idols.launcher.appearance", storage: createJSONStorage(() => localStorage) }
  )
);
