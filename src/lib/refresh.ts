const JWT_KEY = "mauricarnet_jwt";
const REFRESH_TOKEN_KEY = "mauricarnet_refresh_token";

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getJwt(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(JWT_KEY) || "";
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function refreshJwt(): Promise<string | null> {
  const current = getJwt();
  if (!current) return null;

  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        return null;
      }

      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[refresh] Échec", res.status, text);
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return null;
      }

      const data = await res.json();
      localStorage.setItem(JWT_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      return data.access_token;
    } catch (err) {
      console.error("[refresh] Erreur réseau", err);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getValidJwt(): Promise<string | null> {
  const current = getJwt();
  if (!current) return null;

  const payload = tryParseJwt(current);
  if (!payload) return refreshJwt();

  if (!payload.exp) return refreshJwt();

  if (payload.exp * 1000 > Date.now() + 60000) return current;

  return refreshJwt();
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return atob(base64);
}

function tryParseJwt(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch (err) {
    console.error("[tryParseJwt] Erreur de parsing", err);
    return null;
  }
}
