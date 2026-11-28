import { apiRequest } from "./client";
import type { InteractionChannel, InteractionItem } from "../types/customer";

export interface NewInteraction {
  customerId: string;
  channel: InteractionChannel;
  summary: string;
  followUpDate?: string; // left out when empty
}

export const interactionsApi = {
  list: (customerId: string) =>
    apiRequest<{ data: InteractionItem[] }>(
      `/interactions?customerId=${encodeURIComponent(customerId)}`,
    ),
  create: (body: NewInteraction) => apiRequest("/interactions", { method: "POST", body }),
};
