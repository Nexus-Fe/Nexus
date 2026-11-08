import { ButtonLink } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";

export function AuctionComingSoon({
  title = "Tính năng Đấu giá trực tiếp đang được hoàn thiện",
  description = "Hệ thống đấu giá thời gian thực (Live Bidding) đang trong giai đoạn phát triển và sẽ sớm ra mắt trong thời gian tới.",
  backHref = ROUTES.catalog.index,
  backLabel = "Khám phá sản phẩm",
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="auction-surface auction-unavailable">
      <div className="auction-unavailable-content">
        <div style={{ position: "relative", display: "inline-block" }}>
          <span className="auction-unavailable-mark" aria-hidden="true">
            <Icon name="gavel" size={28} />
          </span>
          <span
            className="badge"
            style={{
              position: "absolute",
              bottom: "-6px",
              right: "-14px",
              background: "#d97706",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: "999px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            }}
          >
            Coming Soon
          </span>
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "15px", lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
        <div className="action-row" style={{ marginTop: "4px" }}>
          <ButtonLink href={backHref}>{backLabel}</ButtonLink>
          <ButtonLink href={ROUTES.home} variant="secondary">
            Về trang chủ
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
