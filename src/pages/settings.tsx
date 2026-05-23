import { useNavigate } from "@tanstack/react-router";
import { useStates } from "src/state/state";
import { useUserControl } from "src/state/user";
import { useConfigControl } from "src/state/config";
import { useLibraryControl } from "src/state/library";
import { motion } from "framer-motion";
import { importBuildFromDialog } from "src/lib/import";
import { appWindow } from "@tauri-apps/api/window";

import { FaArrowRightFromBracket, FaCircleChevronDown } from "react-icons/fa6";
import "src/styles/settings.css";
import Toggle from "src/components/toggle";
import { useEffect } from "react";

const Settings = ({ embedded = false }: { embedded?: boolean }) => {
  const userControl = useUserControl();
  const libraryControl = useLibraryControl();
  const configControl = useConfigControl();
  const stateControl = useStates();
  const navigate = useNavigate();

  const handleDelete = () => {
    userControl.kill_token();
    navigate({
      to: "/credentials",
    });
    stateControl.set_settings_page_active(false);
  };

  const handleImportBuild = async () => {
    for (const library of Object.values(libraryControl.entries)) {
      libraryControl.remove(library.binaryHash);
    }
    importBuildFromDialog();
  };

  const currentEntry = libraryControl.getCurrentEntry();

  useEffect(() => {
    appWindow.setAlwaysOnTop(configControl.always_on_top);
  }, []);

  const actions = (
      <div className="settingsActions">
        <div className="fortniteLocationContainer">
          <button className="default purple setting" onClick={handleImportBuild}>
            Dossier Fortnite
          </button>
          {currentEntry && <p>{currentEntry.path}</p>}
        </div>

        <Toggle
          title="Toujours au premier plan"
          description="Garde le launcher au-dessus des autres fenêtres."
          active={configControl.always_on_top}
          onToggle={(v) => {
            appWindow.setAlwaysOnTop(v);
            configControl.set_always_on_top(v);
          }}
        />

        {/* <Toggle
          title="Reset on Release"
          description="Use this to reset builds on release."
          active={configControl.reset_on_release}
          onToggle={(v) => configControl.set_reset_on_release(v)}
        />

        <Toggle
          title="Disable Pre-Edits"
          description="Prevent accidental pre-edits when turbo building."
          active={configControl.disable_pre_edit}
          onToggle={(v) => configControl.set_disable_pre_edit(v)}
        /> */}

        <Toggle
          title="Une seule session"
          description="Empêche de lancer plusieurs parties en même temps."
          active={configControl.one_session}
          onToggle={(v) => configControl.set_one_session(v)}
        />
      </div>
  );

  if (embedded) {
    return <div className="settings settingsEmbedded glassPanel">{actions}</div>;
  }

  return (
    <motion.div
      initial={{ top: "100%" }}
      animate={{ top: 0, opacity: 1 }}
      exit={{ top: "100%" }}
      transition={{
        type: "tween",
      }}
      className="settings"
    >
      <div data-tauri-drag-region className="fakeFrame">
        <button
          onClick={() => stateControl.set_settings_page_active(false)}
          className="fakeFrameAction"
        >
          <FaCircleChevronDown />
        </button>
        <h2 className="fakeFrameTitle" data-tauri-drag-region>
          Paramètres
        </h2>
        <s></s>
        {userControl.access_token && (
          <button onClick={handleDelete} className="fakeFrameAction sml">
            <FaArrowRightFromBracket />
          </button>
        )}
      </div>
      <s />
      {actions}
    </motion.div>
  );
};

export default Settings;
