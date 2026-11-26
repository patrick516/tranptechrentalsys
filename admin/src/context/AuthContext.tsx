// Authentication state provider managing login, logout, current user, and session refresh
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiRequest, setAccessToken } from "../api/client";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "VIEWER";
  status: "ACTIVE" | "DISABLED";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const apiBase =
        (import.meta.env.VITE_API_URL as string | undefined) ||
        "http://localhost:5000/api/v1";
      const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!refreshRes.ok) {
        setAccessToken(null);
        setUser(null);
        setLoading(false);
        return;
      }
      const refreshJson = await refreshRes.json();
      setAccessToken(refreshJson?.data?.accessToken || null);
      const meRes = await apiRequest<{ data: { user: AuthUser } }>("/auth/me");
      setUser(meRes?.data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await apiRequest<{
      data: { accessToken: string; user: AuthUser };
    }>("/auth/login", {
      method: "POST",
      body: { email, password },
      retry: false,
    });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiRequest("/auth/logout", { method: "POST", retry: false });
    } catch {
      // Ignore logout network error
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
