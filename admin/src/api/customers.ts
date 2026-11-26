import { apiRequest } from "./client";
import type { Customer } from "../types";

export const customersApi = {
  list: (q = "") =>
    apiRequest<{ data: Customer[] }>(
      `/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
  create: (body: unknown) =>
    apiRequest<{ data: Customer }>("/customers", { method: "POST", body }),
};
