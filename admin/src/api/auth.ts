import { apiRequest } from "./client";
import type { AuthUser } from "../context/AuthContext";

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ data: { accessToken: string; user: AuthUser } }>(
      "/auth/login",
      {
        method: "POST",
        body: { email, password },
        retry: false,
      },
    ),
  logout: () => apiRequest("/auth/logout", { method: "POST", retry: false }),
  me: () => apiRequest<{ data: { user: AuthUser } }>("/auth/me"),
};
