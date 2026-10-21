import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import { PlusIcon } from "./icons";

/** Account menu entries depend on the member's role. */
function accountLinks(user) {
  if (user.role === "consultant") {
    return [
      { to: "/me/profile", label: "Mon profil & missions conseillees" },
      { to: "/requests/sent", label: "Mes candidatures" },
      { to: "/requests/received", label: "Propositions recues" },
    ];
  }
  return [
    { to: "/consultants", label: "Rechercher un consultant" },
    { to: "/requests/sent", label: "Consultants contactes" },
    { to: "/me/missions", label: "Mes missions (optionnel)" },
    { to: "/requests/received", label: "Candidatures recues" },
  ];
}

function primaryAction(user) {
  if (!user) return { to: "/register", label: "Inscription" };
  return user.role === "consultant"
    ? { to: "/me/profile", label: "Mon profil" }
    : { to: "/missions/new", label: "Publier une mission" };
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [accountOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const topLinkClass = ({ isActive }) => (isActive ? "active" : "");
  const menuItemClass = ({ isActive }) => `menu-item ${isActive ? "active" : ""}`;
  const cta = primaryAction(user);
  const links = user ? accountLinks(user) : [];

  return (
    <nav className="navbar">
      <div className="navbar-row">
        <Link to="/" className="brand">
          <Logo size={30} />
          <span>Consultant.bf</span>
        </Link>

        <button
          className="hamburger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="nav-links desktop-only">
          <NavLink to="/consultants" className={topLinkClass}>
            Trouver un consultant
          </NavLink>
          <NavLink to="/missions" className={topLinkClass} end>
            Missions
          </NavLink>
          {user ? (
            <>
              <Link to={cta.to} className="btn btn-sm btn-cta">
                <PlusIcon />
                {cta.label}
              </Link>
              <div className="account-menu" ref={accountRef}>
                <button className="account-trigger" onClick={() => setAccountOpen((v) => !v)}>
                  <span className="avatar">{user.full_name.charAt(0).toUpperCase()}</span>
                  {user.role === "entreprise" && user.company_name ? user.company_name : user.full_name.split(" ")[0]}
                  <span className={`chevron ${accountOpen ? "up" : ""}`}>⌄</span>
                </button>
                {accountOpen && (
                  <div className="account-dropdown fade-in">
                    {links.map((l) => (
                      <NavLink key={l.to} to={l.to} className={menuItemClass}>
                        {l.label}
                      </NavLink>
                    ))}
                    <hr />
                    <button className="menu-item menu-item-danger" onClick={handleLogout}>
                      Deconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={topLinkClass}>
                Connexion
              </NavLink>
              <Link to={cta.to} className="btn btn-sm btn-cta">
                <PlusIcon />
                {cta.label}
              </Link>
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="nav-panel fade-in">
          <NavLink to="/consultants" className={menuItemClass}>
            Trouver un consultant
          </NavLink>
          <NavLink to="/missions" className={menuItemClass} end>
            Missions
          </NavLink>
          <Link to={cta.to} className="btn btn-cta">
            <PlusIcon />
            {cta.label}
          </Link>
          {user ? (
            <>
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={menuItemClass}>
                  {l.label}
                </NavLink>
              ))}
              <hr />
              <button className="menu-item menu-item-danger" onClick={handleLogout}>
                Deconnexion ({user.full_name})
              </button>
            </>
          ) : (
            <NavLink to="/login" className={menuItemClass}>
              Connexion
            </NavLink>
          )}
        </div>
      )}
    </nav>
  );
}
