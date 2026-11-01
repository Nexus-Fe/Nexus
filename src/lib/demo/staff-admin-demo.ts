export const staffAdminDemoEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_STAFF_ADMIN_DEMO === "1";

export function readDemoState<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return structuredClone(initial);
  try {
    const saved = window.sessionStorage.getItem(`nexus-staff-admin-demo:${key}`);
    return saved ? JSON.parse(saved) as T : structuredClone(initial);
  } catch {
    return structuredClone(initial);
  }
}

export function writeDemoState<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`nexus-staff-admin-demo:${key}`, JSON.stringify(value));
}
