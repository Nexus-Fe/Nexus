import { APP_CONFIG } from "@/constants/config";
import { ROUTES } from "@/constants/routes";
import { api, type ApiResponse } from "@/lib/api/client";
import type { AuthResponse, LoginRequest, RegisterRequest } from "../types";

// Gateway paths are initial assumptions and must be checked against backend OpenAPI.
async function persistToken(response: ApiResponse<AuthResponse>) {
  if (response.data.token) {
    window.localStorage.setItem(APP_CONFIG.tokenStorageKey, response.data.token);
  }

  return response;
}

export const authService = {
  login: async (credentials: LoginRequest) =>
    persistToken(
      await api.post<ApiResponse<AuthResponse>>("/api/auth/login", credentials),
    ),
  register: async (input: RegisterRequest) =>
    persistToken(
      await api.post<ApiResponse<AuthResponse>>("/api/auth/register", input),
    ),
  logout: () => {
    window.localStorage.removeItem(APP_CONFIG.tokenStorageKey);
    window.location.assign(ROUTES.auth.login);
  },
};
