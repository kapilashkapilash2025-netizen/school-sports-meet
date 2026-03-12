import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function normalizeHouseName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+house/g, "")
    .replace(/[^a-z]/g, "");
}

function getHouseTheme(name) {
  const key = normalizeHouseName(name);
  if (key.includes("valuvar") || key.includes("valluvar")) {
    return { accent: "#d34b4b", label: "Red" };
  }
  if (key.includes("navalar")) {
    return { accent: "#3478c8", label: "Blue" };
  }
  if (key.includes("barathi") || key.includes("bharathi")) {
    return { accent: "#e0b128", label: "Yellow" };
  }
  if (key.includes("vipulanthar")) {
    return { accent: "#2f9e44", label: "Green" };
  }
  return { accent: "#8b2e2e", label: "Maroon" };
}

export default function HousesPage() {
  const [houses, setHouses] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [housesRes, leaderboardRes] = await Promise.all([
        api.get("/system/houses"),
        api.get("/leaderboard")
      ]);
      setHouses(housesRes.data || []);
      setLeaderboard(leaderboardRes.data || []);
    };

    load();
  }, []);

  const rows = useMemo(() => {
    return houses.map((house) => {
      const boardRow = leaderboard.find(
        (row) => normalizeHouseName(row.house_name) === normalizeHouseName(house.name)
      );
      const theme = getHouseTheme(house.name);

      return {
        ...house,
        rank: boardRow?.rank || "-",
        total_points: boardRow?.total_points || 0,
        accent: theme.accent,
        colorLabel: theme.label
      };
    });
  }, [houses, leaderboard]);

  return (
    <div>
      <div className="page-head">
        <h2>Houses</h2>
        <p className="muted">House-wise strength, colors, and live points overview</p>
      </div>

      <section className="dashboard-hero houses-hero">
        <div>
          <span className="hero-kicker">House Overview</span>
          <h3>Every house in one place</h3>
          <p>
            Student strength, house colors, ranking, and total points are grouped here so the admin can
            quickly understand the current competition balance.
          </p>
        </div>
        <div className="hero-badge-stack">
          <div className="hero-badge-card">
            <span>Total Houses</span>
            <strong>{rows.length}</strong>
          </div>
          <div className="hero-badge-card">
            <span>Leading House</span>
            <strong>{leaderboard[0]?.house_name || "Pending"}</strong>
          </div>
        </div>
      </section>

      <section className="house-grid">
        {rows.map((house) => (
          <article key={house.id} className="house-overview-card" style={{ borderTopColor: house.accent }}>
            <div className="house-overview-head">
              <div>
                <h3>{house.name}</h3>
                <p>{house.code}</p>
              </div>
              <span className="house-color-chip" style={{ background: house.accent }}>
                {house.colorLabel}
              </span>
            </div>
            <div className="house-overview-metrics">
              <div>
                <span>Students</span>
                <strong>{house.student_count}</strong>
              </div>
              <div>
                <span>Rank</span>
                <strong>{house.rank}</strong>
              </div>
              <div>
                <span>Points</span>
                <strong>{house.total_points}</strong>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
