"use client";

import { useState } from "react";

export function CopyableId({
  id,
  length = 8,
  showFull = false,
}: {
  id: string;
  length?: number;
  showFull?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!id) return <span>—</span>;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Bấm để sao chép mã đầy đủ: ${id}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: copied ? "#f0fdf4" : "rgba(2, 132, 199, 0.06)",
        border: `1px solid ${copied ? "#bbf7d0" : "rgba(2, 132, 199, 0.18)"}`,
        padding: "2px 8px",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "12px",
        color: copied ? "#15803d" : "var(--primary, #0284c7)",
        transition: "all 0.15s ease",
      }}
    >
      <span>{copied ? "Đã sao chép" : showFull ? id : `${id.slice(0, length)}…`}</span>
    </button>
  );
}
