import { apiRequest } from "./client";

export const settingsApi = {
  get: () => apiRequest<{ data: Record<string, unknown> }>("/settings"),
  update: (body: unknown) => apiRequest("/settings", { method: "PUT", body }),
};
