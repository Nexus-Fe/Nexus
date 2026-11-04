"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearSessionTokens, getStoredRoles, getStoredUser, hasRefreshToken, saveSessionRoles, saveStoredUser, ApiError, type ApiResponse } from "@/lib/api/client";
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
  // Start with null/false to ensure SSR and Client initial hydration match 100%
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(() => {
    clearSessionTokens();
    setUser(null);
    setReady(true);
  }, []);

  const setAuthenticatedUser = useCallback((authenticatedUser: AuthUser) => {
    const storedRoles = getStoredRoles();
    const userRoles = Array.isArray(authenticatedUser.roles)
      ? authenticatedUser.roles.map((r) => String(r).trim()).filter(Boolean)
      : [];
    if (authenticatedUser.role && typeof authenticatedUser.role === "string" && authenticatedUser.role.trim()) {
      userRoles.push(authenticatedUser.role.trim());
    }
    const mergedRolesSet = new Set<string>();
    for (const r of storedRoles) mergedRolesSet.add(r);
    for (const r of userRoles) mergedRolesSet.add(r);
    const roles = Array.from(mergedRolesSet);
    if (roles.length > 0) {
      saveSessionRoles(roles);
    }
    const userWithRoles = { ...authenticatedUser, roles };
    saveStoredUser(userWithRoles);
    setUser(userWithRoles);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!hasRefreshToken()) {
      clearSessionTokens();
      setUser(null);
      setReady(true);
      return;
    }

    // Hydrate immediately from cached storage so UI doesn't delay or flash unauthenticated
    const cached = getStoredUser<AuthUser>();
    const cachedRoles = getStoredRoles();
    if (cached) {
      const mergedSet = new Set<string>();
      if (Array.isArray(cached.roles)) {
        for (const r of cached.roles) mergedSet.add(r);
      }
      for (const r of cachedRoles) mergedSet.add(r);
      const roles = Array.from(mergedSet);
      setUser({ ...cached, roles });
      setReady(true);
    }

    try {
      const response = await api.get<ApiResponse<AuthUser & { userId?: string }>>("/api/v1/me");
      const profile = response.data;
      const storedRoles = getStoredRoles();
      const profileRoles = Array.isArray(profile.roles)
        ? profile.roles.map((r) => String(r).trim()).filter(Boolean)
        : [];
      if (profile.role && typeof profile.role === "string" && profile.role.trim()) {
        profileRoles.push(profile.role.trim());
      }
      const mergedRolesSet = new Set<string>();
      for (const r of storedRoles) mergedRolesSet.add(r);
      for (const r of profileRoles) mergedRolesSet.add(r);
      const existingRoles = Array.from(mergedRolesSet);
      if (existingRoles.length > 0) {
        saveSessionRoles(existingRoles);
      }
      const id = profile.id || profile.userId || "";
      const resolvedUser: AuthUser = { ...profile, id, roles: existingRoles };
      saveStoredUser(resolvedUser);
      setUser(resolvedUser);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSessionTokens();
        setUser(null);
      } else {
        const fallback = getStoredUser<AuthUser>();
        if (fallback) {
          setUser(fallback);
        }
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshUser();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, ready, setAuthenticatedUser, refreshUser, clearSession }),
    [user, ready, setAuthenticatedUser, refreshUser, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession phải được gọi bên trong SessionProvider.");
  return value;
}
