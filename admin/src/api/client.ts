const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:5000/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const data = await res.json();
      const nextToken: string | null = data?.data?.accessToken || null;
      setAccessToken(nextToken);
      return nextToken;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface ApiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  retry?: boolean;
}

export async function apiRequest<T = unknown>(
  path: string,
  { method = "GET", body, retry = true }: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && !path.startsWith("/auth/login")) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return apiRequest<T>(path, { method, body, retry: false });
    }
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ApiError = new Error(
      payload?.error?.message || "Request failed",
    );
    err.code = payload?.error?.code || "API_ERROR";
    err.status = res.status;
    err.details = payload?.error?.details;
    throw err;
  }

  return payload as T;
}
