import { apiRequest } from "./client";
import type { Booking } from "../types";

export const bookingsApi = {
  list: (status = "") =>
    apiRequest<{ data: Booking[] }>(
      `/bookings${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  create: (body: unknown) =>
    apiRequest<{ data: { booking: Booking; warnings?: string[] } }>(
      "/bookings",
      {
        method: "POST",
        body,
      },
    ),
};
