import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function StudentProfilePage() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const initialStudentId = params.get("studentId");
    const initialQuery = params.get("q");

    if (initialQuery) {
      setSearch(initialQuery);
    }

    if (!initialStudentId) return;

    const load = async () => {
      const { data } = await api.get(`/students/profile/${initialStudentId}`);
      setProfile(data);
    };
    load();
  }, [params]);

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

  const loadProfile = async (studentDbId) => {
    const { data } = await api.get(`/students/profile/${studentDbId}`);
    setProfile(data);
  };

  return (
    <div>
      <div className="page-head"><h2>Student Profile</h2></div>
      <div className="toolbar">
        <input
          placeholder="Search by Student ID or Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <h3>Search Results</h3>
        <table>
          <thead>
            <tr><th>Student ID</th><th>Name</th><th>Grade</th><th>House</th><th>Action</th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.student_id}</td>
                <td>{s.name}</td>
                <td>{s.grade}</td>
                <td>{s.house_name}</td>
                <td><button className="btn" onClick={() => loadProfile(s.id)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {profile && (
        <>
          <div className="card profile-card">
            <h3>{profile.student.name}</h3>
            <p><strong>Student ID:</strong> {profile.student.student_id}</p>
            <p><strong>Gender:</strong> {profile.student.gender}</p>
            <p><strong>Grade:</strong> {profile.student.grade}</p>
            <p><strong>Division:</strong> {profile.student.division}</p>
            <p><strong>House:</strong> {profile.student.house_name}</p>
            <p><strong>Birth Date:</strong> {String(profile.student.date_of_birth).slice(0, 10)}</p>
          </div>

          <div className="card">
            <h3>Joined Events List</h3>
            <table>
              <thead>
                <tr><th>Event Name</th><th>Result</th><th>Position</th><th>Points</th></tr>
              </thead>
              <tbody>
                {profile.joinedEvents.map((event) => (
                  <tr key={`${event.event_id}-${event.date_added}`}>
                    <td>{event.event_name}</td>
                    <td>{event.result ?? event.outcome ?? "-"}</td>
                    <td>{event.position ?? "-"}</td>
                    <td>{event.points ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
