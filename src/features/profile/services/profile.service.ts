import { api, type ApiResponse } from "@/lib/api/client";
import type { UserProfile } from "../types";

export const profileService = {
  getProfile: () => api.get<ApiResponse<UserProfile>>("/api/users/profile"),
};
