import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import StudentForm from "../components/StudentForm";

export default function StudentPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const navigate = useNavigate();

  const load = async (q = "") => {
    const { data } = await api.get("/students", { params: { search: q } });
    setStudents(data);
  };

  useEffect(() => {
    load();
  }, []);

  const addStudent = async (payload) => {
    setAddError("");
    setAddSuccess("");

    try {
      await api.post("/students", payload);
      await load(search);
      setAddSuccess("Student added successfully. Student ID auto-generated.");
    } catch (error) {
      setAddError(error.response?.data?.message || "Student add failed. Please fill all fields.");
      throw error;
    }
  };

  const deleteStudent = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this student?");
    if (!confirmed) return;

    await api.delete(`/students/${id}`);
    await load(search);
  };

  const houseCodeFromName = (name) => {
    const map = {
      "Valuvar House": "VALUVAR",
      "Barathi House": "BARATHI",
      "Vipulanthar House": "VIPULANTHAR",
      "Navalar House": "NAVALAR"
    };
    return map[name] || "VALUVAR";
  };

  const editStudent = async (student) => {
    const name = window.prompt("Student name", student.name);
    if (!name) return;

    await api.put(`/students/${student.id}`, {
      name,
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      student_number: student.student_number,
      birth_certificate_number: student.birth_certificate_number,
      nic_number: student.nic_number,
      grade: student.grade,
      division: student.division,
      house: houseCodeFromName(student.house_name)
    });

    await load(search);
  };

  return (
    <div>
      <div className="page-head">
        <h2>Student Management</h2>
      </div>

      <section className="card">
        <h3>Add Student (Student ID is auto generated)</h3>
        <StudentForm onSubmit={addStudent} />
        {addError && <p className="error">{addError}</p>}
        {addSuccess && <p className="success-text">{addSuccess}</p>}
      </section>

      <div className="toolbar">
        <input
          placeholder="Search student by ID or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn" onClick={() => load(search)}>Search Student</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Student ID</th><th>Name</th><th>Gender</th><th>Grade</th><th>Division</th><th>House</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.student_id}</td><td>{s.name}</td><td>{s.gender}</td><td>{s.grade}</td><td>{s.division}</td><td>{s.house_name}</td>
              <td className="action-cell">
                <button className="btn" onClick={() => navigate(`/student-profile?studentId=${s.id}`)}>View</button>
                <button className="btn secondary" onClick={() => editStudent(s)}>Edit</button>
                <button className="btn danger" onClick={() => deleteStudent(s.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
