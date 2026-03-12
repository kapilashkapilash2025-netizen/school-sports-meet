import { useState } from "react";

const initialState = {
  name: "",
  birth_year: "",
  gender: "Male",
  division: "",
  house: "VALUVAR"
};

function calculateGradeFromYear(birthYearValue) {
  const birthYear = Number(String(birthYearValue || "").trim());
  if (!Number.isFinite(birthYear) || birthYear <= 0) return "";

  const currentYear = new Date().getFullYear();
  const gradeNo = currentYear - birthYear - 5;

  if (gradeNo < 1) return "1";
  if (gradeNo > 13) return "13";
  return String(gradeNo);
}

export default function StudentForm({ onSubmit }) {
  const [form, setForm] = useState(initialState);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const calculatedGrade = calculateGradeFromYear(form.birth_year);

  const submit = async (e) => {
    e.preventDefault();

    await onSubmit({
      ...form,
      grade: calculatedGrade,
      date_of_birth: form.birth_year ? `${form.birth_year}-01-01` : ""
    });

    setForm(initialState);
  };

  return (
    <form className="grid-form" onSubmit={submit}>
      <input
        required
        placeholder="Name"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
      />

      <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
        <option>Male</option>
        <option>Female</option>
      </select>

      <input
        required
        type="number"
        min="1990"
        max="2100"
        placeholder="Birth Year (Example: 2015)"
        value={form.birth_year}
        onChange={(e) => update("birth_year", e.target.value)}
      />

      <input
        required
        placeholder="Class / Division"
        value={form.division}
        onChange={(e) => update("division", e.target.value)}
      />

      <input placeholder="Grade (Auto)" value={calculatedGrade} readOnly />

      <select value={form.house} onChange={(e) => update("house", e.target.value)}>
        <option value="VALUVAR">Valuvar House (Red)</option>
        <option value="BARATHI">Barathi House (Yellow)</option>
        <option value="VIPULANTHAR">Vipulanthar House (Green)</option>
        <option value="NAVALAR">Navalar House (Blue)</option>
      </select>

      <button className="btn" type="submit" disabled={!calculatedGrade}>
        Add Student
      </button>
    </form>
  );
}
