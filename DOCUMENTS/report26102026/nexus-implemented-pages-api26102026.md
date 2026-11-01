# NEXUS: các trang đã triển khai và bản đồ API

Cập nhật: 27/10/2026. Phạm vi gồm 22 trang: Auth (2), Buyer (9), Seller (6), Staff (3), Admin (2). Theo yêu cầu chỉ dùng API đã tồn tại, hiện **3 trang sản phẩm** hiển thị dữ liệu từ Gateway và Catalog Service HTTP. Giao diện không còn nhãn “Bản xem trước”; các trang còn lại vẫn chưa có API hoạt động, giữ trạng thái “Chưa có dữ liệu” và không thực hiện giao dịch hoặc thao tác quản trị. Đây chưa phải bản phát hành chức năng đầy đủ.

## Cách mở các trang

Trong thư mục `fsa-nexus-fe`, chạy `npm run dev -- --webpack`. `.env.local` đặt `API_GATEWAY_URL=http://localhost:8000` và `CATALOG_SERVICE_URL=http://localhost:8002`; các URL `http://localhost:3000` bên dưới là địa chỉ cục bộ, chưa phải URL công khai. Để chạy backend, bật Docker Desktop, chạy `docker compose -f docker-compose.infra.yml up -d redis` tại `fsa-nexus-be/root`, `docker compose -p nexus-be up -d --build gateway` tại `fsa-nexus-be/ApiGateway`, rồi `docker compose up -d --build catalog-service` tại `fsa-nexus-be/CatalogService`. Kiểm tra `/health/ready` và `/api/v1/catalog/products` trên cổng 8000, `/health`, `/api/v1/catalog/products` và `/api/v1/catalog/categories` trên cổng 8002. Gateway được cấu hình `catalog: Mock` trong `ApiGateway/Nexus.Gateway/gateway.runtime.json`.

`{productId}`, `{auctionId}`, `{orderId}` và `{registrationId}` trong URL phải là ID thực, không phải chuỗi nhập nguyên văn. ID sản phẩm hiện có từ Gateway Mock là `22222222-2222-2222-2222-000000000001`. Phòng đấu giá dùng URL `/auctions/{auctionId}`; dashboard và bộ lọc trạng thái ở `/auctions`.

## Trạng thái tích hợp và luồng dữ liệu

- **Đã nối GET**: `/`, `/catalog` và `/catalog/{productId}` dùng `src/lib/catalog/catalog-api.ts` → `src/lib/api/gateway.ts` gọi Gateway và `src/lib/catalog/catalog-service.ts` gọi HTTP Catalog Service (danh sách, chi tiết, danh mục). Khi cấu hình Catalog Service, danh sách/chi tiết của service là nguồn chính; Gateway chỉ bổ sung giá/ảnh cho ID khớp. Danh sách rỗng hợp lệ vẫn rỗng, còn lỗi kết nối/HTTP/payload hiển thị lỗi thay vì sản phẩm mock cũ. ID chi tiết không tồn tại trả 404. Request dùng `cache: "no-store"` và timeout 3,5 giây.
- **Chưa nối**: route và bố cục đã có, nhưng chưa có lời gọi API từ screen/page. Workbook chỉ xác nhận **endpoint dự kiến**. Các nút ghi dữ liệu bị vô hiệu hóa; không có JWT, đăng nhập, thanh toán hay lệnh ghi nào được thực thi.
- Ảnh sản phẩm/đấu giá lấy URL từ response, chuẩn hóa trong `src/lib/presentation.ts`, render bằng `src/components/ui/BackendImage.tsx`. URL thiếu hoặc ảnh tải lỗi đều hiện `[Không có data]`; không có ảnh sản phẩm mẫu trong frontend.
- `src/constants/routes.ts` chứa đường dẫn; `src/constants/navigation.ts` định nghĩa menu theo role. Buyer dùng header trên, Seller/Staff/Admin dùng sidebar; menu không chuyển giữa các role. Các thư mục trong `src/app/` là route, còn nội dung màn nằm trong `src/features/`.
- `src/app/(auth)/layout.tsx` dùng `AuthShell`; `src/app/(public)/layout.tsx` và `src/app/(dashboard)/buyer/layout.tsx` dùng `BuyerShell`; ba layout `src/app/(dashboard)/{seller,staff,admin}/layout.tsx` dùng `PortalShell`. Các shell được định nghĩa tại `src/components/layout/Shells.tsx`.

**Nguồn hợp đồng API:** `../DOCUMENTS/flow_mock_excel.xlsx` chỉ là đặc tả dự kiến. Nguồn hiện chạy là `fsa-nexus-be/ApiGateway/Nexus.Gateway/Mocks/catalog-products.mock.json`; phần lớn endpoint trong workbook chưa có action hoặc mock definition tại Gateway. Các cột bên dưới vẫn nêu endpoint dự kiến để phối hợp triển khai sau, không chứng minh API đã hoạt động.

### Trường API đang gắn vào giao diện

| Dữ liệu trả về | Chuyển đổi và chỗ hiển thị |
| --- | --- |
| `data.items[].id`, `name`, `price`, `status` từ `GET /api/v1/catalog/products` | `productFromList()` trong `catalog-api.ts` tạo thẻ sản phẩm tại trang chủ và catalog. Giá dạng chuỗi được đổi sang số để hiển thị. Link `/catalog/{id}` dùng cùng ID để tìm trong danh sách, không gọi một endpoint chi tiết chưa tồn tại. |

Gateway Mock hiện không trả ảnh, thương hiệu, danh mục, biến thể hoặc mô tả. Catalog Service trả thương hiệu, danh mục và mô tả nhưng chưa trả giá hoặc ảnh; frontend ghép theo ID khi hai nguồn cùng có sản phẩm. Gateway vẫn chưa có GET danh mục hoặc đấu giá; danh mục được đọc trực tiếp từ Catalog Service trên Next.js server.

Với các trang **chưa nối**, bảng dưới chỉ rõ vùng UI và endpoint đã biết. Để gắn thật cần một luồng JWT được thiết kế riêng, adapter đọc dữ liệu có truyền Bearer token, rồi truyền response vào screen thay cho `[Không có data]`; không lấy dữ liệu riêng tư bằng request ẩn danh.

## Auth — 2 trang

| Trang và URL | File route → screen | API trong workbook / file API frontend | Vị trí dữ liệu trên trang và trạng thái |
| --- | --- | --- | --- |
| [Đăng nhập](http://localhost:3000/login) `/login` | `src/app/(auth)/login/page.tsx` → `src/features/auth/AuthScreens.tsx` (`LoginScreen`) | `POST /api/v1/auth/login` (dòng 6); **— chưa nối** | Thẻ form giữa trang: định danh và mật khẩu. Nút Đăng nhập bị vô hiệu hóa; không gửi form hoặc lưu token. |
| [Đăng ký](http://localhost:3000/register) `/register` | `src/app/(auth)/register/page.tsx` → `src/features/auth/AuthScreens.tsx` (`RegisterScreen`) | `POST /api/v1/auth/register` (dòng 3); **— chưa nối** | Thẻ form giữa trang: họ, tên, email, điện thoại, mật khẩu. Nút Tạo tài khoản bị vô hiệu hóa. |

## Buyer — 9 trang

| Trang và URL | File route → screen | API trong workbook / file API frontend | Vị trí dữ liệu trên trang và trạng thái |
| --- | --- | --- | --- |
| [Trang chủ](http://localhost:3000/) `/` | `src/app/(public)/page.tsx` → `src/features/catalog/CatalogScreens.tsx` (`HomeScreen`) | **Đã nối** Gateway `GET /api/v1/catalog/products` và Catalog Service `GET /api/v1/catalog/products` qua `src/lib/catalog/catalog-api.ts`. | Lưới **Sản phẩm mua ngay** hiện dữ liệu ghép theo ID; sản phẩm Catalog Service thiếu giá sẽ hiện “Chưa có dữ liệu”. Phần đấu giá chờ API. |
| [Danh sách sản phẩm](http://localhost:3000/catalog) `/catalog` | `src/app/(public)/catalog/page.tsx` → `src/features/catalog/CatalogScreens.tsx` (`CatalogScreen`) | **Đã nối** danh sách Gateway/Catalog Service và `GET /api/v1/catalog/categories` của Catalog Service. | Số lượng và thẻ sản phẩm ở cột phải. Tìm tên/thương hiệu qua `?q=` và lọc danh mục qua `?category=` trên tối đa 20 sản phẩm đã tải, gồm danh mục con. Khoảng giá chưa khả dụng vì Catalog Service không trả giá cho mọi sản phẩm. |
| Chi tiết sản phẩm `http://localhost:3000/catalog/{productId}` | `src/app/(public)/catalog/[id]/page.tsx` → `src/features/catalog/CatalogScreens.tsx` (`ProductDetailScreen`) | **Đã nối** `GET /api/v1/catalog/products/{productId}` và danh mục từ Catalog Service; Gateway chưa có GET chi tiết. | Tên, trạng thái, thương hiệu, mô tả và danh mục từ Catalog Service; giá lấy từ Gateway nếu có cùng ID. Nút mua vô hiệu hóa. |
| [Giỏ hàng](http://localhost:3000/buyer/cart) `/buyer/cart` | `src/app/(dashboard)/buyer/cart/page.tsx` → `src/features/commerce/CommerceScreens.tsx` (`CartScreen`) | `GET /api/v1/cart` (dòng 70, cần JWT); **— chưa nối** | Danh sách món ở cột trái, tạm tính/phí/tổng ở cột phải chưa có dữ liệu. Link sang checkout chỉ mở bố cục trang; không tạo giao dịch. |
| [Checkout](http://localhost:3000/buyer/checkout) `/buyer/checkout` | `src/app/(dashboard)/buyer/checkout/page.tsx` → `src/features/commerce/CommerceScreens.tsx` (`CheckoutScreen`) | Workbook có `POST /api/v1/checkout/quote` (dòng 75) và `POST /api/v1/orders` (dòng 76); **— chưa nối** | Địa chỉ, sản phẩm, vận chuyển, phương thức thanh toán ở trái; tóm tắt tiền ở phải đều là `[Không có data]`. Nút xác nhận bị vô hiệu hóa; không tạo đơn hay thanh toán. |
| [Đơn hàng của tôi](http://localhost:3000/buyer/orders) `/buyer/orders` | `src/app/(dashboard)/buyer/orders/page.tsx` → `src/features/commerce/CommerceScreens.tsx` (`OrdersScreen`) | **Chưa thấy endpoint GET danh sách đơn Buyer** trong workbook; **— chưa nối** | Các tab trạng thái và danh sách/khung chi tiết hiện `[Không có data]`. Chưa có ID thật để tạo link sang chi tiết. |
| Chi tiết đơn `http://localhost:3000/buyer/orders/{orderId}` | `src/app/(dashboard)/buyer/orders/[id]/page.tsx` → `src/features/commerce/CommerceScreens.tsx` (`OrderDetailScreen`) | `GET /api/v1/order/{orderId}` (dòng 77), `GET /api/v1/shipments/order/{orderId}` (dòng 86, cần JWT); **— chưa nối** | Trạng thái, mã vận đơn, tổng tiền, nhật ký vận chuyển, người nhận và sản phẩm trong đơn hiện `[Không có data]`. `page.tsx` hiện **chưa đọc `params.id`**. |
| [Ví và giao dịch](http://localhost:3000/buyer/wallet) `/buyer/wallet` | `src/app/(dashboard)/buyer/wallet/page.tsx` → `src/features/wallet/WalletScreen.tsx` | `GET /api/v1/wallets/me` (dòng 177), `GET /api/v1/wallets/transactions` (dòng 183, cần JWT); **— chưa nối** | Ba thẻ số dư ở trên, lịch sử giao dịch ở dưới hiện `[Không có data]`; nút nạp/rút tiền bị vô hiệu hóa. |
| Danh sách/dashboard Auction `/auctions` | `src/app/(public)/auctions/page.tsx` → `src/features/auction/AuctionPages.tsx` (`AuctionListScreen`) | `GET /api/v1/auctions` theo workbook. | Dashboard công khai; trạng thái “Đang diễn ra” là bộ lọc trên trang này. |
| Phòng đấu giá trực tiếp `/auctions/{auctionId}` | `src/app/(public)/auctions/[id]/page.tsx` → `src/features/auction/AuctionPages.tsx` (`AuctionRoomScreen`) | Auction API theo workbook; backend hiện chưa cung cấp REST nghiệp vụ. | Chỉ nhận UUID hợp lệ; màn phòng riêng theo phiên. |

## Seller — 6 trang

Tất cả các trang Seller hiện là **UI chưa nối API**. Menu trong `src/constants/navigation.ts`; màn trong `src/features/seller/SellerScreens.tsx`.

| Trang và URL | File route → screen | API trong workbook / file API frontend | Vị trí dữ liệu trên trang và trạng thái |
| --- | --- | --- | --- |
| [Quản lý sản phẩm](http://localhost:3000/seller/products) `/seller/products` | `src/app/(dashboard)/seller/products/page.tsx` → `SellerProductsScreen` | GET sản phẩm Seller trong workbook (dòng 101); **— chưa nối** | Bốn thẻ tổng quan ở trên, bảng sản phẩm ở dưới đều `[Không có data]`. API Catalog công khai **không được dùng như danh sách quản lý Seller**. |
| [Tạo sản phẩm](http://localhost:3000/seller/products/new) `/seller/products/new` | `src/app/(dashboard)/seller/products/new/page.tsx` → `SellerProductEditorScreen` | `GET /api/v1/categories` (dòng 119), `POST /api/v1/products` (dòng 104); **— chưa nối** | Form thông tin, ảnh, biến thể, giá/tồn kho và thẻ xem trước đều chưa có dữ liệu; nút Lưu bị vô hiệu hóa. URL này chỉ là màn tạo, chưa có route sửa theo ID. |
| [Quản lý kho](http://localhost:3000/seller/inventory) `/seller/inventory` | `src/app/(dashboard)/seller/inventory/page.tsx` → `SellerInventoryScreen` | Workbook có `GET /api/v1/variant/{variantId}` (dòng 117) và `POST /api/v1/inventory/stock-in` (dòng 113), **chưa xác nhận GET danh sách tồn kho**; **— chưa nối** | Ba thẻ tồn kho ở trên và bảng SKU bên dưới đều `[Không có data]`; nút Nhập thêm hàng bị vô hiệu hóa. |
| [Quản lý đơn bán](http://localhost:3000/seller/orders) `/seller/orders` | `src/app/(dashboard)/seller/orders/page.tsx` → `SellerOrdersScreen` | **Chưa thấy endpoint GET danh sách đơn Seller** trong workbook; **— chưa nối** | Bốn thẻ tổng quan, tab trạng thái và bảng đơn bán hiện `[Không có data]`. |
| [Quản lý phiên đấu giá](http://localhost:3000/seller/auctions) `/seller/auctions` | `src/app/(dashboard)/seller/auctions/page.tsx` → `SellerAuctionsScreen` | `GET /api/v1/seller/auctions` (dòng 137, cần JWT); **— chưa nối** | Ba thẻ trạng thái và bảng phiên ở dưới hiện `[Không có data]`; có link sang màn tạo phiên. |
| [Tạo phiên đấu giá](http://localhost:3000/seller/auctions/new) `/seller/auctions/new` | `src/app/(dashboard)/seller/auctions/new/page.tsx` → `SellerAuctionEditorScreen` | `POST /api/v1/auctions` (dòng 132); chọn sản phẩm cần dữ liệu Seller; **— chưa nối** | Form sản phẩm, giá, thời gian, điều kiện và thẻ xem trước đều chưa có dữ liệu; nút Tạo phiên bị vô hiệu hóa. URL này chưa phải route sửa phiên theo ID. |

## Staff — 3 trang

Các màn ở `src/features/staff/StaffScreens.tsx` hiện **chưa nối API**; endpoint `/api/v1/admin/...` là đường dẫn đúng như workbook dù giao diện đặt trong role Staff.

| Trang và URL | File route → screen | API trong workbook / file API frontend | Vị trí dữ liệu trên trang và trạng thái |
| --- | --- | --- | --- |
| [Hàng đợi duyệt Seller](http://localhost:3000/staff/sellers) `/staff/sellers` | `src/app/(dashboard)/staff/sellers/page.tsx` → `StaffSellersScreen` | `GET /api/v1/admin/seller-registrations` (dòng 39, cần JWT); **— chưa nối** | Tab trạng thái ở trên; bảng hồ sơ bên trái và ô xem nhanh bên phải hiện `[Không có data]`. |
| Chi tiết hồ sơ `http://localhost:3000/staff/sellers/{registrationId}` | `src/app/(dashboard)/staff/sellers/[id]/page.tsx` → `StaffSellerDetailScreen` | `GET /api/v1/admin/seller-registrations/{registrationId}` (dòng 40, cần JWT); **— chưa nối** | Thông tin shop/chứng từ bên trái, checklist và kết luận bên phải hiện `[Không có data]`; nút duyệt/từ chối bị vô hiệu hóa. `page.tsx` hiện **chưa đọc `params.id`**. |
| [Báo cáo và khiếu nại](http://localhost:3000/staff/reports) `/staff/reports` | `src/app/(dashboard)/staff/reports/page.tsx` → `StaffReportsScreen` | `GET /api/v1/admin/reports` (dòng 43, cần JWT); **— chưa nối** | Ba thẻ trạng thái ở trên; hàng đợi báo cáo và ô nội dung/bằng chứng ở dưới hiện `[Không có data]`. |

## Admin — 2 trang

Các màn ở `src/features/admin/AdminScreens.tsx` hiện **chưa nối API**.

| Trang và URL | File route → screen | API trong workbook / file API frontend | Vị trí dữ liệu trên trang và trạng thái |
| --- | --- | --- | --- |
| [Quản lý tài khoản](http://localhost:3000/admin/users) `/admin/users` | `src/app/(dashboard)/admin/users/page.tsx` → `AdminUsersScreen` | `GET /api/v1/admin/user` (dòng 47, cần JWT); **— chưa nối** | Ba thẻ tổng quan, bảng người dùng và ô chi tiết đều `[Không có data]`; nút tạo tài khoản bị vô hiệu hóa. |
| [Phân quyền RBAC](http://localhost:3000/admin/roles) `/admin/roles` | `src/app/(dashboard)/admin/roles/page.tsx` → `AdminRolesScreen` | `GET /api/v1/admin/roles` (dòng 57, cần JWT); **— chưa nối** | Danh sách vai trò và ma trận quyền đều `[Không có data]`; không có thao tác cập nhật quyền. |

## Giới hạn cần biết khi bàn giao backend

1. Chỉ `GET /api/v1/catalog/products` tại Gateway đang được gọi từ ba trang sản phẩm. `readGateway` có tham số `accessToken`, nhưng chưa có luồng cấp/lưu/refresh JWT; **không có request riêng tư nào đang được gửi**.
2. Workbook chưa xác nhận endpoint danh sách đơn Buyer, danh sách đơn Seller và danh sách tồn kho Seller. Cần đối chiếu với backend thực tế trước khi nối các bảng này.
3. Route chi tiết đơn Buyer và hồ sơ Seller đã tồn tại để xem UI, nhưng chưa dùng ID trên URL và chưa có liên kết từ danh sách. Khi nối JWT/API, cần truyền ID thật từ item trong danh sách.
4. Các URL trên chỉ khả dụng khi frontend chạy tại cổng 3000. Gateway cục bộ đã kiểm tra `health/ready` và mock Catalog trả 1 sản phẩm; điều này không chứng minh các endpoint dự kiến khác đã sẵn sàng hay có môi trường production.
