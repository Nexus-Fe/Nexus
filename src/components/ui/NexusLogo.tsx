interface NexusBrandProps {
  light?: boolean;
  height?: number;
  compact?: boolean;
  className?: string;
}

export function NexusBrandHeader({
  light = false,
  height = 26,
  compact = false,
  className = "",
}: NexusBrandProps) {
  if (compact) {
    return (
      <span
        className={
          "brand brand-compact" +
          (light ? " brand-light" : "") +
          (className ? ` ${className}` : "")
        }
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <img
          src="/brand/nexus-mark.png"
          alt="NEXUS"
          width={22}
          height={22}
          style={{ objectFit: "contain", flexShrink: 0 }}
        />
        <span style={{ fontWeight: 800, letterSpacing: "-0.04em", fontSize: 18 }}>
          NEXUS<span className="brand-mark brand-mark-sky" style={{ color: "#38bdf8", fontSize: 10 }}>●</span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={
        "brand" +
        (light ? " brand-light" : "") +
        (className ? ` ${className}` : "")
      }
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      <img
        src={light ? "/brand/nexus-horizontal-light.png" : "/brand/nexus-horizontal.png"}
        alt="NEXUS"
        height={height}
        style={{
          height,
          width: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </span>
  );
}

export const NexusLogo = NexusBrandHeader;
