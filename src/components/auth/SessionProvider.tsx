"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearSessionTokens, hasRefreshToken, type ApiResponse } from "@/lib/api/client";
import type { AuthUser } from "@/features/auth/types";

type SessionContextValue = {
  user: AuthUser | null;
  ready: boolean;
  setAuthenticatedUser: (user: AuthUser) => void;
  refreshUser: () => Promise<void>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(() => {
    clearSessionTokens();
    setUser(null);
    setReady(true);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!hasRefreshToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const response = await api.get<ApiResponse<AuthUser>>("/api/v1/me");
      setUser(response.data);
    } catch {
      clearSessionTokens();
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshUser(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, ready, setAuthenticatedUser: setUser, refreshUser, clearSession }),
    [user, ready, refreshUser, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession phải được gọi bên trong SessionProvider.");
  return value;
}
