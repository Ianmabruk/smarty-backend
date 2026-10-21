import React, { useEffect, useState } from "react";
import { getToken, deleteToken } from "../services/api";
import { usersAPI } from "../services/api";

export const AuthContext = React.createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const token = await getToken();

        if (!token) {
          if (isMounted) setLoading(false);
          return;
        }

        const res = await usersAPI.me();
        if (isMounted) {
          setUser(res?.data?.data || null);
        }
      } catch {
        if (isMounted) {
          await deleteToken();
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (userData) => setUser(userData);
  const updateUser = (userData) => setUser((current) => ({ ...current, ...userData }));
  const logout = async () => {
    await deleteToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}