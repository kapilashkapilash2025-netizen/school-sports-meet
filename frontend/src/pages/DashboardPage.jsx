import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const QUICK_ACTIONS = [
  { title: "Students", description: "Register and manage competitors.", path: "/students" },
  { title: "Houses", description: "Review house colors, counts, and standings.", path: "/houses" },
  { title: "Events", description: "Create events and update manual points.", path: "/events" },
  { title: "Results", description: "Enter official results and scoring.", path: "/results" },
  { title: "Leaderboard", description: "See the current champion race.", path: "/leaderboard" },
  { title: "Admin", description: "Open the control center for key tasks.", path: "/admin" }
];

function heroMessage(row) {
  if (!row) return "Competition is ready to begin.";
  return `${row.house_name} is currently leading with ${row.total_points} points.`;
}

export default function DashboardPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [metrics, setMetrics] = useState({ total_students: 0, total_events: 0, total_participants: 0 });
  const [houses, setHouses] = useState([]);
  const [eventBreakdown, setEventBreakdown] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [lb, mt, hs, eb] = await Promise.all([
        api.get("/leaderboard"),
        api.get("/events/metrics"),
        api.get("/system/houses"),
        api.get("/leaderboard/event-breakdown")
      ]);
      setLeaderboard(lb.data || []);
      setMetrics(mt.data);
      setHouses(hs.data || []);
      setEventBreakdown(eb.data || []);
    };
    load();
  }, []);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero main-dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="hero-kicker">School Sports Meet</span>
          <h1>Vipulanantha College Sports Meet Control Dashboard</h1>
          <p>
            Welcome {admin?.fullName || "Administrator"}. This board gives you one central place to
            monitor students, events, houses, and the final championship race.
          </p>
          <div className="hero-inline-notice">{heroMessage(leaderboard[0])}</div>
          <div className="dashboard-hero-actions">
            <button className="btn" onClick={() => navigate("/results")}>Enter Results</button>
            <button className="btn secondary" onClick={() => navigate("/leaderboard")}>View Leaderboard</button>
          </div>
        </div>

        <div className="dashboard-logo-panel">
          <div className="dashboard-logo-ring">
            <div className="brand-logo-shell dashboard-hero-logo-shell">
              <div className="brand-logo-core">
                <img src="/assets/logo.png.jpg" alt="Vavuniya Vipulanantha College Logo" className="dashboard-hero-logo" />
              </div>
            </div>
          </div>
          <div className="dashboard-logo-caption">
            <strong>Vavuniya Vipulanantha College</strong>
            <span>Sports Meet Manager</span>
          </div>
        </div>
      </section>

      <section className="stats-row dashboard-stats-row">
        <article className="stat-card"><h3>Total Students</h3><p>{metrics.total_students}</p></article>
        <article className="stat-card"><h3>Events Added</h3><p>{eventBreakdown.length}</p></article>
        <article className="stat-card"><h3>Total Participants</h3><p>{metrics.total_participants}</p></article>
        <article className="stat-card"><h3>Total Houses</h3><p>{houses.length}</p></article>
      </section>

      <section className="dashboard-grid">
        <article className="card dashboard-panel">
          <div className="panel-head-row">
            <div>
              <h3>Quick Access</h3>
              <p className="muted">Go straight to the most-used sections</p>
            </div>
          </div>
          <div className="quick-action-grid">
            {QUICK_ACTIONS.map((item) => (
              <button key={item.path} className="quick-action-card" onClick={() => navigate(item.path)}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="card dashboard-panel">
          <div className="panel-head-row">
            <div>
              <h3>House Race</h3>
              <p className="muted">Live championship preview</p>
            </div>
          </div>
          <div className="dashboard-leaderboard-list">
            {leaderboard.map((row) => (
              <div key={row.id} className={`dashboard-leader-row ${row.rank === 1 ? "leader-row-top" : ""}`}>
                <span className="dashboard-rank">#{row.rank}</span>
                <div>
                  <strong>{row.house_name}</strong>
                  <p>{row.total_points} points</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card dashboard-panel">
        <div className="panel-head-row">
          <div>
            <h3>Events Added In Events Tab</h3>
            <p className="muted">Every event created inside the Events page is listed here</p>
          </div>
          <div className="result-view-chip">Total: {eventBreakdown.length}</div>
        </div>
        <div className="dashboard-events-list">
          {eventBreakdown.map((event) => (
            <article key={event.event_id} className="dashboard-event-card">
              <strong>{event.event_name}</strong>
              <span>{event.event_type}</span>
            </article>
          ))}
          {eventBreakdown.length === 0 ? (
            <p className="muted">No events added yet in the Events tab.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

