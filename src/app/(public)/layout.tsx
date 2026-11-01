import type { ReactNode } from "react";
import { BuyerShellClient } from "@/components/client/ClientShells";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <BuyerShellClient>{children}</BuyerShellClient>;
}
