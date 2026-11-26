import { apiRequest } from "./client";

export const dashboardApi = {
  summary: () =>
    apiRequest<{ data: Record<string, unknown> }>("/reports/dashboard"),
  debtors: () => apiRequest<{ data: unknown[] }>("/reports/debtors"),
  runDailyJob: (businessDate?: string) =>
    apiRequest("/reports/run-daily-job", {
      method: "POST",
      body: businessDate ? { businessDate } : {},
    }),
};
