export const ENV = {
  apiUrl:
    (import.meta.env.VITE_API_URL as string | undefined) ||
    "http://localhost:5000/api/v1",
  timezone: "Africa/Blantyre",
  currency: "MWK",
};
