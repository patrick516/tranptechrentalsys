import { apiRequest } from "./client";

export const filesApi = {
  list: () => apiRequest<{ data: unknown[] }>("/files"),
  create: (body: unknown) => apiRequest("/files", { method: "POST", body }),
};
