"use client";

export type ApiResponse<T> = {
  success: true;
  statusCode: number;
  message?: string | null;
  data: T;
  traceId?: string;
  timestamp?: string;
};

/** Gỡ phong bì `{ data }` của Gateway; trả nguyên giá trị nếu response không có phong bì. */
export function unwrap<T>(response: ApiResponse<T> | T): T {
  return response && typeof response === "object" && "data" in response ? (response as ApiResponse<T>).data : (response as T);
}

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
const SESSION_ROLES_KEY = "nexus_session_roles";
const ACCOUNT_CHECK_TTL_MS = 30_000;
let refreshInFlight: { token: string; promise: Promise<string | null> } | null = null;
let accountCheckInFlight: { token: string; promise: Promise<void> } | null = null;
let meGetInFlight: { token: string | null; promise: Promise<{ data: unknown; headers: Headers }> } | null = null;
let lastAccountVerified: { token: string; verifiedAt: number } | null = null;
export const SESSION_INVALIDATED_EVENT = "nexus:session-invalidated";

function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function extractRolesFromToken(token?: string | null): string[] {
  if (!token || typeof token !== "string") return [];
  try {
    const parts = token.split(".");
    if (parts.length < 2) return [];
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonPayload = new TextDecoder().decode(bytes);
    const payload = JSON.parse(jsonPayload);
    const claim =
      payload.roles ??
      payload.role ??
      payload.Roles ??
      payload.Role ??
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"];
    if (Array.isArray(claim)) return claim.map((r) => String(r).trim()).filter(Boolean);
    if (typeof claim === "string" && claim.trim()) return [claim.trim()];
    return [];
  } catch {
    return [];
  }
}


export function saveSessionTokens(accessToken: string, refreshToken: string, _roles?: string[]): void {
  lastAccountVerified = null;
  meGetInFlight = null;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_ACCESS_KEY, accessToken);
  window.localStorage.setItem(SESSION_REFRESH_KEY, refreshToken);
  // Remove legacy role data. UI permissions come from the authenticated /me response.
  window.localStorage.removeItem(SESSION_ROLES_KEY);

}

export function saveSessionRoles(_roles: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_ROLES_KEY);
}

export function getStoredRoles(): string[] {
  // Kept for existing callers; a browser-stored role must never grant UI access.
  return [];
}

export function clearSessionTokens(): void {
  lastAccountVerified = null;
  meGetInFlight = null;
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_ACCESS_KEY);
  window.localStorage.removeItem(SESSION_REFRESH_KEY);
  window.localStorage.removeItem(SESSION_ROLES_KEY);
  try {
    window.sessionStorage?.clear();
  } catch {
    // Ignore sessionStorage errors
  }
}

function invalidateSession(): void {
  clearSessionTokens();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
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
  if (contentType.includes("json")) {
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
  const isMeGet = path === "/api/v1/me" && method === "GET" && !options.signal;
  const activeToken = isMeGet ? getStoredToken(SESSION_ACCESS_KEY) : null;
  if (isMeGet && meGetInFlight && meGetInFlight.token === activeToken) {
    return meGetInFlight.promise as Promise<{ data: T; headers: Headers }>;
  }

  const execute = async (): Promise<{ data: T; headers: Headers }> => {
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
    if (isMeGet && activeToken && getStoredToken(SESSION_ACCESS_KEY) === activeToken) {
      const profile =
        payload && typeof payload === "object" && "data" in payload
          ? (payload as ApiResponse<{ status?: string }>).data
          : (payload as { status?: string } | null);
      const status =
        profile && typeof profile === "object" ? (profile.status?.toUpperCase() ?? "") : "";
      if (!["BANNED", "DELETED"].includes(status)) {
        lastAccountVerified = { token: activeToken, verifiedAt: Date.now() };
      }
    }
    return { data: payload as T, headers: response.headers };
  };

  if (!isMeGet) {
    return execute();
  }

  const current = {
    token: activeToken,
    promise: execute().finally(() => {
      if (meGetInFlight === current) meGetInFlight = null;
    }),
  };
  meGetInFlight = current;
  return current.promise as Promise<{ data: T; headers: Headers }>;
}

async function send<T>(path: string, method: string, options: ApiRequestOptions): Promise<T> {
  return (await sendWithMetadata<T>(path, method, options)).data;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredToken(SESSION_REFRESH_KEY);
  if (!refreshToken) return null;
  if (refreshInFlight?.token === refreshToken) return refreshInFlight.promise;

  const check = { token: refreshToken, promise: Promise.resolve<string | null>(null) };
  check.promise = (async () => {
    try {
      const response = await fetch(makeUrl("/api/v1/auth/refresh"), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, deviceInfo: navigator.userAgent }),
        cache: "no-store",
      });
      const payload = await readPayload(response);
      if (!response.ok || typeof payload !== "object" || payload === null) {
        if ([400, 401, 403].includes(response.status) && getStoredToken(SESSION_REFRESH_KEY) === refreshToken) clearSessionTokens();
        return null;
      }
      const data = "data" in payload ? (payload as ApiResponse<Record<string, unknown>>).data : payload as Record<string, unknown>;
      const access = data?.accessToken;
      const refresh = data?.refreshToken;
      if (typeof access !== "string" || typeof refresh !== "string") {
        return null;
      }
      if (getStoredToken(SESSION_REFRESH_KEY) !== refreshToken) return null;

      saveSessionTokens(access, refresh);

      return access;
    } catch {
      return null;
    } finally {
      if (refreshInFlight === check) refreshInFlight = null;
    }
  })();
  refreshInFlight = check;
  return check.promise;
}

async function ensureAccountActive(path: string): Promise<void> {
  if (path === "/api/v1/me" || path.startsWith("/api/v1/auth/")) return;
  const accessToken = getStoredToken(SESSION_ACCESS_KEY);
  if (!accessToken) return;
  if (
    lastAccountVerified &&
    lastAccountVerified.token === accessToken &&
    Date.now() - lastAccountVerified.verifiedAt < ACCOUNT_CHECK_TTL_MS
  ) {
    return;
  }
  if (accountCheckInFlight?.token !== accessToken) {
    const check = { token: accessToken, promise: Promise.resolve() };
    check.promise = (async () => {
      try {
        const response = await request<ApiResponse<{ status?: string }> | { status?: string }>("/api/v1/me", "GET", {});
        if (getStoredToken(SESSION_ACCESS_KEY) !== accessToken) return;
        const profile = response && typeof response === "object" && "data" in response ? response.data : response;
        if (["BANNED", "DELETED"].includes(profile.status?.toUpperCase() ?? "")) {
          throw new ApiError("Tài khoản đã bị khóa hoặc xóa. Vui lòng đăng nhập lại.", 403, response, "ACCOUNT_BANNED");
        }
        lastAccountVerified = { token: accessToken, verifiedAt: Date.now() };
      } catch (error) {
        if (getStoredToken(SESSION_ACCESS_KEY) !== accessToken) return;
        if (error instanceof ApiError && (["ACCOUNT_BANNED", "USER_BANNED"].includes(error.errorCode ?? "") || (error.status === 401 && !hasRefreshToken()))) {
          invalidateSession();
          throw error;
        }
        // A transient profile failure must not block an unrelated request.
      }
    })().finally(() => { if (accountCheckInFlight === check) accountCheckInFlight = null; });
    accountCheckInFlight = check;
  }
  await accountCheckInFlight.promise;
  const currentToken = getStoredToken(SESSION_ACCESS_KEY);
  if (!currentToken) throw new ApiError("Phiên đăng nhập đã kết thúc.", 401, null, "SESSION_INVALIDATED");
  if (currentToken !== accessToken) await ensureAccountActive(path);
}

async function request<T>(path: string, method: string, options: ApiRequestOptions = {}): Promise<T> {
  await ensureAccountActive(path);
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
  await ensureAccountActive(path);
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
