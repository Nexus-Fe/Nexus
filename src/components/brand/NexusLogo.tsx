import type { SVGProps } from "react";

export function NexusGavelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {/* N Shape Left Column */}
      <path
        d="M8 8H14V32H8V8Z"
        fill="#0284C7"
      />
      {/* N Shape Diagonal */}
      <path
        d="M14 8H20L28 32H22L14 8Z"
        fill="#0369A1"
      />
      {/* N Shape Right Column */}
      <path
        d="M26 8H32V32H26V8Z"
        fill="#38BDF8"
      />
      {/* Auction Gavel Head */}
      <rect
        x="18"
        y="12"
        width="11"
        height="6"
        rx="1.5"
        transform="rotate(-40 18 12)"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="1.5"
      />
      <rect
        x="16.5"
        y="10.5"
        width="14"
        height="2"
        rx="0.5"
        transform="rotate(-40 16.5 10.5)"
        fill="#38BDF8"
      />
      {/* Auction Gavel Handle */}
      <rect
        x="24"
        y="18"
        width="3"
        height="14"
        rx="1.2"
        transform="rotate(-40 24 18)"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function NexusBrandHeader({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: light ? "rgba(255, 255, 255, 0.08)" : "rgba(2, 132, 199, 0.1)",
          border: light ? "1px solid rgba(255, 255, 255, 0.16)" : "1px solid rgba(2, 132, 199, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <NexusGavelIcon width={26} height={26} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "0.06em",
            color: light ? "#FFFFFF" : "#0F172A",
            fontFamily: "var(--font-sans, inherit)",
          }}
        >
          NEXUS
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: light ? "#38BDF8" : "#0284C7",
            textTransform: "uppercase",
          }}
        >
          THƯƠNG MẠI &amp; ĐẤU GIÁ
        </span>
      </div>
    </div>
  );
}
