import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { UpdateUserProfile, UserProfile } from "../types";

export const profileService = {
  getProfile: async (signal?: AbortSignal) =>
    unwrap(await api.get<ApiResponse<UserProfile> | UserProfile>("/api/v1/me", { signal })),
  updateProfile: async (changes: UpdateUserProfile) =>
    unwrap(await api.patch<ApiResponse<UserProfile> | UserProfile>("/api/v1/me", changes)),
};
