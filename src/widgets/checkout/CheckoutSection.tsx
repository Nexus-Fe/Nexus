import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

/** Scaffold for a future multi-feature checkout composition. */
export function CheckoutSection() {
  return (
    <RoutePlaceholder
      area="Checkout widget"
      title="Tóm tắt thanh toán"
      description="Điểm ghép dự kiến cho commerce, wallet và fulfillment; hiện chưa gọi API hoặc tạo đơn hàng."
    />
  );
}
