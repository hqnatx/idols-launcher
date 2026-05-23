import { ReactNode } from "react";
import { useAppearance } from "src/state/appearance";
import IdolsBackground from "./IdolsBackground";
import ParticleField from "./ParticleField";
import IdolsSidebar from "./IdolsSidebar";
import IdolsTitleBar from "./IdolsTitleBar";

const IdolsShell = ({
  children,
  showSidebar = true,
}: {
  children: ReactNode;
  showSidebar?: boolean;
}) => {
  const particles = useAppearance((s) => s.particlesOpacity);
  const glass = useAppearance((s) => s.glassBlurPercent);
  const dark = useAppearance((s) => s.darkMode);

  return (
    <div
      className={`idolsAppShell${dark ? " dark" : " light"}`}
      style={{ ["--idols-glass-blur" as string]: `${glass * 0.12}px` }}
    >
      <IdolsBackground />
      <ParticleField opacity={particles} />
      <div className="idolsShellLayout">
        {showSidebar && <IdolsSidebar />}
        <div className="idolsMainColumn">
          <IdolsTitleBar />
          <main className="idolsMainContent">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default IdolsShell;
