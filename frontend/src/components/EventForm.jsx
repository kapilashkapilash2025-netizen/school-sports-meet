import { useState } from "react";

const initialState = {
  name: "",
  event_type: "Track",
  age_category: "Under 14",
  gender_category: "Male",
  scoring_mode: "rank",
  event_date: ""
};

export default function EventForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    await onSubmit({ ...form, participant_ids: [] });
    setForm(initialState);
  };

  return (
    <form className="grid-form" onSubmit={submit}>
      <input required placeholder="Event Name (100m race)" value={form.name} onChange={(e) => update("name", e.target.value)} />
      <input required placeholder="Event Type" value={form.event_type} onChange={(e) => update("event_type", e.target.value)} />
      <select value={form.age_category} onChange={(e) => update("age_category", e.target.value)}>
        <option>Under 12</option><option>Under 14</option><option>Under 16</option><option>Under 18</option><option>Under 20</option>
      </select>
      <select value={form.gender_category} onChange={(e) => update("gender_category", e.target.value)}>
        <option>Male</option><option>Female</option><option>Mixed</option>
      </select>
      <select value={form.scoring_mode} onChange={(e) => update("scoring_mode", e.target.value)}>
        <option value="rank">Rank</option>
        <option value="points">Points</option>
        <option value="win_loss_draw">Win/Loss/Draw</option>
      </select>
      <input required type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
      <button className="btn" type="submit">Create Event</button>
    </form>
  );
}
