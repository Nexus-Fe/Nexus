"use client";

import { APP_CONFIG } from "@/constants/config";
import { ROUTES } from "@/constants/routes";

export type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  data: T;
  traceId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly traceId?: string;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.traceId = readStringField(payload, "traceId");
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body" | "method"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

function readStringField(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : undefined;
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${APP_CONFIG.apiBaseUrl}/${path.replace(/^\/+/, "")}`;
}

function isJsonBody(body: BodyInit | Record<string, unknown>): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof ArrayBuffer)
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}

function getErrorMessage(payload: unknown, status: number): string {
  return (
    readStringField(payload, "message") ??
    readStringField(payload, "error") ??
    `API request failed with status ${status}.`
  );
}

function clearSessionAndRedirect(): void {
  window.localStorage.removeItem(APP_CONFIG.tokenStorageKey);

  const isAuthPage =
    window.location.pathname === ROUTES.auth.login ||
    window.location.pathname === ROUTES.auth.register;

  if (!isAuthPage) {
    window.location.assign(ROUTES.auth.login);
  }
}

async function request<T>(
  path: string,
  method: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", headers.get("Accept") ?? "application/json");

  const token = window.localStorage.getItem(APP_CONFIG.tokenStorageKey);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let requestBody: BodyInit | null | undefined;
  if (options.body !== undefined && options.body !== null && isJsonBody(options.body)) {
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
    requestBody = JSON.stringify(options.body);
  } else {
    requestBody = options.body as BodyInit | null | undefined;
  }

  const response = await fetch(resolveUrl(path), {
    ...options,
    method,
    headers,
    body: requestBody,
  });
  const payload = await readResponseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionAndRedirect();
    }

    throw new ApiError(getErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}

export const api = {
  request,
  get<T>(path: string, options?: ApiRequestOptions) {
    return request<T>(path, "GET", options);
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
    return request<T>(path, "DELETE", options);
  },
};
