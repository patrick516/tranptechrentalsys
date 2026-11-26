import { apiRequest } from "./client";

export const paymentsApi = {
  list: () => apiRequest<{ data: unknown[] }>("/payments"),
  create: (body: unknown) => apiRequest("/payments", { method: "POST", body }),
  adjust: (body: unknown) =>
    apiRequest("/ledger/adjustments", { method: "POST", body }),
};
