import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in duration-200">
      {children}
    </div>
  );
}
