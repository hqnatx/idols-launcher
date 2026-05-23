import { useEffect } from "react";
import { useLibraryControl } from "src/state/library";
import { useAppearance } from "src/state/appearance";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { hasPakInstalled } from "src/lib/import";

import IdolsSettings from "src/pages/idols-settings";
import IdolsShell from "src/components/idols/IdolsShell";
import { useStates } from "src/state/state";

import "src/styles/idols-shell.css";

const Frame = () => {
  const libraryControl = useLibraryControl();
  const darkMode = useAppearance((s) => s.darkMode);
  const [settingsOpen] = useStates((s) => [s.settings_page_active]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAuthScreen =
    pathname.startsWith("/credentials") || pathname.startsWith("/onboard");

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    root.classList.toggle("idolsDark", darkMode);
    root.classList.toggle("idolsLight", !darkMode);
  }, [darkMode]);

  useEffect(() => {
    (async () => {
      libraryControl.setPakValid(await hasPakInstalled(false));
    })();
  }, [libraryControl.entries]);

  const main = <Outlet />;

  return (
    <>
      <AnimatePresence>{settingsOpen && <IdolsSettings />}</AnimatePresence>
      {isAuthScreen ? (
        <div className="idolsAuthWrap">{main}</div>
      ) : (
        <IdolsShell showSidebar={!isAuthScreen}>{main}</IdolsShell>
      )}
    </>
  );
};

export default Frame;
