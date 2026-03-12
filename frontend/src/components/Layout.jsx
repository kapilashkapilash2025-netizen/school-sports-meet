import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: "D" },
  { to: "/students", label: "Students", icon: "S" },
  { to: "/houses", label: "Houses", icon: "H" },
  { to: "/events", label: "Events", icon: "E" },
  { to: "/event-participants", label: "Participants", icon: "P" },
  { to: "/results", label: "Results", icon: "R" },
  { to: "/leaderboard", label: "Leaderboard", icon: "L" },
  { to: "/users", label: "Users", icon: "U" },
  { to: "/admin", label: "Admin", icon: "M" }
];

export default function Layout() {
  const { logout, admin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);

  const handleLogout = async () => {
    await logout();
    closeMobileNav();
    navigate("/login");
  };

  const runSearch = (e) => {
    e.preventDefault();
    closeMobileNav();
    navigate(`/student-profile?q=${encodeURIComponent(search)}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand brand-lockup">
          <div className="brand-logo-shell topbar-logo-shell">
            <div className="brand-logo-core">
              <img src="/assets/logo.png.jpg" alt="Vavuniya Vipulanantha College Logo" className="school-logo" />
            </div>
          </div>
          <div className="brand-text">
            <strong>Vavuniya Vipulanantha College</strong>
            <span>Sports Meet Manager</span>
          </div>
        </div>

        <form className="top-search" onSubmit={runSearch}>
          <input
            placeholder="Search Student (ID / Name)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="topbar-actions">
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            Menu
          </button>
          <div className="admin-badge" title={admin?.email || "Admin"}>A</div>
        </div>
      </header>

      <div
        className={`sidebar-overlay${mobileNavOpen ? " active" : ""}`}
        onClick={closeMobileNav}
        aria-hidden={!mobileNavOpen}
      />

      <aside className={`sidebar${mobileNavOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-mobile-head">
          <strong>Navigation</strong>
          <button type="button" className="mobile-nav-close" onClick={closeMobileNav}>Close</button>
        </div>

        <nav>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={closeMobileNav}
              className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
            >
              <span className="badge-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="btn danger" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="content" onClick={closeMobileNav}>
        <Outlet />
      </main>
    </div>
  );
}
