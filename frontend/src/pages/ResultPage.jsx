import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ResultEntryForm from "../components/ResultEntryForm";

function houseBadgeClass(row) {
  const key = String(row.house_name || "").toLowerCase();
  if (key.includes("valuvar") || key.includes("red")) return "house-red";
  if (key.includes("navalar") || key.includes("blue")) return "house-blue";
  if (key.includes("barathi") || key.includes("yellow")) return "house-yellow";
  if (key.includes("vipulanthar") || key.includes("green")) return "house-green";
  return "house-maroon";
}

function houseResultRowClass(row) {
  const key = String(row.house_name || "").toLowerCase();
  if (key.includes("valuvar") || key.includes("red")) return "result-row-red";
  if (key.includes("navalar") || key.includes("blue")) return "result-row-blue";
  if (key.includes("barathi") || key.includes("yellow")) return "result-row-yellow";
  if (key.includes("vipulanthar") || key.includes("green")) return "result-row-green";
  return "result-row-maroon";
}

export default function ResultPage() {
  const [events, setEvents] = useState([]);
  const [resultRows, setResultRows] = useState([]);
  const [studentResultId, setStudentResultId] = useState("");
  const [houseResultId, setHouseResultId] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const navigate = useNavigate();

  const loadEvents = async () => {
    const { data } = await api.get("/events");
    setEvents(data);
  };

  const loadLeaderboard = async () => {
    const { data } = await api.get("/leaderboard");
    setLeaderboard(data);
  };

  useEffect(() => {
    loadEvents();
    loadLeaderboard();
    const timer = setInterval(loadLeaderboard, 3500);
    return () => clearInterval(timer);
  }, []);

  const saveResults = async (payload) => {
    const { data } = await api.post("/results", payload);
    setResultRows(data);
    await loadLeaderboard();
  };

  const loadStudentResults = async () => {
    const { data } = await api.get(`/results/student/${studentResultId}`);
    setResultRows(data);
  };

  const loadHouseResults = async () => {
    const { data } = await api.get(`/results/house/${houseResultId}`);
    setResultRows(data);
  };

  const totalPointsInView = useMemo(
    () => resultRows.reduce((sum, row) => sum + Number(row.points_awarded || 0), 0),
    [resultRows]
  );

  return (
    <div className="results-page">
      <section className="results-hero">
        <div className="results-hero-copy">
          <span className="hero-kicker">Official Results Center</span>
          <h2>Sports Meet Results Command Board</h2>
          <p>
            Enter official results, monitor the live house race, and review event-by-event scoring from one
            colorful control panel built around the school identity.
          </p>
          <div className="results-hero-actions">
            <button className="btn" onClick={() => navigate("/projector")}>Projector Mode</button>
            <button className="btn secondary" onClick={() => navigate("/leaderboard")}>Open Leaderboard</button>
          </div>
        </div>

        <div className="results-hero-brand">
          <div className="results-mini-logo-wrap">
            <img src="/assets/logo.png.jpg" alt="School Logo" className="results-mini-logo" />
          </div>
          <div className="results-brand-copy">
            <strong>Vavuniya Vipulanantha College</strong>
            <span>Official Sports Meet Result Desk</span>
          </div>
        </div>
      </section>

      <section className="results-summary-grid">
        <article className="result-summary-card school-tone">
          <span>Live Champion</span>
          <strong>{leaderboard[0]?.house_name || "Pending"}</strong>
          <p>{leaderboard[0]?.total_points || 0} points on the board</p>
        </article>
        <article className="result-summary-card house-green-tone">
          <span>Total Events</span>
          <strong>{events.length}</strong>
          <p>Configured events ready for scoring</p>
        </article>
        <article className="result-summary-card house-yellow-tone">
          <span>Visible Result Rows</span>
          <strong>{resultRows.length}</strong>
          <p>Entries loaded in the result viewer</p>
        </article>
        <article className="result-summary-card house-red-tone">
          <span>Points In View</span>
          <strong>{totalPointsInView}</strong>
          <p>Combined awarded points in this panel</p>
        </article>
      </section>

      <section className="results-main-grid">
        <ResultEntryForm events={events} onSubmit={saveResults} />

        <aside className="results-side-panel">
          <section className="results-side-card leaderboard-glow-card">
            <div className="panel-head-row">
              <div>
                <h3>Live House Leaderboard</h3>
                <p className="muted">Auto-refreshing championship race</p>
              </div>
            </div>
            <div className="results-leader-stack">
              {leaderboard.map((row) => (
                <article key={row.id} className={`results-leader-card ${houseBadgeClass(row)} ${row.rank === 1 ? "champion-card" : ""}`}>
                  <div>
                    <span className="results-rank-chip">#{row.rank}</span>
                    <strong>{row.house_name}</strong>
                  </div>
                  <p>{row.total_points} pts</p>
                </article>
              ))}
            </div>
          </section>

          <section className="results-side-card quick-filter-card">
            <div className="panel-head-row">
              <div>
                <h3>Result Finder</h3>
                <p className="muted">Search student or house records quickly</p>
              </div>
            </div>
            <div className="result-query-grid">
              <div className="result-query-box result-query-student">
                <label htmlFor="student-result-id">Student DB ID</label>
                <input
                  id="student-result-id"
                  placeholder="Enter student DB ID"
                  value={studentResultId}
                  onChange={(e) => setStudentResultId(e.target.value)}
                />
                <button className="btn" onClick={loadStudentResults}>View Student Results</button>
              </div>
              <div className="result-query-box result-query-house">
                <label htmlFor="house-result-id">House ID</label>
                <input
                  id="house-result-id"
                  placeholder="Enter house ID"
                  value={houseResultId}
                  onChange={(e) => setHouseResultId(e.target.value)}
                />
                <button className="btn secondary" onClick={loadHouseResults}>View House Results</button>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="card result-view-card">
        <div className="panel-head-row">
          <div>
            <h3>Result View</h3>
            <p className="muted">Official scoring history with house color highlights</p>
          </div>
          <div className="result-view-chip">Rows: {resultRows.length}</div>
        </div>

        <table className="result-table-premium">
          <thead>
            <tr>
              <th>Event</th>
              <th>Student</th>
              <th>House</th>
              <th>Score</th>
              <th>Position</th>
              <th>Outcome</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {resultRows.map((row) => (
              <tr key={row.id} className={houseResultRowClass(row)}>
                <td>{row.event_name}</td>
                <td>{row.student_name}</td>
                <td>
                  <span className={`house-badge ${houseBadgeClass(row)}`}>{row.house_name}</span>
                </td>
                <td>{row.score_value ?? "-"}</td>
                <td>{row.position || "-"}</td>
                <td>{row.outcome || "-"}</td>
                <td><strong>{row.points_awarded}</strong></td>
              </tr>
            ))}
            {resultRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">No result data loaded yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
