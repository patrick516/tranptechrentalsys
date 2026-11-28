import { apiRequest } from "./client";
import type { Customer, CustomerStatus } from "../types";
import type { CustomerDetail } from "../types/customer";

export const customersApi = {
  list: (q = "") =>
    apiRequest<{ data: Customer[] }>(
      `/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
  create: (body: unknown) =>
    apiRequest<{ data: Customer }>("/customers", { method: "POST", body }),
  get: (id: string) => apiRequest<{ data: CustomerDetail }>(`/customers/${id}`),
  setStatus: (id: string, status: CustomerStatus) =>
    apiRequest(`/customers/${id}/status`, { method: "POST", body: { status } }),
};
