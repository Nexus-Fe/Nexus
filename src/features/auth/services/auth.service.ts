import { api, clearSessionTokens, getRefreshToken, saveSessionTokens, type ApiResponse } from "@/lib/api/client";
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from "../types";

export type RegistrationResponse = { userId?: string; email?: string; otpExpiresIn?: number };

function unwrap<T>(response: ApiResponse<T> | T): T {
  return response && typeof response === "object" && "data" in response ? response.data : response;
}

type GatewayLoginData = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  userId?: string;
  roles?: string[];
  user?: AuthUser & { userId?: string };
};

function profileFromGateway(value: AuthUser & { userId?: string }, login: GatewayLoginData): AuthUser {
  const id = value.id || value.userId || login.userId;
  if (!id || !value.email) {
    throw new Error("Phản hồi hồ sơ người dùng thiếu ID hoặc email.");
  }

  const roles = value.roles?.length ? value.roles : login.roles;
  return { ...value, id, roles };
}

export const authService = {
  async login(credentials: LoginRequest) {
    const response = await api.post<ApiResponse<GatewayLoginData> | GatewayLoginData>("/api/v1/auth/login", {
      identifier: credentials.identifier.trim(),
      password: credentials.password,
    }, { skipRefresh: true });
    const login = unwrap(response);
    if (!login?.accessToken || !login.refreshToken) {
      throw new Error("Phản hồi đăng nhập thiếu thông tin phiên.");
    }
    const accessToken = login.accessToken;
    const refreshToken = login.refreshToken;
    saveSessionTokens(accessToken, refreshToken);
    try {
      const profile = login.user ?? await this.getCurrentUser();
      return {
        ...login, accessToken, refreshToken, user: profileFromGateway(profile, login),
      } satisfies AuthResponse;
    } catch (error) {
      clearSessionTokens();
      throw error;
    }
  },

  register(input: RegisterRequest) {
    return api.post<ApiResponse<RegistrationResponse> | RegistrationResponse>("/api/v1/auth/register", {
      username: input.username,
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
    }, { skipRefresh: true });
  },

  verifyOtp(email: string, otp: string) {
    return api.post<ApiResponse<{ isVerified: boolean; email: string }> | { isVerified: boolean; email: string }>(
      "/api/v1/auth/otp/verify",
      { email, otp },
      { skipRefresh: true },
    );
  },

  resendOtp(email: string, type: "REGISTER" | "FORGOT_PASSWORD" = "REGISTER") {
    return api.post<ApiResponse<{ email: string; resendCooldown: number }> | { email: string; resendCooldown: number }>(
      "/api/v1/auth/otp/resend",
      { email, type },
      { skipRefresh: true },
    );
  },

  async getCurrentUser() {
    const response = await api.get<ApiResponse<AuthUser & { userId?: string }> | (AuthUser & { userId?: string })>("/api/v1/me");
    return unwrap(response);
  },

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.post<ApiResponse<{ success: boolean }>>(
          "/api/v1/auth/logout",
          { refreshToken },
          { skipRefresh: true },
        );
      }
    } finally {
      clearSessionTokens();
    }
  },
};
