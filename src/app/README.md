# App Router

`app/` chỉ định tuyến và kết hợp giao diện. Các page nên mỏng: lấy `params`/`searchParams` khi cần, sau đó render feature hoặc widget. Page và layout là Server Components theo mặc định của Next.js; chỉ phần cần state, event handler hoặc API browser mới trở thành Client Component.

## Các nhóm route

Route group trong ngoặc không xuất hiện trong URL:

- `(public)`: `/`, `/catalog`, `/catalog/[id]`.
- `(auth)`: `/login`, `/register`.
- `(dashboard)/buyer`: `/buyer/profile`, `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]`, `/buyer/wallet`.
- `(dashboard)/seller`: `/seller/products`, `/seller/inventory`.
- `(dashboard)/staff`: `/staff/sellers`, `/staff/orders`, `/staff/fulfillment`.
- `(dashboard)/admin`: `/admin/users`, `/admin/categories`, `/admin/audit-log`.

Các page đã tạo hiện là trang khung. Việc có URL chưa có nghĩa là đã có đăng nhập, kiểm tra vai trò hoặc quyền truy cập; những kiểm tra đó cần được nối với session và backend trước khi dùng cho dữ liệu thật.
