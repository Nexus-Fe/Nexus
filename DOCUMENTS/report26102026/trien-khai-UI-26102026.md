# Triển khai bản xem trước giao diện Nexus từ Stitch

## 1. Hiện trạng và mục tiêu

- Repo đang dùng Next.js 16.4.2. Có 19 route khởi tạo; phần lớn hiển thị `RoutePlaceholder`. Trang chủ là landing page tạm, còn `src/lib/api/client.ts` và các service/type là scaffold API chưa được màn hình sử dụng. Kiểm tra hiện tại: `lint` và `typecheck` đều đạt.
- Thay toàn bộ trang khởi tạo bằng **22 màn hình** cho Buyer, Seller, Staff và Admin. Các màn trong cùng khu vực điều hướng được với nhau bằng `next/link`; **không nối bốn vai trò với nhau**, không xác thực, không gọi API và không mô phỏng giao dịch.
- Tài liệu `nexus-fe-codebase-plan.md` được dùng làm tham khảo về ranh giới module. Các chỉ dẫn tích hợp Gateway, JWT, TanStack Query và Zustand trong tài liệu đó thuộc giai đoạn sau, không thuộc bản này.
- Đối chiếu Stitch theo **nhãn trên canvas và nội dung HTML**: một số `title` của nguồn màn hình không khớp nội dung thực tế.

## 2. Ma trận màn hình và route

| Khu vực | Route | Màn Stitch — ID |
|---|---|---|
| Auth | `/login` | Đăng nhập — `cc7b83dfd90b4cecb7cb519171746a79` |
| Auth | `/register` | Đăng ký — `332f686596eb4f6ba940ec93631645cc` |
| Buyer | `/` | Trang chủ — `5a584c4e75484e058981800ba4463c12` |
| Buyer | `/catalog` | Danh sách sản phẩm — `901695cdc96f40158f066954ffddf9c2` |
| Buyer | `/catalog/[id]` | Chi tiết sản phẩm — `75f593ce4c084805951c1f97fa7cbb4e` |
| Buyer | `/buyer/cart` | Giỏ hàng — `e689026feacd4ec781dd8a57789e7e80` |
| Buyer | `/buyer/checkout` | Checkout — `83e32098e965486d8d864962c7bc3b89` |
| Buyer | `/buyer/orders` | Đơn hàng của tôi — `9d6fc15ec8ce4f2fa65bf4e3a6fe6b83` |
| Buyer | `/buyer/orders/[id]` | Chi tiết đơn hàng và vận chuyển — `6e174ac9a29c4ea89b3d985ae2835311` |
| Buyer | `/buyer/wallet` | Ví và lịch sử giao dịch — `14c0829605cf4f2084400c24c0e3a88c` |
| Buyer | `/auctions/[id]` | Phòng đấu giá trực tiếp — `f3d4e2b26c1146b68eeff8f99e8ebd4a` |
| Seller | `/seller/products` | Quản lý sản phẩm — `dab4c0549dfe4b15ab3a1bc9261b0d99` |
| Seller | `/seller/products/new` | Tạo/sửa sản phẩm — `942a153ecb13449989a7dcce2352f412` |
| Seller | `/seller/inventory` | Quản lý kho — `3033648bf0b84409bab5fa7169e4aef4` |
| Seller | `/seller/orders` | Quản lý đơn bán — `99efeb61142a4dd6ac285c8f636d7c39` |
| Seller | `/seller/auctions` | Quản lý phiên đấu giá — `a9ff572fd41c49a784c97076003d2c3f` |
| Seller | `/seller/auctions/new` | Tạo/sửa phiên đấu giá — `b8f000cc1e224beea2095a4321779a4d` |
| Staff | `/staff/sellers` | Hàng đợi duyệt Seller — `6378714692704d6abb6be80bcb0ee668` |
| Staff | `/staff/sellers/[id]` | Chi tiết hồ sơ Seller — `e47d755c1897419f981cbe15ac11b3e7` |
| Staff | `/staff/reports` | Báo cáo và khiếu nại — `72b9e3f8902442cc81799b0695d5358f` |
| Admin | `/admin/users` | Quản lý tài khoản — `e2c477d0b04340579ace5b46e366e9a2` |
| Admin | `/admin/roles` | RBAC — `38b484cfbbbf438a835feae8ee3c4a64` |

Các màn Stitch còn lại, gồm bản trùng, modal kết quả thanh toán, màn đang tạo và ảnh sản phẩm độc lập, không tạo route ở giai đoạn này. Ảnh sản phẩm phù hợp được tải từ Stitch và lưu cục bộ để dùng trong các màn đã chọn.

## 3. Cấu trúc mã nguồn và tác dụng

- `C:\Users\wuann_\Documents\A_CONFIDENTIAL\fsa-nexus-fe\src\app\`: chỉ giữ file theo quy ước định tuyến của Next.js như `page.tsx`, `layout.tsx`, `not-found.tsx`. Mỗi page chỉ đọc `params` khi cần và render màn từ feature. Các layout chọn shell của từng khu vực; không chứa dữ liệu mẫu hay logic nghiệp vụ. Chuyển `globals.css` ra `src/styles/` và bỏ `src/app/README.md`.
- `C:\Users\wuann_\Documents\A_CONFIDENTIAL\fsa-nexus-fe\src\components\`: đặt Button, Input, Badge, Table và các phần bố cục dùng lại. Buyer dùng header/navigation theo Stitch; Seller, Staff và Admin dùng portal shell với menu riêng. Chỉ tạo primitive khi có từ hai màn thực sự dùng chung.
- `C:\Users\wuann_\Documents\A_CONFIDENTIAL\fsa-nexus-fe\src\features\`: tổ chức màn theo `auth`, `catalog`, `commerce`, `auction`, `wallet`, `seller`, `staff`, `admin`; mỗi feature xuất các screen component qua `index.ts`. Thành phần chỉ thuộc một màn nằm trong feature đó.
- `C:\Users\wuann_\Documents\A_CONFIDENTIAL\fsa-nexus-fe\src\data\demo\`: chứa dữ liệu trình bày cố định và ID mẫu nhất quán giữa danh sách–chi tiết. Route động dùng dữ liệu mẫu đã khai báo; ID khác trả về `notFound()`.
- `C:\Users\wuann_\Documents\A_CONFIDENTIAL\fsa-nexus-fe\src\constants\routes.ts`: mở rộng hằng đường dẫn cho đúng 22 route. Thêm cấu hình navigation riêng theo vai trò; menu chỉ hiện route đã triển khai và không có liên kết chuyển vai trò.
- Xóa các route placeholder ngoài ma trận, `RoutePlaceholder`, checkout widget tạm, SVG mặc định của Next.js, toàn bộ `src/lib/api/`, các `services` và type mô tả hợp đồng API chưa xác minh, `src/constants/config.ts` và biến API trong `.env.example`. Viết lại README theo phạm vi bản xem trước. Không tạo `route.ts`, mock server, auth guard hay kho lưu phiên.

## 4. Quy tắc giao diện và điều hướng

- Giữ bố cục, nội dung và đặc trưng của từng màn Stitch; chuẩn hóa phần dùng chung bằng Plus Jakarta Sans, nền `#F8FAFC`, mặt trắng `#FFFFFF`, chữ chính `#0F172A`, chữ phụ `#64748B`, xanh chủ đạo `#0284C7` và xanh nhạt `#E0F2FE`. Những màn ví/đơn hàng có sắc indigo dùng biến thể màu theo nguồn Stitch, không đổi toàn bộ ứng dụng sang indigo.
- Bố cục desktop theo khu vực: Buyer ưu tiên thanh điều hướng trên; Seller, Staff, Admin có sidebar và vùng nội dung. Trên mobile, các cột xếp lại và menu thu gọn; màn auth dùng thẻ biểu mẫu tập trung. Giữ focus rõ và hỗ trợ reduced motion.
- Mọi liên kết thuộc ma trận phải mở đúng màn. Nút cần ghi dữ liệu hoặc gọi backend được hiển thị ở trạng thái chưa khả dụng trong bản xem trước; không tạo cảm giác đã đăng nhập, đặt giá, duyệt hồ sơ hay thanh toán thành công. Bỏ các chú thích kỹ thuật như `[UI tĩnh]` khỏi nội dung hiển thị.

## 5. Kiểm chứng và giả định

- Chạy `npm run lint`, `npm run typecheck`, `npm run build`; kiểm tra trực tiếp cả 22 route ở 390px, 768px và desktop, cùng các luồng click trong từng vai trò.
- Kiểm tra không còn `RoutePlaceholder`, không còn route mock cũ, không có request đến Gateway hay API khác, và các liên kết không trỏ tới trang 404. Đối chiếu từng màn với nguồn Stitch tương ứng.
- Giữ nguyên ba file tài liệu đang bị xóa sẵn trong working tree; việc dọn scaffold chỉ áp dụng cho mã nguồn của bản frontend này.
- Đây là kế hoạch đánh giá **hiện trạng**. Skill `code-review` theo diff cần một mốc so sánh và một diff không rỗng; repo hiện chưa có diff triển khai màn hình để thực hiện lượt review hai trục đó. Sau khi triển khai, dùng commit hiện tại `022afd4` làm mốc review cho phần thay đổi mới.
