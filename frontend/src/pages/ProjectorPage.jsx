import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const SCHOOL_NAME = "Vavuniya Vipulanantha College";
const TITLE = "ANNUAL SPORTS MEET - LIVE RESULTS";
const HOUSE_ORDER = ["Vipulanthar", "Valluvar", "Navalar", "Bharathi"];
const SECTION_ORDER = ["GROUP GAMES", "TRACK / RACE"];
const CHART_GROUPS = [
  { key: "PRIMARY", label: "Secondary Events" },
  { key: "SECONDARY", label: "Primary Events" }
];

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+house/g, "")
    .replace(/[^a-z]/g, "");
}

function ordinalLabel(position) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return `${position}th`;
}

function houseToneClass(houseName) {
  const key = normalizeKey(houseName);
  if (key.includes("vipulanthar")) return "projector-tone-green";
  if (key.includes("valluvar") || key.includes("valuvar")) return "projector-tone-red";
  if (key.includes("navalar")) return "projector-tone-blue";
  if (key.includes("bharathi") || key.includes("barathi")) return "projector-tone-gold";
  return "projector-tone-maroon";
}

function findPointsForHouse(houses, houseLabel) {
  const target = normalizeKey(houseLabel);
  const row = (houses || []).find((item) => {
    const key = normalizeKey(item.house_name);
    return (
      key.includes(target) ||
      target.includes(key) ||
      (target.includes("valluvar") && key.includes("valuvar")) ||
      (target.includes("valuvar") && key.includes("valluvar")) ||
      (target.includes("bharathi") && key.includes("barathi")) ||
      (target.includes("barathi") && key.includes("bharathi"))
    );
  });

  return row ? row.points : "-";
}

function buildProjectorCharts(rows) {
  const chartMap = new Map(
    CHART_GROUPS.map((group) => [
      group.key,
      {
        label: group.label,
        sections: new Map(SECTION_ORDER.map((section) => [section, []]))
      }
    ])
  );

  for (const row of rows) {
    const chartGroup = row.chart_group || "PRIMARY";
    const section = row.category === "TRACK / RACE" ? "TRACK / RACE" : "GROUP GAMES";

    if (!chartMap.has(chartGroup)) {
      chartMap.set(chartGroup, {
        label: chartGroup,
        sections: new Map(SECTION_ORDER.map((sectionName) => [sectionName, []]))
      });
    }

    chartMap.get(chartGroup).sections.get(section).push(row);
  }

  return CHART_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    sections: Array.from((chartMap.get(group.key)?.sections || new Map()).entries()).filter(([, items]) => items.length > 0)
  })).filter((group) => group.sections.length > 0);
}

export default function ProjectorPage() {
  const [rows, setRows] = useState([]);
  const [eventBreakdown, setEventBreakdown] = useState([]);
  const [currentEvent, setCurrentEvent] = useState("Waiting for latest event result...");
  const [countdown, setCountdown] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => Number(b.total_points) - Number(a.total_points)),
    [rows]
  );

  const projectorCharts = useMemo(() => buildProjectorCharts(eventBreakdown), [eventBreakdown]);
  const champion = sortedRows[0] || null;
  const podiumRows = sortedRows.slice(0, 3);

  const loadLeaderboard = async () => {
    const { data } = await api.get("/leaderboard");
    setRows(data);
  };

  const loadEventBreakdown = async () => {
    const { data } = await api.get("/leaderboard/event-breakdown");
    setEventBreakdown(Array.isArray(data) ? data : []);
  };

  const loadCurrentEvent = async () => {
    const { data } = await api.get("/results/summary");
    if (!Array.isArray(data) || data.length === 0) {
      setCurrentEvent("Waiting for latest event result...");
      return;
    }

    const latestWithResults = data.find((row) => Number(row.total_results) > 0);
    setCurrentEvent(latestWithResults?.event_name || data[0]?.event_name || "Waiting for latest event result...");
  };

  const loadAll = async () => {
    await Promise.all([loadLeaderboard(), loadCurrentEvent(), loadEventBreakdown()]);
  };

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 2000);
    return () => clearInterval(timer);
  }, []);

  const startFinalReveal = () => {
    if (countdown !== null) return;

    setRevealed(false);
    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((value) => {
        if (value === null) return null;
        if (value <= 1) {
          clearInterval(timer);
          setRevealed(true);
          return null;
        }
        return value - 1;
      });
    }, 1000);
  };

  const enterFullscreen = async () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
    }
  };

  return (
    <div className={`projector-page ${revealed ? "revealed" : ""}`}>
      <div className="projector-backdrop-orb projector-backdrop-one" />
      <div className="projector-backdrop-orb projector-backdrop-two" />

      <header className="projector-header">
        <div className="projector-brandline">
          <div className="projector-logo-badge">
            <img src="/assets/logo.png.jpg" alt={`${SCHOOL_NAME} logo`} className="projector-logo" />
          </div>
          <div>
            <h1>{SCHOOL_NAME}</h1>
            <h2>{TITLE}</h2>
          </div>
        </div>
        <p className="current-event">
          Current Event: <strong>{currentEvent}</strong>
        </p>
      </header>

      <div className="projector-toolbar">
        <button className="btn" onClick={enterFullscreen}>Enter Full Screen</button>
        <button className="btn" onClick={startFinalReveal}>Final Result Reveal</button>
      </div>

      <section className="projector-hero-stage">
        <div className={`projector-champion-panel ${champion ? houseToneClass(champion.house_name) : ""}`}>
          <span className="projector-stage-label">Champion Spotlight</span>
          <h3>{champion?.house_name || "Waiting for Results"}</h3>
          <p>{champion ? `${champion.total_points} points in the final leaderboard` : "No leaderboard data yet"}</p>
        </div>

        <div className="projector-podium">
          {podiumRows.map((row, index) => (
            <article
              key={row.id}
              className={`projector-podium-card ${houseToneClass(row.house_name)} ${index === 0 ? "top" : ""}`}
              style={{ animationDelay: `${index * 0.18}s` }}
            >
              <span className="projector-podium-rank">{ordinalLabel(index + 1)}</span>
              <strong>{row.house_name}</strong>
              <p>{row.total_points} pts</p>
            </article>
          ))}
        </div>
      </section>

      <section className="projector-board-shell">
        <div className="projector-section-title">
          <span>Final Standings</span>
          <strong>House Ranking Board</strong>
        </div>

        <section className="projector-board">
          {sortedRows.map((row, index) => {
            const rank = index + 1;
            const isChampion = rank === 1;

            return (
              <article
                key={row.id}
                className={`projector-row ${houseToneClass(row.house_name)} ${isChampion ? "champion" : ""}`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="projector-rank">{ordinalLabel(rank)}</div>
                <div className="projector-house">{row.house_name}</div>
                <div className="projector-points">{row.total_points} pts</div>
              </article>
            );
          })}
        </section>
      </section>

      <section className="projector-events">
        {projectorCharts.map((chart) => (
          <div key={chart.key} className="projector-chart-shell">
            <div className="projector-chart-group-title">{chart.label}</div>
            {chart.sections.map(([category, events]) => (
              <div key={`${chart.key}-${category}`} className="projector-events-card">
                <h3>{category}</h3>
                <table className="projector-events-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      {HOUSE_ORDER.map((house) => (
                        <th key={house}>{house}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((eventRow) => (
                      <tr key={`${chart.key}-${category}-${eventRow.event_id}`}>
                        <td>{eventRow.event_name}</td>
                        {HOUSE_ORDER.map((house) => (
                          <td key={`${eventRow.event_id}-${house}`}>{findPointsForHouse(eventRow.houses || [], house)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </section>

      {countdown !== null && (
        <div className="projector-countdown-overlay">
          <div className="projector-countdown-number">{countdown}</div>
        </div>
      )}
    </div>
  );
}
