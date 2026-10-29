import { ButtonLink } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";

export function AuctionUnavailableState() {
  return (
    <section className="auction-surface auction-unavailable">
      <div className="auction-unavailable-content">
        <span className="auction-unavailable-mark" aria-hidden="true">
          <Icon name="gavel" size={25} />
        </span>
        <h1>Phiên đấu giá không hợp lệ hoặc đã không còn khả dụng !</h1>
        <ButtonLink href={ROUTES.auction.index}>Quay lại danh sách phiên</ButtonLink>
      </div>
    </section>
  );
}
