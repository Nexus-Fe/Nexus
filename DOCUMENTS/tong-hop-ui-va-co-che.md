# Tổng hợp UI và cơ chế đã thực hiện

Tài liệu này tổng hợp các thay đổi giao diện đã được áp dụng trong phiên làm việc và các luồng hệ thống đã được kiểm tra. Các phân tích hoặc kế hoạch được ghi riêng để tránh nhầm là tính năng đã triển khai.

## Thay đổi giao diện đã hoàn tất

### Trang giỏ hàng

- Bỏ nhãn “NEXUS Marketplace” phía trên tiêu đề.
- Bỏ mô tả “Kiểm tra sản phẩm trước khi chuyển sang bước thanh toán.”
- Giữ tiêu đề “Giỏ hàng của bạn”, danh sách sản phẩm, phần tổng kết, nút thanh toán và nút tiếp tục mua sắm.
- Tệp: `src/features/commerce/CommerceScreens.tsx`.

### Navbar khu vực mua sắm

- Đặt header người mua ở chế độ `sticky` với `top: 0`, để thanh điều hướng tiếp tục hiển thị khi cuộn.
- Tệp: `src/styles/globals.css`.

### Trang ví

- Chuyển ghi chú về trạng thái hỗ trợ Wallet lên ngay dưới tiêu đề trang.
- Giữ chữ “Coming soon” ở giữa card như vị trí trước đó.
- Giữ nút “Nạp tiền vào ví”.
- Tệp: `src/features/wallet/WalletScreen.tsx`.

## Các luồng hệ thống đã được phân tích

### Đăng nhập và role

- Frontend đăng nhập rồi gọi `GET /api/v1/me` để lấy hồ sơ/role; khi tải lại trang, `SessionProvider` cũng gọi lại endpoint này.
- Seed Mock cho login/profile có dữ liệu cố định của Buyer (`buyer01`/`alexrivers`). Do đó nhập một identifier khác hoặc dùng `X-Mock-Role` riêng trên request `/me` không đảm bảo phiên frontend trở thành Admin.
- `X-Mock-Role` mô phỏng quyền cho request ở Gateway Mock/Bypass; nó không tự gán role cho tài khoản đã lưu trong UserService/database.

### Cập nhật hồ sơ cá nhân

- Frontend gửi `PATCH /api/v1/me`; Gateway chuyển tiếp tới UserService trong Real mode.
- UserService lấy người dùng từ header `x-user-id`, nên claim ID của token phải trùng một user trong database.
- Đã phát hiện lệch kiểu dữ liệu địa chỉ: frontend/Gateway nhận object địa chỉ phân cấp, trong khi DTO UserService lưu `Address` dạng chuỗi. Cần thống nhất contract trước khi kỳ vọng địa chỉ được cập nhật bền vững.
- HTTP 200 trên frontend chưa tự chứng minh dữ liệu đã ghi đúng database; cần đối chiếu response PATCH, GET sau cập nhật, identity và log UserService.

### Thêm sản phẩm vào giỏ

- Frontend gọi `POST /api/v1/cart/items` với `productId` và `quantity`.
- Gateway có route cart, nhưng `gateway.runtime.json` tại thời điểm kiểm tra đặt service `commerce` ở `Mock`; request khi đó dùng seed và không xác nhận dữ liệu đã ghi vào database.
- CommerceService có logic đọc giỏ, nhưng chưa tìm thấy REST controller/handler thêm sản phẩm trong bề mặt API được kiểm tra. Muốn ghi thật cần triển khai endpoint REST ở CommerceService, kết nối Gateway tới endpoint đó ở Real mode, rồi xác nhận bằng GET cart.
- CatalogService cần cung cấp dữ liệu sản phẩm/SKU phù hợp; trạng thái tồn kho thật cần được xác nhận riêng vì tài liệu service cho biết phần này còn dùng mock.

### Truy cập trang Admin/Seller/Staff

- Frontend `RoleGate` kiểm tra role ở client trước khi render trang.
- Có thể bỏ riêng bước kiểm tra role để xem bố cục trong local, nhưng thao tác API vẫn phụ thuộc xác thực/phân quyền ở Gateway/backend. Đây không phải cách cấp quyền thật cho tài khoản.

## Phân biệt trạng thái

- **Đã chỉnh UI:** trang giỏ hàng, navbar buyer, vị trí ghi chú trang ví.
- **Đã phân tích, chưa triển khai trong phiên:** cơ chế login/role Admin, lưu hồ sơ vào database, thêm giỏ thật vào Commerce database, bỏ role guard.
- Không có thay đổi backend nào được thực hiện cho các luồng ở nhóm phân tích.
