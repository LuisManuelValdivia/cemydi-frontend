"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/services/auth";
import { getMyProfile } from "@/services/users";

const LEGACY_AUTH_STORAGE_KEYS = [
  "accessToken",
  "authUser",
  "user",
  "lastActivity",
  "GDPR_REMOVAL_FLAG",
] as const;

type User = AuthUser & {
  telefono?: string | null;
  direccion?: string | null;
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

  useEffect(() => {
    let cancelled = false;

    const clearLegacyAuthStorage = () => {
      for (const key of LEGACY_AUTH_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
    };

    const hydrateAuth = async () => {
      clearLegacyAuthStorage();

      try {
        const result = await getMyProfile();
        if (cancelled) return;

        setUser(result.user);
      } catch {
        if (cancelled) return;

        clearLegacyAuthStorage();
        setUser(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void hydrateAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = ({ user }: { user: User }) => {
    setUser(user);
    setLoading(false);
  };

  const updateUser = (nextUser: User) => {
    setUser(nextUser);
  };

  const logout = () => {
    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    setUser(null);
    setLoading(false);
  };

  const value = useMemo(
    () => ({ user, loading, login, updateUser, logout }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
