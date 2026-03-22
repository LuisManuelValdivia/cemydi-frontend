"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type User = {
  id?: number;
  nombre?: string;
  correo?: string;
  telefono?: string | null;
  direccion?: string | null;
  rol?: string;
  [key: string]: unknown;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (payload: { user: User }) => void;
  updateUser: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hidrata desde localStorage al montar
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sincroniza entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user") {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = ({ user }: { user: User }) => {
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user); // <- clave para refrescar header inmediatamente
  };

  const updateUser = (nextUser: User) => {
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, updateUser, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
