import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { clearAllAuth, getToken, getUser, saveAuth } from "../lib/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    // refresh profile (optional; keeps user fresh after reload)
    api.get("/api/users/profile")
      .then(({ data }) => setUser(data))
      .catch(() => {}) // ignore
      .finally(() => setReady(true));
  }, []);

  const login = ({ token, user: u }) => {
    saveAuth({ token, user: u });
    setUser(u);
  };

  const logout = () => {
    clearAllAuth();
    // Also remove axios default Authorization just in case
    if (api.defaults.headers.common.Authorization) {
      delete api.defaults.headers.common.Authorization;
    }
    setUser(null);
  };

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
