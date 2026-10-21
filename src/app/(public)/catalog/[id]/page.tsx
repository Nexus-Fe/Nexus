import { Suspense } from "react";
import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function ProductDetailPage(props: PageProps<"/catalog/[id]">) {
  return (
    <Suspense
      fallback={
        <RoutePlaceholder
          area="Khu vực công khai"
          title="Đang tải sản phẩm"
          description="Đang đọc mã sản phẩm từ đường dẫn."
        />
      }
    >
      <ProductDetail params={props.params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RoutePlaceholder
      area="Khu vực công khai"
      title={`Chi tiết sản phẩm ${id}`}
      description="Trang này sẽ hiển thị thông tin sản phẩm và trạng thái tồn kho từ feature catalog."
    />
  );
}
