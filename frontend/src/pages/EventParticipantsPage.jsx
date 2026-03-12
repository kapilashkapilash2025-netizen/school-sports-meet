import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function EventParticipantsPage() {
  const [params] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [students, setStudents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("/events");
      setEvents(data);
      const initialEvent = params.get("eventId");
      if (initialEvent) setSelectedEvent(initialEvent);
    };
    load();
  }, [params]);

  useEffect(() => {
    if (!selectedEvent) {
      setParticipants([]);
      return;
    }
    const load = async () => {
      const { data } = await api.get(`/events/${selectedEvent}/participants`);
      setParticipants(data);
    };
    load();
  }, [selectedEvent]);

  useEffect(() => {
    if (!search.trim()) {
      setStudents([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await api.get("/students", { params: { search } });
      setStudents(data);
    }, 220);

    return () => clearTimeout(timer);
  }, [search]);

  const addParticipant = async (studentDbId) => {
    if (!selectedEvent) {
      setError("Select an event first");
      return;
    }

    setError("");
    try {
      await api.post(`/events/${selectedEvent}/participants`, { student_id: studentDbId });
      const { data } = await api.get(`/events/${selectedEvent}/participants`);
      setParticipants(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add participant");
    }
  };

  const removeParticipant = async (participantId) => {
    await api.delete(`/events/${selectedEvent}/participants/${participantId}`);
    const { data } = await api.get(`/events/${selectedEvent}/participants`);
    setParticipants(data);
  };

  return (
    <div>
      <div className="page-head"><h2>Participant Management</h2></div>
      <div className="toolbar">
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          <option value="">Select Event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
        <input
          placeholder="Search student by ID or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Student Search</h3>
        <table>
          <thead>
            <tr><th>Student ID</th><th>Name</th><th>Grade</th><th>House</th><th>Action</th></tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.student_id}</td>
                <td>{student.name}</td>
                <td>{student.grade}</td>
                <td>{student.house_name}</td>
                <td>
                  <button className="btn" onClick={() => addParticipant(student.id)}>Add Participant</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Event Participant List</h3>
        <table>
          <thead>
            <tr>
              <th>Participant ID</th><th>Student ID</th><th>Student Name</th><th>House</th>
              <th>Grade</th><th>Division</th><th>Event Name</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.participant_id}>
                <td>{p.participant_id}</td>
                <td>{p.student_id}</td>
                <td>{p.student_name}</td>
                <td>{p.house}</td>
                <td>{p.grade}</td>
                <td>{p.division}</td>
                <td>{p.event_name}</td>
                <td className="action-cell">
                  <button className="btn" onClick={() => navigate(`/student-profile?studentId=${p.student_db_id}`)}>View</button>
                  <button className="btn danger" onClick={() => removeParticipant(p.participant_id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
