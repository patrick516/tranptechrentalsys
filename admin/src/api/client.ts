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

// Downloads a protected endpoint (CSV export) as a file. The response is
// streamed straight from the API so the numbers are never re-computed client side.
export async function apiDownload(
  path: string,
  fallbackName: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err: ApiError = new Error(
      payload?.error?.message || "Export failed",
    );
    err.code = payload?.error?.code || "API_ERROR";
    err.status = res.status;
    throw err;
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const name = match?.[1] || fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Fetches a protected endpoint and returns the raw bytes (used by the in-app
// file viewer, which shows the file without saving it to the computer).
export async function apiBlob(path: string): Promise<{ blob: Blob; fileName: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: "include",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err: ApiError = new Error(payload?.error?.message || "Could not open the file");
    err.code = payload?.error?.code || "API_ERROR";
    err.status = res.status;
    throw err;
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const blob = await res.blob();
  return { blob, fileName: match?.[1] || "file" };
}

// Uploads a file to the backend (multipart/form-data).
export async function apiUpload(
  path: string,
  formData: FormData,
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ApiError = new Error(payload?.error?.message || "Upload failed");
    err.code = payload?.error?.code || "API_ERROR";
    err.status = res.status;
    throw err;
  }
  return payload;
}
