# Kế hoạch triển khai 22 màn hình theo CSR trong Nexus

Cập nhật: 28/10/2026. Bộ 22 màn gốc đã được tìm thấy trong commit `d0817a8` của Git repository `fsa-nexus-fe` và đã được chuyển vào Nexus. Trạng thái kiểm chứng nằm trong README của Nexus.

## 1. Mục tiêu và phạm vi

- `Nexus/` là mã nguồn frontend chính lâu dài. Di chuyển hoặc dựng lại 22 màn hình đã chọn trong `fsa-nexus-fe` vào kiến trúc `src/` của Nexus; không vận hành hai frontend song song.
- CSR ở mức màn hình và dữ liệu: giao diện nghiệp vụ, trạng thái, tương tác và các request nghiệp vụ chạy trong trình duyệt. Server Next.js chỉ phục vụ HTML nền, metadata, bundle và định tuyến cho lượt truy cập trực tiếp.
- Giữ Next.js 16.4.2, React 19.3.0, TypeScript, Tailwind 4 và App Router của Nexus trong đợt đầu. Không xem `"use client"` đơn lẻ là bằng chứng đã tắt SSR: Next.js vẫn có thể prerender Client Component. Màn hình cần CSR thuần sẽ đi qua Client Component dùng `next/dynamic` với `ssr: false`; cấu hình này phải nằm trong Client Component.
- Giữ route trong `src/app/` mỏng. Giao diện theo vai trò ở `src/features/`, shell và primitive dùng chung ở `src/components/`, tổ hợp nhiều feature ở `src/widgets/`, request qua `src/lib/api/` và service của feature.
- Bộ 22 màn là phạm vi đợt này, chưa phải toàn bộ UI trong báo cáo kiểm kê Stitch. Các màn thiếu ngoài ma trận 22 được quản lý thành backlog riêng.

## 2. Kết quả đọc mã nguồn và nguồn tham chiếu

| Nguồn | Hiện trạng xác minh | Tác động đến kế hoạch |
| --- | --- | --- |
| `Nexus/src/app` (trước triển khai) | 19 route: trang chủ tạm, 18 route còn lại chủ yếu dùng `RoutePlaceholder`; hai route `[id]` đọc `params` trên server. Không có shell theo vai trò, auth guard hoặc màn nghiệp vụ. | Đã thay bằng 22 route đích; màn hình được tải qua client-only boundary. |
| `Nexus/src/features` | 9 feature có types/service/index khởi tạo; `components/` và `hooks/` trống. Nhiều endpoint dùng `/api/...` chỉ là giả định. | Giữ ranh giới module, đối chiếu và sửa hợp đồng API trước khi gọi thật. |
| `Nexus/src/lib/api/client.ts` | Browser `fetch` dùng `NEXT_PUBLIC_API_URL`, token `localStorage`, tự chuyển `/login` khi 401; generic response chưa kiểm tra schema. | Chuẩn hóa `/api/v1/...`, lỗi ProblemDetails, loading/retry, auth và quyền trước khi nối dữ liệu riêng tư. |
| `fsa-nexus-fe/src` tại đường dẫn được cung cấp | Checkout hiện là bộ khung 19 route, nhưng Git reflog còn commit `d0817a8` chứa 22 màn thật, `CatalogScreens.tsx`, `SellerScreens.tsx`, `Shells.tsx` và CSS. | Mã màn hình, shell, primitive và CSS từ commit này đã được chuyển nguyên trạng khi không cần đổi cách lấy dữ liệu/route. |
| Báo cáo 27/10 và kế hoạch Stitch 26/10 | Ma trận 22 màn: Auth 2, Buyer 9, Seller 6, Staff 3, Admin 2. Báo cáo cho biết chỉ 3 màn sản phẩm đã nối GET; 19 màn khác chủ yếu là UI chưa có API hoạt động. | Dùng làm danh sách đích và mức hoàn thiện, không coi mô tả endpoint là bằng chứng backend đang hỗ trợ. |
| `flow_mock_excel.xlsx` và Gateway guide | Workbook có endpoint `/api/v1/...`, envelope thành công, lỗi ProblemDetails; Gateway guide có mock mode không lưu trạng thái và CORS local. | Xác minh với Swagger và backend chạy thật cho từng API. Mock chỉ dùng kiểm tra đọc/hiển thị, không chứng minh giao dịch ghi thành công. |

## 3. Ma trận route đích

| Nhóm | 22 route cần có | So với Nexus hiện tại |
| --- | --- | --- |
| Auth (2) | `/login`, `/register` | 2 route khung cần thay |
| Buyer (9) | `/`, `/catalog`, `/catalog/[id]`, `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]`, `/buyer/wallet`, `/auctions/[id]` | Đã triển khai đủ 9 route |
| Seller (6) | `/seller/products`, `/seller/products/new`, `/seller/inventory`, `/seller/orders`, `/seller/auctions`, `/seller/auctions/new` | Đã triển khai đủ 6 route |
| Staff (3) | `/staff/sellers`, `/staff/sellers/[id]`, `/staff/reports` | Đã triển khai đủ 3 route |
| Admin (2) | `/admin/users`, `/admin/roles` | Đã triển khai đủ 2 route |

Tổng cộng 14 route trùng khung ban đầu và 8 route mới. Năm route khung ngoài phạm vi (`/buyer/profile`, `/staff/orders`, `/staff/fulfillment`, `/admin/categories`, `/admin/audit-log`) cùng placeholder đã được loại khỏi source để bộ route của ứng dụng khớp chính xác ma trận 22 màn. Chúng không thuộc bộ giao diện người dùng yêu cầu chuyển.

## 5.1. Trạng thái triển khai và bằng chứng (28/10/2026)

| Hạng mục | Trạng thái | Bằng chứng hiện có / phần còn lại |
| --- | --- | --- |
| Nguồn giao diện chuẩn | Hoàn tất | Source chuẩn là commit `d0817a8` trong Git history của `fsa-nexus-fe`; checkout hiện tại của repo đó là scaffold `022afd4`. |
| Chuyển giao diện 22 màn | Đã chuyển, chưa chứng minh pixel-perfect | Đối chiếu trực tiếp commit `d0817a8`: sau chuẩn hóa CRLF/LF, 36/71 file `src/` giống hệt, 35 khác và không thiếu file gốc; Nexus thêm 4 file CSR/proxy. Shell, CSS, primitive và phần lớn screen component trùng nguyên bản. Route/layout được thay bằng client boundary; Catalog screen đổi fetch/query sang client; Wallet chỉ bỏ import không dùng. |
| Route đích | Hoàn tất | Build manifest có 22 route `page` của sản phẩm; không còn `RoutePlaceholder` trong `src`. 5 route scaffold ngoài ma trận đã xóa. |
| CSR màn hình | Hoàn tất ở cấp kiến trúc | 22 screen exports và 3 shell exports nằm sau `dynamic(..., { ssr: false })` trong Client Components. Build HTML cho route tĩnh chỉ chứa vỏ tải NEXUS, không có copy nghiệp vụ; dynamic route có page bundle/client reference tương ứng. |
| CSR Catalog data | Đã triển khai, cần môi trường tích hợp | Browser fetch chạy sau mount; proxy `/api/catalog-source/*` chỉ đọc dữ liệu Catalog từ `CATALOG_SERVICE_URL`. Chưa xác nhận Gateway/Catalog Service thực tế trong môi trường backend. |
| Typecheck, lint, production build | Hoàn tất | `npm run typecheck`, `npm run lint`, `npm run build` đều đã qua sau khi dọn scaffold. Build tạo đủ 22 route và route dữ liệu Catalog. |
| So sánh trực quan trong browser | Chưa nghiệm thu | Đã thử runtime production: Next báo `Ready`, nhưng Brave trả `ERR_CONNECTION_REFUSED`; request từ shell tới `127.0.0.1:3000` cũng bị OS chặn socket. Browser UI hiện không có quyền dùng browser tab tự động. Chưa có screenshot runtime nên chưa khẳng định pixel-perfect. Cần chạy cả source chuẩn và Nexus trong cùng môi trường browser, dùng cùng viewport, trạng thái dữ liệu và đối chiếu screenshot đủ 22 route trước khi đóng nghiệm thu. |

### Kết quả đối chiếu code với source gốc

| Kết quả | Số lượng / ghi chú |
| --- | --- |
| File trong `src/` tại `fsa-nexus-fe@d0817a8` | 71 |
| Giống nguyên byte sau chuẩn hóa CRLF/LF | 36 |
| Khác source gốc | 35; gồm route/layout chuyển qua CSR wrappers, Catalog fetch/query chuyển sang client và thay đổi adapter/environment |
| File gốc bị thiếu | 0 |
| File mới trong Nexus | 4: `ClientScreens.tsx`, `ClientShells.tsx`, `catalog-service-client.ts`, `/api/catalog-source/[...path]/route.ts` |
| Code màn hình/CSS trùng nguyên bản | CSS, shell, shared primitives, Admin/Auction/Auth/Commerce/Seller/Staff screen components. `WalletScreen.tsx` chỉ bỏ import `Badge` không dùng. |
| Pixel fidelity | Chưa chứng minh; cần browser screenshot side-by-side với cùng ID, fixture dữ liệu và viewport. |

### Bảng route -> screen

| Route | Component screen |
| --- | --- |
| `/`, `/catalog`, `/catalog/[id]` | `HomeScreen`, `CatalogScreen`, `ProductDetailRoute` |
| `/login`, `/register` | `LoginScreen`, `RegisterScreen` |
| `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]` | `CartScreen`, `CheckoutScreen`, `OrdersScreen`, `OrderDetailScreen` |
| `/buyer/wallet` | `WalletScreen` |
| `/auctions/[id]` | `AuctionRoomRoute` -> `AuctionRoomScreen` |
| `/seller/products`, `/seller/products/new`, `/seller/inventory`, `/seller/orders`, `/seller/auctions`, `/seller/auctions/new` | `SellerProductsScreen`, `SellerProductEditorScreen`, `SellerInventoryScreen`, `SellerOrdersScreen`, `SellerAuctionsScreen`, `SellerAuctionEditorScreen` |
| `/staff/sellers`, `/staff/sellers/[id]`, `/staff/reports` | `StaffSellersScreen`, `StaffSellerDetailScreen`, `StaffReportsScreen` |
| `/admin/users`, `/admin/roles` | `AdminUsersScreen`, `AdminRolesScreen` |

### Checklist nghiệm thu trực quan còn lại

- [ ] Mở source chuẩn `fsa-nexus-fe` ở commit `d0817a8` và Nexus trong một browser có thể truy cập cả hai runtime.
- [ ] Chụp 22 route cùng viewport desktop (1440×900), cùng trạng thái dữ liệu/môi trường; với route động dùng cùng ID và cùng fixture.
- [ ] Chụp lại ở viewport mobile (390×844) để xác nhận breakpoint và menu responsive không bị ảnh hưởng bởi shell mới.
- [ ] So sánh bố cục, chữ, màu, spacing, ảnh/icon, trạng thái rỗng và vị trí controls; sửa từng sai khác có bằng chứng.
- [ ] Ghi kết quả và đường dẫn screenshot so sánh vào đây; chỉ khi cả 22 route đạt mới đánh dấu pixel fidelity hoàn tất.

## 4. Kiến trúc CSR đề xuất

1. **Định tuyến:** `page.tsx` chỉ cung cấp client entry cho mỗi màn. Client entry lấy `id`, query và điều hướng bằng hook App Router trong trình duyệt. Truy cập trực tiếp, reload và back/forward phải hoạt động cho route động. `layout.tsx` gốc chỉ giữ HTML, font, metadata; shell Buyer, Seller, Staff, Admin là phần client của từng khu vực.
2. **Dữ liệu:** API được gọi từ hook/query của feature sau khi mount; cache theo key gồm route ID, filter, trang và người dùng. Có loading, empty, error, retry và trạng thái mất quyền rõ ràng. Hủy request cũ khi filter/route đổi; không phát sinh request lặp vô hạn.
3. **Gateway và Catalog:** Browser gọi Gateway công khai qua `NEXT_PUBLIC_API_URL`. Để giữ đúng dữ liệu sản phẩm của bản tham chiếu, browser cũng gọi route proxy cùng origin `/api/catalog-source/*`; proxy chỉ chuyển tiếp tới `CATALOG_SERVICE_URL` và không render HTML. Như vậy màn hình vẫn CSR, còn Catalog Service không phải mở CORS trực tiếp cho browser. Khi Catalog Service chưa cấu hình, giữ fallback Gateway như bản gốc.
4. **Hợp đồng:** Tạo adapter theo từng feature cho envelope `data`, phân trang và ProblemDetails. Kiểu `Product`, `Order`, token, enum và URL hiện tại chỉ là scaffold; đối chiếu Swagger/DTO backend trước khi bật nút gọi API. Giữ service riêng theo nghiệp vụ, tránh gọi `fetch` trực tiếp từ screen/widget.
5. **Phiên và quyền:** Thiết kế login, refresh/logout, khôi phục phiên và guard client cho Buyer/Seller/Staff/Admin. Backend vẫn phải kiểm tra JWT/quyền trên mọi endpoint. Tránh coi route group là cơ chế bảo vệ. Đánh giá lại `localStorage` token hiện tại với yêu cầu bảo mật trước khi dùng thật.
6. **Tương tác:** Phân biệt điều hướng UI với thao tác ghi dữ liệu. Chỉ bật đặt hàng, đặt giá, duyệt hồ sơ, cập nhật quyền khi endpoint, xác thực, phản hồi lỗi và kiểm tra nghiệp vụ đã được xác nhận. Mock Gateway không giữ trạng thái nên không dùng để kết luận các luồng này hoàn chỉnh.
7. **Vận hành:** Trước mắt chạy Next server để deep link `[id]` hoạt động với ID bất kỳ. Không bật `output: 'export'` cho bộ route này: Next static export yêu cầu `generateStaticParams()` cho dynamic route, không phù hợp ID sản phẩm/đơn/hồ sơ sinh ở runtime. Nếu mục tiêu sau này là host tĩnh kiểu SPA thuần, cần quyết định riêng về router và fallback của hosting.

## 5. Thứ tự thực hiện và đầu ra nghiệm thu

| Chặng | Công việc | Đầu ra/điều kiện qua chặng |
| --- | --- | --- |
| 0. Chốt nguồn | Tìm đúng source/commit chứa 22 màn; chụp route và ảnh chuẩn theo Stitch; lập bảng đối chiếu route, màn, component, trạng thái API. | Có nguồn giao diện có thể đọc hoặc bộ thiết kế đủ để dựng lại; không dùng `.next` làm source. |
| 1. Nền CSR | Thiết lập client entry, shell theo vai trò, token màu/chữ, navigation, primitive thực sự dùng chung, API adapter và state loading/error/empty. | Một route mẫu CSR chạy được khi reload, HTML ban đầu không chứa dữ liệu nghiệp vụ, request xuất hiện trong browser Network. |
| 2. Auth và Catalog | Dựng `/login`, `/register`, `/`, `/catalog`, `/catalog/[id]`; chuyển ba màn sản phẩm từ fetch server sang fetch browser; xử lý filter/query, ảnh, ID không tồn tại. | 5 màn khớp thiết kế và dữ liệu GET đúng contract; không còn gọi `CATALOG_SERVICE_URL` phía server. Auth chỉ hoạt động khi contract/session đã xác minh. |
| 3. Buyer | Dựng cart, checkout, orders, order detail, wallet, auction room; ghép widget checkout từ các feature. | Đủ 9 màn Buyer; link danh sách–chi tiết dùng ID thật; nút giao dịch chỉ hoạt động khi API đủ điều kiện. |
| 4. Seller | Dựng 6 màn quản lý sản phẩm, kho, đơn, đấu giá và hai form tạo. | Menu và điều hướng Seller đầy đủ; form có validation; thao tác ghi phụ thuộc API đã xác nhận. |
| 5. Staff/Admin | Dựng 3 màn Staff và 2 màn Admin; role guard, bảng dữ liệu, trạng thái lỗi/quyền. | Không hiển thị dữ liệu riêng tư cho người chưa đủ quyền; mọi màn đích mở được bằng URL trực tiếp. |
| 6. Hoàn thiện | Rà soát responsive, accessibility, nội dung tiếng Việt, hiệu năng bundle, kiểm tra tích hợp Gateway và cập nhật README kiến trúc. | `lint`, `typecheck`, `build` đạt; kiểm tra 22 route ở desktop/tablet/mobile; xác nhận CSR trong Network/HTML; không có link 404 hoặc hành động giả thành công. |

## 6. Các quyết định và phụ thuộc cần chốt trước khi viết mã nghiệp vụ

1. **Vị trí bản 22 màn thực:** đã giải quyết bằng commit Git `d0817a8`; checkout hiện tại của `fsa-nexus-fe` vẫn ở commit khung `022afd4`.
2. **Mức CSR:** kế hoạch mặc định dùng Next.js với màn nghiệp vụ client-only và Next server cho route/deep link. Nếu yêu cầu là không chạy Next server ở môi trường production, cần đổi chiến lược routing/hosting trước khi triển khai.
3. **Hợp đồng Gateway:** xác nhận Swagger và CORS cho Catalog, danh mục, chi tiết sản phẩm; workbook hiện chỉ là đặc tả. Ba màn hiện dùng hai nguồn server (Gateway + Catalog Service), trong khi kiến trúc CSR một Gateway cần một nguồn browser phù hợp.
4. **API còn thiếu:** báo cáo chưa xác nhận GET danh sách đơn Buyer, GET danh sách đơn Seller và GET danh sách tồn kho Seller. Các màn này vẫn triển khai UI và trạng thái chờ dữ liệu; không gán API công khai sai vai trò.
5. **Tài khoản và phân quyền:** xác nhận cơ chế refresh token, role/permission và môi trường thử nghiệm trước khi bật các màn riêng tư hoặc thao tác ghi.

## 7. Tài liệu đã đối chiếu

- `Nexus/README.md`, `src/app/README.md`, `src/features/README.md`, `src/lib/api/README.md` và toàn bộ route, service, type hiện có trong `Nexus/src/`.
- `trien-khai-UI-26102026.md`, `nexus-implemented-pages-api26102026.md`, `stitch-screen-gap-audit-2026-10-26.md`.
- `flow_mock_excel.xlsx` (sheet API và Response Standards), `FRONTEND_GATEWAY_MOCK_GUIDE.md`, `FRONTEND_ENUM_SPECIFICATION.md`.
- Hướng dẫn Next.js 16.4.2 cài tại `fsa-nexus-fe/node_modules/next/dist/docs/`: Server and Client Components, Lazy Loading và Static Exports.
