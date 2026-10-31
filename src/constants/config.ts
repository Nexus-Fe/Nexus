const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const APP_CONFIG = {
  apiBaseUrl: (configuredApiUrl || "http://localhost:8080").replace(/\/$/, ""),
  tokenStorageKey: "nexus_token",
} as const;
