import { useMemo, useState, useEffect } from "react";
import api from "../api/client";

function normalizeScoringMode(mode) {
  const value = String(mode || "").toLowerCase();
  if (["rank", "position"].includes(value)) return "rank";
  if (["points", "score"].includes(value)) return "points";
  return "win_loss_draw";
}

function hasValidValue(mode, value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return false;
  }

  if (mode === "rank") {
    const n = Number(value);
    return Number.isFinite(n) && n >= 1;
  }

  if (mode === "points") {
    const n = Number(value);
    return Number.isFinite(n);
  }

  const normalized = String(value).toLowerCase();
  return ["win", "loss", "draw"].includes(normalized);
}

function houseBadgeClass(houseName) {
  const key = String(houseName || "").toLowerCase();
  if (key.includes("valuvar") || key.includes("red")) return "house-red";
  if (key.includes("navalar") || key.includes("blue")) return "house-blue";
  if (key.includes("barathi") || key.includes("yellow")) return "house-yellow";
  if (key.includes("vipulanthar") || key.includes("green")) return "house-green";
  return "house-maroon";
}

function inputLabel(mode) {
  if (mode === "rank") return "Position Entry";
  if (mode === "points") return "Score Entry";
  return "Win / Loss / Draw";
}

export default function ResultEntryForm({ events, onSubmit }) {
  const [eventId, setEventId] = useState("");
  const [participants, setParticipants] = useState([]);
  const [values, setValues] = useState({});
  const [error, setError] = useState("");

  const selectedEvent = useMemo(
    () => events.find((e) => String(e.id) === String(eventId)),
    [events, eventId]
  );

  const mode = normalizeScoringMode(selectedEvent?.scoring_type || selectedEvent?.scoring_mode);

  const isComplete =
    participants.length > 0 &&
    participants.every((p) => hasValidValue(mode, values[p.student_db_id]));

  useEffect(() => {
    if (!eventId) {
      setParticipants([]);
      setError("");
      return;
    }
    const load = async () => {
      const { data } = await api.get(`/events/${eventId}/participants`);
      setParticipants(data);
      setValues({});
      setError("");
    };
    load();
  }, [eventId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (!isComplete) {
      setError("All participating houses must have results before saving.");
      return;
    }

    const entries = participants.map((p) => {
      const base = { student_id: p.student_db_id };
      if (mode === "rank") return { ...base, position: Number(values[p.student_db_id]) };
      if (mode === "points") return { ...base, score: Number(values[p.student_db_id]) };
      return { ...base, outcome: String(values[p.student_db_id]).toLowerCase() };
    });

    try {
      await onSubmit({ event_id: Number(eventId), mode, entries });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save results");
    }
  };

  return (
    <form onSubmit={submit} className="card result-entry-premium-card">
      <div className="panel-head-row">
        <div>
          <h3>Result Entry Desk</h3>
          <p className="muted">Select an event and push official scoring to the leaderboard</p>
        </div>
        <div className="result-mode-chip">{inputLabel(mode)}</div>
      </div>

      <div className="result-entry-select-wrap">
        <label htmlFor="result-event-select">Event</label>
        <select id="result-event-select" value={eventId} onChange={(e) => setEventId(e.target.value)} required>
          <option value="">Select Event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({normalizeScoringMode(event.scoring_type || event.scoring_mode)})
            </option>
          ))}
        </select>
      </div>

      {selectedEvent ? (
        <div className="selected-event-banner">
          <strong>{selectedEvent.name}</strong>
          <span>{selectedEvent.event_type} • {normalizeScoringMode(selectedEvent.scoring_type || selectedEvent.scoring_mode)}</span>
        </div>
      ) : null}

      {participants.length > 0 ? (
        <div className="result-entry-table-wrap">
          <table className="result-entry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>House</th>
                <th>Input</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.participant_id}>
                  <td>
                    <strong>{p.student_name}</strong>
                  </td>
                  <td>{p.student_id}</td>
                  <td>
                    <span className={`house-badge ${houseBadgeClass(p.house)}`}>{p.house}</span>
                  </td>
                  <td>
                    {mode === "rank" && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Position"
                        value={values[p.student_db_id] || ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [p.student_db_id]: e.target.value }))}
                      />
                    )}
                    {mode === "points" && (
                      <input
                        type="number"
                        placeholder="Score"
                        value={values[p.student_db_id] || ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [p.student_db_id]: e.target.value }))}
                      />
                    )}
                    {mode === "win_loss_draw" && (
                      <select
                        value={values[p.student_db_id] || ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [p.student_db_id]: e.target.value }))}
                      >
                        <option value="">Select Result</option>
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                        <option value="draw">Draw</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="result-entry-empty-state">
          <strong>No participants loaded yet.</strong>
          <span>Select an event to open the result entry table.</span>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="result-entry-actions">
        <button className="btn" type="submit" disabled={!isComplete}>
          Save Results
        </button>
      </div>
    </form>
  );
}
