"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, api, clearSessionTokens, hasRefreshToken, SESSION_INVALIDATED_EVENT, type ApiResponse } from "@/lib/api/client";
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
  const sessionVersion = useRef(0);

  const setAuthenticatedUser = useCallback((authenticatedUser: AuthUser) => {
    sessionVersion.current += 1;
    setUser(authenticatedUser);
    setRestoreError(null);
  }, []);

  const clearSession = useCallback(() => {
    sessionVersion.current += 1;
    clearSessionTokens();
    setUser(null);
    setRestoreError(null);
    setReady(true);
  }, []);

  const refreshUser = useCallback(async () => {
    const version = sessionVersion.current;
    if (!hasRefreshToken()) {
      setUser(null);
      setRestoreError(null);
      setReady(true);
      return;
    }
    try {
      const response = await api.get<ApiResponse<AuthUser> | AuthUser>("/api/v1/me");
      if (version !== sessionVersion.current || !hasRefreshToken()) return;
      const profile = "data" in response ? response.data : response;
      if (!profile?.id || !profile.email) throw new Error("Phản hồi hồ sơ không hợp lệ.");
      if (["BANNED", "DELETED"].includes(profile.status?.toUpperCase() ?? "")) {
        clearSession();
        return;
      }
      setUser(profile);
      setRestoreError(null);
    } catch (error) {
      if (version !== sessionVersion.current) return;
      if (error instanceof ApiError && ["ACCOUNT_BANNED", "USER_BANNED"].includes(error.errorCode ?? "")) {
        clearSession();
        return;
      }
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
  }, [clearSession]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshUser(); }, 0);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshUser(); };
    const handleInvalidation = () => clearSession();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(SESSION_INVALIDATED_EVENT, handleInvalidation);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", refreshWhenVisible); window.removeEventListener(SESSION_INVALIDATED_EVENT, handleInvalidation); };
  }, [clearSession, refreshUser]);

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
