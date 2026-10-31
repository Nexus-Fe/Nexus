import { api, clearSessionTokens, getRefreshToken, saveSessionTokens, type ApiResponse } from "@/lib/api/client";
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from "../types";

export type RegistrationResponse = { userId?: string; email?: string; otpExpiresIn?: number };

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
    const response = await api.post<ApiResponse<GatewayLoginData>>("/api/v1/auth/login", {
      identifier: credentials.identifier.trim(),
      password: credentials.password,
    }, { skipRefresh: true });
    const login = response.data;
    if (!login?.accessToken || !login.refreshToken) {
      throw new Error("Phản hồi đăng nhập thiếu thông tin phiên.");
    }
    const accessToken = login.accessToken;
    const refreshToken = login.refreshToken;
    saveSessionTokens(accessToken, refreshToken);
    try {
      const profile = login.user ?? (await this.getCurrentUser()).data;
      return {
        ...response,
        data: { ...login, accessToken, refreshToken, user: profileFromGateway(profile, login) },
      } satisfies ApiResponse<AuthResponse>;
    } catch (error) {
      clearSessionTokens();
      throw error;
    }
  },

  register(input: RegisterRequest) {
    return api.post<ApiResponse<RegistrationResponse>>("/api/v1/auth/register", {
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
    return api.post<ApiResponse<{ isVerified: boolean; email: string }>>(
      "/api/v1/auth/otp/verify",
      { email, otp },
      { skipRefresh: true },
    );
  },

  resendOtp(email: string, type: "REGISTER" | "FORGOT_PASSWORD" = "REGISTER") {
    return api.post<ApiResponse<{ email: string; resendCooldown: number }>>(
      "/api/v1/auth/otp/resend",
      { email, type },
      { skipRefresh: true },
    );
  },

  getCurrentUser() {
    return api.get<ApiResponse<AuthUser & { userId?: string }>>("/api/v1/me");
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
