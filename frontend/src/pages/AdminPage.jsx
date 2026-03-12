import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const ADMIN_ACTIONS = [
  { title: "Manage Houses", description: "View house performance and student distribution.", path: "/houses" },
  { title: "Manage Users", description: "Check which admin users can access this system.", path: "/users" },
  { title: "Update Results", description: "Enter scores and push the live leaderboard.", path: "/results" },
  { title: "Review Events", description: "Create, update, and organize sports events.", path: "/events" }
];

export default function AdminPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ total_students: 0, total_events: 0, total_participants: 0 });
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [metricsRes, leaderboardRes] = await Promise.all([
        api.get("/events/metrics"),
        api.get("/leaderboard")
      ]);
      setMetrics(metricsRes.data);
      setLeaderboard(leaderboardRes.data || []);
    };

    load();
  }, []);

  return (
    <div>
      <div className="page-head">
        <h2>Admin</h2>
        <p className="muted">Administrative control center for the sports meet system</p>
      </div>

      <section className="dashboard-hero admin-hero">
        <div>
          <span className="hero-kicker">Admin Center</span>
          <h3>{admin?.fullName || "Sports Meet Administrator"}</h3>
          <p>
            Use this space to review the health of the meet, keep the house race updated, and move quickly
            into the sections that need attention.
          </p>
        </div>
        <div className="hero-badge-stack">
          <div className="hero-badge-card">
            <span>Active Champion</span>
            <strong>{leaderboard[0]?.house_name || "Pending"}</strong>
          </div>
          <div className="hero-badge-card">
            <span>Total Events</span>
            <strong>{metrics.total_events}</strong>
          </div>
        </div>
      </section>

      <section className="stats-row compact-stats-row">
        <article className="stat-card"><h3>Students</h3><p>{metrics.total_students}</p></article>
        <article className="stat-card"><h3>Participants</h3><p>{metrics.total_participants}</p></article>
        <article className="stat-card"><h3>Signed In As</h3><p className="stat-text-small">{admin?.email || "admin@school.local"}</p></article>
      </section>

      <section className="admin-action-grid">
        {ADMIN_ACTIONS.map((action) => (
          <article key={action.path} className="admin-action-card">
            <h3>{action.title}</h3>
            <p>{action.description}</p>
            <button className="btn" onClick={() => navigate(action.path)}>Open</button>
          </article>
        ))}
      </section>
    </div>
  );
}
