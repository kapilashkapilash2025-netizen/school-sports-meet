import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/auth/me");
        setAdmin(data.admin);
      } catch {
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      async login(email, password) {
        const { data } = await api.post("/auth/login", { email, password });
        setAdmin(data.admin);
      },
      async logout() {
        await api.post("/auth/logout");
        setAdmin(null);
      }
    }),
    [admin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
