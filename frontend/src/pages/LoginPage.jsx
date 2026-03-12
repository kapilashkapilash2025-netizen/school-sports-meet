import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@school.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-wrap login-v3-wrap">
      <div className="login-theme-bar">
        <button type="button" className="theme-toggle login-theme-toggle" onClick={toggleTheme}>
          <span className="theme-toggle-label">{theme === "light" ? "Switch to dark" : "Switch to light"}</span>
          <strong>{theme === "light" ? "Dark Theme" : "Light Theme"}</strong>
        </button>
      </div>

      <form onSubmit={submit} className="login-card login-v3-card">
        <div className="login-brand login-v3-brand brand-presentation">
          <div className="brand-logo-shell login-logo-shell">
            <div className="brand-logo-core">
              <img src="/assets/logo.png.jpg" alt="Vavuniya Vipulanantha College Logo" className="school-logo login-v3-logo" />
            </div>
          </div>
          <h2>Vavuniya Vipulanantha College</h2>
          <p>Sports Meet Manager</p>
        </div>

        <h3>Admin Login</h3>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        {error && <p className="error">{error}</p>}
        <button className="btn login-v3-btn" type="submit">Sign In</button>
        <p className="login-designer-credit">Software Designer - S.Kapilash</p>
      </form>
    </div>
  );
}
