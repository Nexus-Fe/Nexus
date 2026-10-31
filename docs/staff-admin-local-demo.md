# Demo Staff/Admin trên frontend local

Chế độ này dùng để kiểm tra màn hình và thao tác FE khi UserService chưa hoàn thiện API. Nó chỉ hoạt động với `npm run dev` và có nhãn **Demo** trên các màn liên quan.

## Bật demo

Thêm dòng sau vào `.env.local`, rồi khởi động lại dev server:

```env
NEXT_PUBLIC_STAFF_ADMIN_DEMO=1
```

Truy cập các màn theo thứ tự:

1. `/staff/sellers`: lọc hồ sơ chờ duyệt, mở chi tiết; tại `/staff/sellers/[id]`, thử duyệt hoặc từ chối kèm lý do.
2. `/admin/categories`: tạo, sửa, ẩn hoặc xóa danh mục mẫu.
3. `/admin/users`: tìm và lọc tài khoản mẫu, xem chi tiết, Ban, mở Ban hoặc xóa mềm với lý do.

Chỉ bốn route trên dùng dữ liệu mẫu lưu trong `sessionStorage` của tab. Chúng không gọi API nghiệp vụ và bỏ qua cổng role của FE để xem được màn demo khi chưa đăng nhập. Các route khác tiếp tục dùng luồng thông thường. Dữ liệu mẫu không đồng bộ sang tài khoản Buyer, Seller hay backend; đóng tab sẽ mất trạng thái demo của tab đó.

## Quay lại luồng Gateway

Xóa `NEXT_PUBLIC_STAFF_ADMIN_DEMO` hoặc đặt giá trị khác `1`, rồi khởi động lại dev server. Khi đó các màn Staff/Admin dùng service gọi Gateway và yêu cầu phiên đăng nhập có role phù hợp. Kiểm chứng API, phân quyền BE, OTP, đồng bộ kho và thu hồi token phải thực hiện với backend thật.

Các màn và logic demo nằm tại `src/features/staff/`, `src/features/admin/` và `src/lib/demo/`. Cập nhật hướng dẫn này khi thay đổi phạm vi demo; README gốc chỉ giữ liên kết.
