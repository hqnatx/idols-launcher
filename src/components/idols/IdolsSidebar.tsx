import { Link, useRouterState } from "@tanstack/react-router";
import { useStates } from "src/state/state";
import {
  FaHouse,
  FaServer,
  FaChartColumn,
  FaGear,
} from "react-icons/fa6";

const nav = [
  { to: "/snow/player", label: "Accueil", icon: FaHouse },
  { to: "/snow/servers", label: "Serveurs", icon: FaServer },
  { to: "/snow/stats", label: "Stats", icon: FaChartColumn },
] as const;

const IdolsSidebar = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setSettingsOpen = useStates((s) => s.set_settings_page_active);

  return (
    <aside className="idolsSidebar glassPanel">
      <div className="idolsSidebarBrand">
        <img src="/idols_logo.png" alt="idols" className="idolsSidebarLogo" />
      </div>
      <nav className="idolsSidebarNav">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`idolsNavItem${pathname.startsWith(to) ? " active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="idolsSidebarFooter">
        <button
          type="button"
          className="idolsNavItem"
          onClick={() => setSettingsOpen(true)}
        >
          <FaGear />
          <span>Paramètres</span>
        </button>
      </div>
    </aside>
  );
};

export default IdolsSidebar;
