const DEMO_SECRET = "demo-propos-2024";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getApiHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return { "x-demo-mode": DEMO_SECRET };
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}
