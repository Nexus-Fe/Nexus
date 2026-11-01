"use client";

export type ApiResponse<T> = {
  success: true;
  statusCode: number;
  message?: string | null;
  data: T;
  traceId?: string;
  timestamp?: string;
};

export type ApiProblem = {
  status?: number;
  title?: string;
  detail?: string;
  message?: string;
  errorCode?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
    readonly errorCode?: string,
    readonly traceId?: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body" | "method"> & {
  body?: BodyInit | Record<string, unknown> | null;
  skipRefresh?: boolean;
};

const SESSION_ACCESS_KEY = "nexus_access_token";
const SESSION_REFRESH_KEY = "nexus_refresh_token";
let refreshInFlight: Promise<string | null> | null = null;

function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveSessionTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_ACCESS_KEY, accessToken);
  window.sessionStorage.setItem(SESSION_REFRESH_KEY, refreshToken);
}

export function clearSessionTokens(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_ACCESS_KEY);
  window.sessionStorage.removeItem(SESSION_REFRESH_KEY);
}

export function hasRefreshToken(): boolean {
  return Boolean(getStoredToken(SESSION_REFRESH_KEY));
}

export function getRefreshToken(): string | null {
  return getStoredToken(SESSION_REFRESH_KEY);
}

function readField(value: unknown, key: keyof ApiProblem): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : undefined;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
  const text = await response.text();
  return text || undefined;
}

function toError(response: Response, payload: unknown): ApiError {
  const message =
    readField(payload, "detail") ??
    readField(payload, "title") ??
    readField(payload, "message") ??
    `Yêu cầu thất bại (HTTP ${response.status}).`;
  const errors =
    typeof payload === "object" && payload !== null && "errors" in payload
      ? (payload as ApiProblem).errors
      : undefined;

  return new ApiError(
    message,
    response.status,
    payload,
    readField(payload, "errorCode"),
    readField(payload, "traceId") ?? response.headers.get("x-trace-id") ?? undefined,
    errors,
  );
}

function makeUrl(path: string): string {
  if (!path.startsWith("/api/v1/")) {
    throw new Error("API path phải bắt đầu bằng /api/v1/.");
  }
  return `/api/gateway${path}`;
}

function requestHeaders(options: ApiRequestOptions): Headers {
  const headers = new Headers(options.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  const accessToken = getStoredToken(SESSION_ACCESS_KEY);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (
    options.body !== undefined &&
    options.body !== null &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof URLSearchParams) &&
    !(options.body instanceof ArrayBuffer)
  ) {
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  }
  return headers;
}

function requestBody(options: ApiRequestOptions): BodyInit | null | undefined {
  const body = options.body;
  if (
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof ArrayBuffer)
  ) {
    return JSON.stringify(body);
  }
  return body as BodyInit | null | undefined;
}

async function sendWithMetadata<T>(path: string, method: string, options: ApiRequestOptions): Promise<{ data: T; headers: Headers }> {
  const requestOptions = { ...options } as RequestInit;
  delete (requestOptions as ApiRequestOptions).skipRefresh;
  const response = await fetch(makeUrl(path), {
    ...requestOptions,
    method,
    headers: requestHeaders(options),
    body: requestBody(options),
    cache: "no-store",
  });
  const payload = await readPayload(response);

  if (!response.ok) throw toError(response, payload);
  if (response.status === 204) return { data: undefined as T, headers: response.headers };
  return { data: payload as T, headers: response.headers };
}

async function send<T>(path: string, method: string, options: ApiRequestOptions): Promise<T> {
  return (await sendWithMetadata<T>(path, method, options)).data;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getStoredToken(SESSION_REFRESH_KEY);
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(makeUrl("/api/v1/auth/refresh"), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, deviceInfo: navigator.userAgent }),
        cache: "no-store",
      });
      const payload = await readPayload(response);
      if (!response.ok || typeof payload !== "object" || payload === null) {
        clearSessionTokens();
        return null;
      }
      const data = (payload as ApiResponse<Record<string, unknown>>).data;
      const access = data?.accessToken;
      const refresh = data?.refreshToken;
      if (typeof access !== "string" || typeof refresh !== "string") {
        clearSessionTokens();
        return null;
      }
      saveSessionTokens(access, refresh);
      return access;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, method: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, method, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || options.skipRefresh || path === "/api/v1/auth/refresh") {
      throw error;
    }
    const accessToken = await refreshAccessToken();
    if (!accessToken) throw error;
    return send<T>(path, method, options);
  }
}

async function requestWithMetadata<T>(path: string, method: string, options: ApiRequestOptions = {}): Promise<{ data: T; headers: Headers }> {
  try {
    return await sendWithMetadata<T>(path, method, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || options.skipRefresh || path === "/api/v1/auth/refresh") {
      throw error;
    }
    const accessToken = await refreshAccessToken();
    if (!accessToken) throw error;
    return sendWithMetadata<T>(path, method, options);
  }
}

export const api = {
  request,
  get<T>(path: string, options?: ApiRequestOptions) {
    return request<T>(path, "GET", options ?? {});
  },
  getWithMetadata<T>(path: string, options?: ApiRequestOptions) {
    return requestWithMetadata<T>(path, "GET", options ?? {});
  },
  post<T>(path: string, body?: ApiRequestOptions["body"], options?: ApiRequestOptions) {
    return request<T>(path, "POST", { ...options, body });
  },
  put<T>(path: string, body?: ApiRequestOptions["body"], options?: ApiRequestOptions) {
    return request<T>(path, "PUT", { ...options, body });
  },
  patch<T>(path: string, body?: ApiRequestOptions["body"], options?: ApiRequestOptions) {
    return request<T>(path, "PATCH", { ...options, body });
  },
  delete<T>(path: string, options?: ApiRequestOptions) {
    return request<T>(path, "DELETE", options ?? {});
  },
};
