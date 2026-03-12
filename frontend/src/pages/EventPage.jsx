import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const HOUSE_COLUMNS = ["Vipulanthar", "Valluvar", "Navalar", "Bharathi"];
const SECTION_ORDER = ["GROUP GAMES", "TRACK / RACE"];
const AUDIENCE_TABS = [
  { key: "all", label: "All" },
  { key: "boys", label: "Boys" },
  { key: "girls", label: "Girls" },
  { key: "other", label: "Other" }
];
const CHART_GROUPS = [
  { key: "PRIMARY", label: "Secondary Events", description: "This is the existing chart with the events you already entered." },
  { key: "SECONDARY", label: "Primary Events", description: "Use this new chart for a separate primary section." }
];

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+house/g, "")
    .replace(/[^a-z]/g, "");
}

function matchHouse(rowName, wantedHouse) {
  const key = normalizeKey(rowName);
  const wanted = normalizeKey(wantedHouse);

  return (
    key.includes(wanted) ||
    wanted.includes(key) ||
    (wanted.includes("valluvar") && key.includes("valuvar")) ||
    (wanted.includes("valuvar") && key.includes("valluvar")) ||
    (wanted.includes("bharathi") && key.includes("barathi")) ||
    (wanted.includes("barathi") && key.includes("bharathi"))
  );
}

function createSectionMap() {
  return new Map(SECTION_ORDER.map((section) => [section, []]));
}

function groupByChartAndSection(rows) {
  const chartMap = new Map(CHART_GROUPS.map((group) => [group.key, createSectionMap()]));

  for (const row of rows) {
    const chartGroup = row.chart_group || "PRIMARY";
    const category = row.category === "TRACK / RACE" ? "TRACK / RACE" : "GROUP GAMES";

    if (!chartMap.has(chartGroup)) {
      chartMap.set(chartGroup, createSectionMap());
    }

    chartMap.get(chartGroup).get(category).push(row);
  }

  return chartMap;
}

function getAudienceBucket(eventName) {
  const key = String(eventName || "").toLowerCase();
  if (key.includes("boys")) return "boys";
  if (key.includes("girls")) return "girls";
  return "other";
}

function matchesAudienceFilter(row, activeAudience) {
  if (activeAudience === "all") return true;
  return getAudienceBucket(row.event_name) === activeAudience;
}

function toSavePayload(rows) {
  return rows.map((row) => ({
    event_id: row.event_id,
    houses: (row.houses || []).map((house) => ({
      house_id: house.house_id,
      points: house.points === "" ? 0 : Number(house.points || 0)
    }))
  }));
}

export default function EventPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirtyRows, setDirtyRows] = useState(false);
  const [activeAudience, setActiveAudience] = useState("all");
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [eventForms, setEventForms] = useState({
    PRIMARY: { event_name: "", event_type: "Group Game" },
    SECONDARY: { event_name: "", event_type: "Group Game" }
  });

  const loadBreakdown = async () => {
    const { data } = await api.get("/leaderboard/event-breakdown");
    setRows(Array.isArray(data) ? data : []);
    setDirtyRows(false);
  };

  useEffect(() => {
    loadBreakdown();
  }, []);

  useEffect(() => {
    setSelectedEventIds((prev) => prev.filter((eventId) => rows.some((row) => row.event_id === eventId)));
  }, [rows]);

  useEffect(() => {
    if (!dirtyRows || loading || deleting || saving) return undefined;

    const timer = setTimeout(async () => {
      setAutosaving(true);
      setStatus("Auto-saving event points...");

      try {
        await api.post("/leaderboard/event-breakdown/save", { events: toSavePayload(rows) });
        await loadBreakdown();
        setStatus("Event points auto-updated. Final result and projector chart will refresh automatically.");
      } catch (error) {
        setStatus(error.response?.data?.message || "Auto-save failed.");
      } finally {
        setAutosaving(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [rows, dirtyRows, loading, deleting, saving]);

  const loadOfficialPoints = async () => {
    setLoading(true);
    setStatus("");

    try {
      await api.post("/leaderboard/load-official-sheet");
      await loadBreakdown();
      setStatus("Official event points loaded into the existing secondary chart. Road Race is excluded from these charts.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to load event points.");
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (eventId, houseLabel, value) => {
    const sanitized = value.replace(/[^0-9]/g, "");

    setRows((prev) =>
      prev.map((row) => {
        if (row.event_id !== eventId) return row;

        return {
          ...row,
          houses: row.houses.map((house) =>
            matchHouse(house.house_name, houseLabel)
              ? { ...house, points: sanitized === "" ? "" : Number(sanitized) }
              : house
          )
        };
      })
    );

    setDirtyRows(true);
    setStatus("Changes detected. Auto-save will run shortly.");
  };

  const getDisplayPoints = (houses, wantedHouse) => {
    const row = (houses || []).find((house) => matchHouse(house.house_name, wantedHouse));
    return row ? row.points : 0;
  };

  const saveAll = async () => {
    setSaving(true);
    setStatus("");

    try {
      await api.post("/leaderboard/event-breakdown/save", { events: toSavePayload(rows) });
      await loadBreakdown();
      setStatus("All chart results saved. Final result updated.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const updateEventForm = (chartGroup, key, value) => {
    setEventForms((prev) => ({
      ...prev,
      [chartGroup]: {
        ...prev[chartGroup],
        [key]: value
      }
    }));
  };

  const addEventToChart = async (chartGroup, e) => {
    e.preventDefault();
    setStatus("");

    try {
      const { data } = await api.post("/leaderboard/event-breakdown/add-event", {
        ...eventForms[chartGroup],
        chart_group: chartGroup
      });
      setRows(Array.isArray(data) ? data : []);
      setEventForms((prev) => ({
        ...prev,
        [chartGroup]: { event_name: "", event_type: "Group Game" }
      }));
      setDirtyRows(false);
      setStatus(`${chartGroup === "PRIMARY" ? "Secondary" : "Primary"} event added. Both charts will contribute to the final result.`);
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to add event.");
    }
  };

  const toggleEventSelection = (eventId) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((value) => value !== eventId) : [...prev, eventId]
    );
  };

  const toggleVisibleSelection = (visibleRows, shouldSelect) => {
    const visibleIds = visibleRows.map((row) => row.event_id);

    setSelectedEventIds((prev) => {
      if (shouldSelect) {
        return [...new Set([...prev, ...visibleIds])];
      }

      return prev.filter((eventId) => !visibleIds.includes(eventId));
    });
  };

  const deleteSelected = async () => {
    if (selectedEventIds.length === 0) {
      setStatus("Select at least one event to delete.");
      return;
    }

    const confirmed = window.confirm("Delete the selected events?");
    if (!confirmed) return;

    setDeleting(true);
    setStatus("");

    try {
      const { data } = await api.delete("/leaderboard/event-breakdown", {
        data: { event_ids: selectedEventIds }
      });
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSelectedEventIds([]);
      setDirtyRows(false);
      setStatus("Selected events deleted.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to delete selected events.");
    } finally {
      setDeleting(false);
    }
  };

  const chartedSections = useMemo(() => groupByChartAndSection(rows), [rows]);

  const tabCounts = useMemo(() => {
    return AUDIENCE_TABS.reduce((acc, tab) => {
      acc[tab.key] = rows.filter((row) => matchesAudienceFilter(row, tab.key)).length;
      return acc;
    }, {});
  }, [rows]);

  return (
    <div>
      <div className="page-head page-head-row">
        <h2>Event Results</h2>
        <div className="action-cell">
          <button className="btn secondary" onClick={loadOfficialPoints} disabled={loading || saving || deleting || autosaving}>
            {loading ? "Loading..." : "Load Official Event Points"}
          </button>
          <button className="btn danger" onClick={deleteSelected} disabled={deleting || loading || saving || autosaving}>
            {deleting ? "Deleting..." : `Delete Selected (${selectedEventIds.length})`}
          </button>
          <button className="btn" onClick={saveAll} disabled={saving || loading || deleting || autosaving}>
            {saving ? "Saving..." : autosaving ? "Auto-saving..." : "Save Now"}
          </button>
        </div>
      </div>

      {status ? <p className="muted">{status}</p> : null}

      <section className="card chart-add-shell">
        <div className="panel-head-row">
          <div>
            <h3>Chart Event Setup</h3>
            <p className="muted">The existing event table is now your Secondary table. Road Race will not appear in these charts.</p>
          </div>
        </div>

        <div className="chart-add-grid">
          {CHART_GROUPS.map((group) => (
            <article key={group.key} className="chart-add-card">
              <div className="chart-group-head compact-head">
                <div>
                  <h4>{group.label}</h4>
                  <p className="muted">{group.description}</p>
                </div>
              </div>
              <form className="toolbar" onSubmit={(e) => addEventToChart(group.key, e)}>
                <input
                  required
                  placeholder="Event name"
                  value={eventForms[group.key].event_name}
                  onChange={(e) => updateEventForm(group.key, "event_name", e.target.value)}
                />
                <select
                  value={eventForms[group.key].event_type}
                  onChange={(e) => updateEventForm(group.key, "event_type", e.target.value)}
                >
                  <option>Group Game</option>
                  <option>Track</option>
                </select>
                <button className="btn" type="submit">Add To {group.label}</button>
              </form>
            </article>
          ))}
        </div>

        <div className="event-filter-tabs" role="tablist" aria-label="Event audience filters">
          {AUDIENCE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab ${activeAudience === tab.key ? "active" : ""}`}
              onClick={() => setActiveAudience(tab.key)}
            >
              {tab.label} ({tabCounts[tab.key] || 0})
            </button>
          ))}
        </div>
      </section>

      {CHART_GROUPS.map((group) => {
        const sectionMap = chartedSections.get(group.key) || createSectionMap();
        const totalItems = Array.from(sectionMap.values()).reduce((sum, items) => sum + items.length, 0);

        return (
          <section key={group.key} className="chart-group-shell card">
            <div className="chart-group-head">
              <div>
                <h3>{group.label}</h3>
                <p className="muted">Every point in this chart will also count toward the final house result.</p>
              </div>
              <span className="chart-group-badge">{totalItems} Events</span>
            </div>

            {SECTION_ORDER.map((section) => {
              const visibleRows = (sectionMap.get(section) || []).filter((row) => matchesAudienceFilter(row, activeAudience));
              const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedEventIds.includes(row.event_id));

              return (
                <section key={`${group.key}-${section}`} className="chart-section-card">
                  <div className="section-head">
                    <h3>{section}</h3>
                    {visibleRows.length > 0 ? (
                      <label className="select-all-toggle">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) => toggleVisibleSelection(visibleRows, e.target.checked)}
                        />
                        Select visible
                      </label>
                    ) : null}
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th className="select-column">Select</th>
                        <th>Event</th>
                        {HOUSE_COLUMNS.map((house) => (
                          <th key={`${group.key}-${section}-${house}`}>{house}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr key={`${group.key}-${section}-${row.event_id}`} className={selectedEventIds.includes(row.event_id) ? "table-row-selected" : ""}>
                          <td className="select-column">
                            <input
                              type="checkbox"
                              checked={selectedEventIds.includes(row.event_id)}
                              onChange={() => toggleEventSelection(row.event_id)}
                              aria-label={`Select ${row.event_name}`}
                            />
                          </td>
                          <td>
                            <div className="event-name-cell">
                              <strong>{row.event_name}</strong>
                              <span className="event-pill">{getAudienceBucket(row.event_name)}</span>
                            </div>
                          </td>
                          {HOUSE_COLUMNS.map((house) => (
                            <td key={`${row.event_id}-${house}`}>
                              <input
                                type="number"
                                min="0"
                                value={getDisplayPoints(row.houses, house)}
                                onChange={(e) => updateCell(row.event_id, house, e.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                      {visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="muted">No {activeAudience} events available in this section.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
