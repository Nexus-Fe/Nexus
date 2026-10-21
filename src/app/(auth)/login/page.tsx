import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function LoginPage() {
  return (
    <RoutePlaceholder
      area="Tài khoản"
      title="Đăng nhập"
      description="Biểu mẫu đăng nhập sẽ gọi authService và lưu access token sau khi gateway xác nhận."
    />
  );
}
