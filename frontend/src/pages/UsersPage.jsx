import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function UsersPage() {
  const { admin } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("/system/admins");
      setUsers(data || []);
    };

    load();
  }, []);

  return (
    <div>
      <div className="page-head">
        <h2>Users</h2>
        <p className="muted">System access users for the sports meet manager</p>
      </div>

      <section className="dashboard-hero users-hero">
        <div>
          <span className="hero-kicker">Access Control</span>
          <h3>Admin users and login access</h3>
          <p>
            This area shows who can enter the system and manage sports meet data. It is useful for
            school-level control and accountability.
          </p>
        </div>
        <div className="hero-badge-stack">
          <div className="hero-badge-card">
            <span>Total Users</span>
            <strong>{users.length}</strong>
          </div>
          <div className="hero-badge-card">
            <span>Current Session</span>
            <strong>{admin?.fullName || admin?.email || "Admin"}</strong>
          </div>
        </div>
      </section>

      <section className="stats-row compact-stats-row">
        <article className="stat-card"><h3>Logged In User</h3><p>{admin?.fullName || "Admin"}</p></article>
        <article className="stat-card"><h3>Email</h3><p className="stat-text-small">{admin?.email || "-"}</p></article>
        <article className="stat-card"><h3>Access Type</h3><p>Administrator</p></article>
      </section>

      <section className="card">
        <h3>Registered Admin Users</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>{admin?.id === user.id ? "Active Now" : "Available"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
