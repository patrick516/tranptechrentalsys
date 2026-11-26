import { apiRequest } from "./client";

export const messagesApi = {
  list: () => apiRequest<{ data: unknown[] }>("/messages"),
  send: (body: unknown) => apiRequest("/messages", { method: "POST", body }),
};
