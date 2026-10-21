import { Suspense } from "react";
import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function BuyerOrderDetailPage(
  props: PageProps<"/buyer/orders/[id]">,
) {
  return (
    <Suspense
      fallback={
        <RoutePlaceholder
          area="Cổng người mua"
          title="Đang tải đơn hàng"
          description="Đang đọc mã đơn hàng từ đường dẫn."
        />
      }
    >
      <BuyerOrderDetail params={props.params} />
    </Suspense>
  );
}

async function BuyerOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RoutePlaceholder
      area="Cổng người mua"
      title={`Theo dõi đơn hàng ${id}`}
      description="Trang này sẽ truy vấn trạng thái đơn hàng; trạng thái PENDING có thể chuyển tiếp khi quy trình Saga hoàn tất."
    />
  );
}
