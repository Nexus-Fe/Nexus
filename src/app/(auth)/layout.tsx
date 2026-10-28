import type { ReactNode } from "react";
import { AuthShellClient } from "@/components/client/ClientShells";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShellClient>{children}</AuthShellClient>;
}
