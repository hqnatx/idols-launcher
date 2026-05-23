import { useEffect, useState } from "react";
import { useConfigControl } from "src/state/config";
import { useLibraryControl } from "src/state/library";
import { useUserControl } from "src/state/user";
import { useEvents } from "src/state/events";
import { useQuery } from "@tanstack/react-query";
import { queryLauncherVersion } from "src/external/query";
import { experienceSnow, experienceSnowDev } from "src/lib/tauri";
import { hasPakInstalled } from "src/lib/import";
import { motion } from "framer-motion";
import client from "src/external/client";
import { resolveGameBackendTarget } from "src/lib/backendUrl";
import { IDOLS } from "src/config/idols";

import { FaLock } from "react-icons/fa6";

const PlaySnow = () => {
  const [currentFortniteProcess, set] = useState<number>(0);
  const [add, remove] = useEvents((s) => [s.subscribe, s.unsubscribe]);
  const [oneSession, username, passwordless, eor, dpe] = useConfigControl((s) => [
    s.one_session,
    s.raw_credentials,
    s.use_passwordless,
    s.reset_on_release,
    s.disable_pre_edit,
  ]);
  const gameBackend = resolveGameBackendTarget(IDOLS.defaultBackendBaseUrl);
  const [getCurrentEntry, setPak] = useLibraryControl((s) => [
    s.getCurrentEntry,
    s.setPakValid,
  ]);

  const { data: launcher } = useQuery<LauncherVersion>({
    queryKey: ["version"],
    queryFn: queryLauncherVersion,
  });

  // remove . and turn int oa 3 digit number
  const launcherNum = parseInt(
    launcher?.current_version.replace(/\./g, "") || "0"
  );

  const fortniteEntry = getCurrentEntry();
  const isFortniteRunning = currentFortniteProcess > 0;
  const disableButton =
    (isFortniteRunning && oneSession) ||
    !fortniteEntry ||
    (!username && passwordless) ||
    launcherNum > 109;

  const token = useUserControl((s) => s.access_token);

  useEffect(() => {
    add("fortnite_process_id", set);
    return () => remove("fortnite_process_id", set);
  }, []);

  const handleClick = async () => {
    if (oneSession && currentFortniteProcess) {
      return;
    }

    passwordless ? startLocal() : startPublic();
  };

  const startLocal = async () => {
    const entry = getCurrentEntry();
    entry &&
      experienceSnowDev(
        entry.path,
        username,
        gameBackend.host,
        gameBackend.port
      );
  };

  const startPublic = async () => {
    const hasPak = hasPakInstalled(true);
    if (!hasPak) return setPak(hasPak);

    const entry = getCurrentEntry();
    const codeResponse = await client.code(token);
    entry &&
      codeResponse.ok &&
      experienceSnow(
        entry.path,
        codeResponse.data,
        true,
        eor,
        dpe,
        entry.releaseVersion,
        gameBackend.host,
        gameBackend.port
      );
  };

  const chooseLabel = (): string => {
    if (!fortniteEntry) return "Invalid Installation";
    if (isFortniteRunning && oneSession) return "Fortnite is running";
    if (!username && passwordless) return "Invalid Credentials";
    if (!launcher) return "Checking Version";
    if (launcherNum > 109) return "Update idols launcher";
    if (passwordless) return "Backend idols";
    return "Launch";
  };

  return (
    <button
      className="default purple"
      onClick={handleClick}
      disabled={disableButton}
    >
      {oneSession && (
        <motion.div
          variants={{
            visible: { opacity: 1 },
            hidden: { opacity: 0 },
          }}
          initial="hidden"
          animate={isFortniteRunning || disableButton ? "visible" : "hidden"}
          className="leftIcon hide"
        >
          <FaLock />
        </motion.div>
      )}
      {chooseLabel()}
    </button>
  );
};

export default PlaySnow;
