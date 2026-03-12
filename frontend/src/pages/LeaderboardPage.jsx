import { useEffect, useState } from "react";
import api from "../api/client";

function houseClass(name) {
  const key = String(name || "").toLowerCase();
  if (key.includes("valuvar") || key.includes("valluvar")) return "house-red";
  if (key.includes("navalar")) return "house-blue";
  if (key.includes("barathi") || key.includes("bharathi")) return "house-yellow";
  if (key.includes("vipulanthar")) return "house-green";
  return "house-maroon";
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/leaderboard");
    setRows(data);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  const loadOfficialSheet = async () => {
    setLoading(true);
    setStatus("");

    try {
      const { data } = await api.post("/leaderboard/load-official-sheet");
      setRows(data.leaderboard || []);
      setStatus("Official sheet points updated.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to load official sheet points.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-head page-head-row">
        <h2>House Leaderboard</h2>
        <button className="btn" onClick={loadOfficialSheet} disabled={loading}>
          {loading ? "Updating..." : "Load Official Sheet Points"}
        </button>
      </div>

      {status ? <p className="muted">{status}</p> : null}

      <div className="leaderboard-cards">
        {rows.map((row) => (
          <article key={row.id} className={`lb-card ${row.rank === 1 ? "champion" : ""}`}>
            <p>{row.rank} Place</p>
            <h3>{row.house_name}</h3>
            <span className={`house-badge ${houseClass(row.house_name)}`}>{row.house_name}</span>
            <strong>{row.total_points} Points</strong>
          </article>
        ))}
      </div>
    </div>
  );
}
