const ACCESS_TOKEN_KEY = "tranptech_access_token";

export function getSavedAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSavedAccessToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota or privacy mode errors
  }
}
