import { useState } from "react";
import api from "../api/client";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [detected, setDetected] = useState(null);
  const [error, setError] = useState("");

  const search = async () => {
    setError("");
    try {
      const { data } = await api.get(`/students/detect/${query}`);
      setDetected(data);
    } catch (err) {
      setDetected(null);
      setError(err.response?.data?.message || "Student not found");
    }
  };

  return (
    <div>
      <h2>Student Search & Auto Detection</h2>
      <div className="toolbar">
        <input
          placeholder="Enter Student ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" onClick={search}>Detect</button>
      </div>
      {error && <p className="error">{error}</p>}
      {detected && (
        <article className="card">
          <h3>{detected.student.name}</h3>
          <p>Gender: {detected.detectedGender}</p>
          <p>Age: {detected.age}</p>
          <p>Age Category: {detected.ageCategory}</p>
          <p>House: {detected.student.house_name}</p>
        </article>
      )}
    </div>
  );
}
