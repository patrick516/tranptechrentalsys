/* eslint-disable react-refresh/only-export-components -- variant maps and hooks are exported alongside components on purpose */
// Authentication state provider managing login, logout, current user, and session refresh
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiRequest, setAccessToken, refreshAccessToken } from "../api/client";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "VIEWER";
  status: "ACTIVE" | "DISABLED";
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  // null = still checking. true = no users exist yet, so the portal must show
  // the one-time register screen instead of the sign-in screen.
  needsSetup: boolean | null;
  // true when the /auth/setup check failed (API unreachable, CORS, etc.).
  // The UI shows a "Try again" screen instead of silently showing Login.
  setupError: boolean;
  retrySetup: () => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [setupError, setSetupError] = useState(false);

  // Asks the API whether the very first account still has to be created.
  const loadSetup = useCallback(async () => {
    setSetupError(false);
    try {
      const res = await apiRequest<{ data: { needsSetup: boolean } }>(
        "/auth/setup",
        { retry: false },
      );
      setNeedsSetup(Boolean(res?.data?.needsSetup));
    } catch {
      // Do not guess: surface the failure so it is visible and retryable.
      setSetupError(true);
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      // Shared, de-duplicated refresh: StrictMode's double effect can no
      // longer burn the rotating refresh token twice.
      const token = await refreshAccessToken();
      if (!token) {
        setUser(null);
        return;
      }
      const meRes = await apiRequest<{ data: { user: AuthUser } }>("/auth/me");
      setUser(meRes?.data?.user || null);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
    loadSetup();
  }, [loadSession, loadSetup]);

  // If a request finds the session dead and cannot refresh it, return to the
  // sign-in screen instead of leaving a half-working dashboard.
  useEffect(() => {
    const onExpired = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

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

  // One-time first account. The API refuses once any user exists.
  const register = async (input: RegisterInput): Promise<AuthUser> => {
    const res = await apiRequest<{
      data: { accessToken: string; user: AuthUser };
    }>("/auth/register", {
      method: "POST",
      body: input,
      retry: false,
    });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setNeedsSetup(false);
    setSetupError(false);
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsSetup,
        setupError,
        retrySetup: loadSetup,
        login,
        register,
        logout,
      }}
    >
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
