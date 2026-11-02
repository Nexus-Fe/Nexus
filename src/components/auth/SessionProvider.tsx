"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, clearSessionTokens, hasRefreshToken, type ApiResponse } from "@/lib/api/client";
import type { AuthUser } from "@/features/auth/types";

type SessionContextValue = {
  user: AuthUser | null;
  ready: boolean;
  restoreError: string | null;
  setAuthenticatedUser: (user: AuthUser) => void;
  refreshUser: () => Promise<void>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const setAuthenticatedUser = useCallback((authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    setRestoreError(null);
  }, []);

  const clearSession = useCallback(() => {
    clearSessionTokens();
    setUser(null);
    setRestoreError(null);
    setReady(true);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!hasRefreshToken()) {
      setUser(null);
      setRestoreError(null);
      setReady(true);
      return;
    }
    try {
      const response = await api.get<ApiResponse<AuthUser> | AuthUser>("/api/v1/me");
      const profile = "data" in response ? response.data : response;
      if (!profile?.id || !profile.email) throw new Error("Phản hồi hồ sơ không hợp lệ.");
      setUser(profile);
      setRestoreError(null);
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status) && !hasRefreshToken()) {
        setUser(null);
        setRestoreError(null);
        return;
      }
      setUser(null);
      setRestoreError("Không tải được phiên từ Gateway. Phiên đăng nhập vẫn được giữ; vui lòng thử lại.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshUser(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, ready, restoreError, setAuthenticatedUser, refreshUser, clearSession }),
    [user, ready, restoreError, setAuthenticatedUser, refreshUser, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession phải được gọi bên trong SessionProvider.");
  return value;
}
