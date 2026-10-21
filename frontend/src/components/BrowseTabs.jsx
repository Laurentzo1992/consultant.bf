import { NavLink } from "react-router-dom";

export default function BrowseTabs() {
  const cls = ({ isActive }) => (isActive ? "active" : "");
  return (
    <div className="tabs" role="tablist">
      <NavLink to="/consultants" className={cls} end>
        Consultants
      </NavLink>
      <NavLink to="/missions" className={cls} end>
        Missions
      </NavLink>
    </div>
  );
}
