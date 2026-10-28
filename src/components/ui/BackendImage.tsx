"use client";

import { useState } from "react";
import { NoData } from "./Primitives";

export function BackendImage({ src, alt, compact = false }: { src: string | null; alt: string; compact?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return <NoData className={compact ? "compact" : ""} />;
  // Backend image hosts are provided at runtime, so Next Image remotePatterns cannot be fixed at build time.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setFailedSource(src)} />;
}
