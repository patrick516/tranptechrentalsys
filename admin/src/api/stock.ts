import { apiRequest } from "./client";

export const stockApi = {
  availability: (from: string, to: string) =>
    apiRequest<{ data: { totalOwned: number; minAvailable: number } }>(
      `/stock/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
  createMovement: (body: unknown) =>
    apiRequest("/stock/movements", { method: "POST", body }),
};
