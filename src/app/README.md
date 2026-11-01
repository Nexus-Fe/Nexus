# App Router

`app/` chỉ định tuyến và kết hợp giao diện. Các screen được nạp động trong Client Components với SSR tắt để ứng dụng dùng CSR; API browser chỉ gọi cùng-origin Gateway proxy.

## Các nhóm route

Route group trong ngoặc không xuất hiện trong URL:

- `(public)`: `/`, `/catalog`, `/catalog/[id]`, `/auctions`, `/auctions/[id]`.
- `(auth)`: `/login`, `/register`, `/account/forgot-password`, `/account/reset-password`, `/account/change-password`, `/account/profile`.
- `(dashboard)/buyer`: `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]`, `/buyer/orders/[id]/review`, `/buyer/reports`, `/buyer/wallet`, `/buyer/wallet/top-up`, `/buyer/auctions`, `/buyer/auctions/[id]/result`, `/buyer/auctions/[id]/payment`.
- `(dashboard)/seller`: `/seller/shop`, `/seller/products`, `/seller/products/new`, `/seller/inventory`, `/seller/orders`, `/seller/orders/[id]`, `/seller/shipments`, `/seller/shipments/[id]`, `/seller/wallet`, `/seller/withdrawals`, `/seller/auctions`, `/seller/auctions/new`, `/seller/auctions/[id]`, `/seller/auctions/[id]/edit`, `/seller/auctions/[id]/recreate`, `/seller/auctions/[id]/result`.
- `(dashboard)/staff`: `/staff/sellers`, `/staff/sellers/[id]`, `/staff/reports`, `/staff/auctions`, `/staff/auctions/[id]`, `/staff/withdrawals`, `/staff/product-moderation`, `/staff/transactions/discrepancies`.
- `(dashboard)/admin`: `/admin/overview`, `/admin/users`, `/admin/roles`, `/admin/auctions`, `/admin/auctions/[id]`, `/admin/auction-configs`, `/admin/audit-log`, `/admin/categories`, `/admin/configs`, `/admin/coupons`, `/admin/ledger`, `/admin/system-health`.

Session dùng token do Gateway cấp; role guard hỗ trợ điều hướng, còn Gateway áp dụng quyền truy cập. Màn danh sách đơn mua và đơn bán chưa có endpoint tương ứng trong Gateway; giao diện nêu rõ giới hạn này thay vì tạo dữ liệu giả.
