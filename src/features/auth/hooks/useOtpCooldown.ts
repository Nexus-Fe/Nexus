"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export const DEFAULT_COOLDOWN_SECONDS = 60;

export function getStoredCooldownSeconds(email: string): number {
  if (typeof window === "undefined" || !email) return 0;
  const storageKey = `nexus_otp_cooldown_${email.toLowerCase().replace(/[^a-z0-9]/gi, "_")}`;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return 0;
    const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
    if (remaining > 0) return remaining;
    window.localStorage.removeItem(storageKey);
    return 0;
  } catch {
    return 0;
  }
}

export function saveStoredCooldown(email: string, seconds: number = DEFAULT_COOLDOWN_SECONDS): void {
  if (typeof window === "undefined" || !email) return;
  const storageKey = `nexus_otp_cooldown_${email.toLowerCase().replace(/[^a-z0-9]/gi, "_")}`;
  try {
    const expiryTime = Date.now() + seconds * 1000;
    window.localStorage.setItem(storageKey, String(expiryTime));
  } catch {}
}

export function clearStoredCooldown(email: string): void {
  if (typeof window === "undefined" || !email) return;
  const storageKey = `nexus_otp_cooldown_${email.toLowerCase().replace(/[^a-z0-9]/gi, "_")}`;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {}
}

export function useOtpCooldown(email: string, durationSeconds: number = DEFAULT_COOLDOWN_SECONDS) {
  const [cooldown, setCooldown] = useState<number>(() => getStoredCooldownSeconds(email));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          stopTimer();
          clearStoredCooldown(email);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [email, stopTimer]);

  const startCooldown = useCallback((seconds: number = durationSeconds) => {
    if (!email) return;
    saveStoredCooldown(email, seconds);
    startTimer(seconds);
  }, [email, durationSeconds, startTimer]);

  const [prevEmail, setPrevEmail] = useState(email);
  if (prevEmail !== email) {
    setPrevEmail(email);
    setCooldown(getStoredCooldownSeconds(email));
  }

  useEffect(() => {
    if (!email) {
      stopTimer();
      return;
    }
    const sync = () => {
      const remaining = getStoredCooldownSeconds(email);
      if (remaining > 0) {
        startTimer(remaining);
      } else {
        stopTimer();
        setCooldown(0);
      }
    };

    const timeoutId = setTimeout(sync, 0);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timeoutId);
      stopTimer();
      window.removeEventListener("focus", sync);
    };
  }, [email, startTimer, stopTimer]);

  return {
    cooldown,
    startCooldown,
    isCooldownActive: cooldown > 0,
  };
}
