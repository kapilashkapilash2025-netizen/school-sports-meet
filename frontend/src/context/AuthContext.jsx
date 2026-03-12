import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { getStoredToken, setAuthToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setAdmin(data.admin);
      } catch {
        setAuthToken(null);
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
        setAuthToken(data.token);
        setAdmin(data.admin);
      },
      async logout() {
        try {
          await api.post("/auth/logout");
        } finally {
          setAuthToken(null);
          setAdmin(null);
        }
      }
    }),
    [admin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
