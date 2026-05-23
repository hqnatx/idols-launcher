import { useState } from "react";
import { motion } from "framer-motion";
import { useStates } from "src/state/state";
import { useAppearance } from "src/state/appearance";
import Settings from "src/pages/settings";
import "src/styles/idols-shell.css";

type Tab = "appearance" | "game";

const IdolsSettings = () => {
  const close = useStates((s) => s.set_settings_page_active);
  const [tab, setTab] = useState<Tab>("appearance");
  const appearance = useAppearance();

  return (
    <motion.div
      className="idolsSettingsOverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => close(false)}
    >
      <motion.div
        className="idolsSettingsPanel"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="idolsSettingsSidebar glassPanel">
          <h2>Paramètres</h2>
          <button
            type="button"
            className={`idolsSettingsNavBtn${tab === "appearance" ? " active" : ""}`}
            onClick={() => setTab("appearance")}
          >
            Apparence
          </button>
          <button
            type="button"
            className={`idolsSettingsNavBtn${tab === "game" ? " active" : ""}`}
            onClick={() => setTab("game")}
          >
            Jeu & compte
          </button>
          <button
            type="button"
            className="idolsSettingsClose"
            onClick={() => close(false)}
          >
            Fermer
          </button>
        </aside>

        {tab === "appearance" ? (
          <div className="idolsSettingsBody glassPanel">
            <h3>Apparence</h3>
            <fieldset className="idolsThemeChoice">
              <legend>Thème</legend>
              <label>
                <input
                  type="radio"
                  name="idolsTheme"
                  checked={appearance.darkMode}
                  onChange={() => appearance.setDarkMode(true)}
                />
                Sombre (par défaut)
              </label>
              <label>
                <input
                  type="radio"
                  name="idolsTheme"
                  checked={!appearance.darkMode}
                  onChange={() => appearance.setDarkMode(false)}
                />
                Clair
              </label>
            </fieldset>
            <label>
              Flou de fond ({appearance.backgroundBlur.toFixed(0)})
              <input
                type="range"
                min={0}
                max={30}
                value={appearance.backgroundBlur}
                onChange={(e) =>
                  appearance.setBackgroundBlur(Number(e.target.value))
                }
              />
            </label>
            <label>
              Flou des bulles / panneaux ({appearance.glassBlurPercent}%)
              <input
                type="range"
                min={0}
                max={100}
                value={appearance.glassBlurPercent}
                onChange={(e) =>
                  appearance.setGlassBlurPercent(Number(e.target.value))
                }
              />
            </label>
            <label>
              Particules ({Math.round(appearance.particlesOpacity * 100)}%)
              <input
                type="range"
                min={0}
                max={200}
                value={appearance.particlesOpacity * 100}
                onChange={(e) =>
                  appearance.setParticlesOpacity(Number(e.target.value) / 100)
                }
              />
            </label>
            <label>
              Flou des popups
              <input
                type="checkbox"
                checked={appearance.popupBlur}
                onChange={(e) => appearance.setPopupBlur(e.target.checked)}
              />
            </label>
            <label>
              Langue
              <select
                value={appearance.language}
                onChange={(e) =>
                  appearance.setLanguage(e.target.value as "" | "en" | "fr")
                }
              >
                <option value="">Système</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="idolsSettingsGameWrap">
            <Settings embedded />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default IdolsSettings;
