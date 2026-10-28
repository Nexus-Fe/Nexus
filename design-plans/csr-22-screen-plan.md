# Kế hoạch giao diện 22 màn Nexus theo CSR

Written against: `022afd4` (`main`, Nexus; working tree source sạch trước khi thêm kế hoạch)

## Tóm tắt

Đưa bộ 22 màn Auth, Buyer, Seller, Staff và Admin vào Nexus làm frontend chuẩn lâu dài; dựng giao diện nghiệp vụ và lấy dữ liệu trong browser. Giữ Next.js App Router cho URL, deep link và phân phối asset. Với các màn cần CSR thuần, dùng client entry tải screen qua `next/dynamic` với `ssr: false`; chỉ thêm `"use client"` không đủ vì Next vẫn prerender Client Components ở lần tải đầu.

Đây là kế hoạch chuyển giao diện, không phải cam kết bật toàn bộ thao tác nghiệp vụ. Các màn hiện có trong tài liệu nguồn chủ yếu là bố cục tĩnh; chỉ ba trang Catalog được báo cáo là có GET đang chạy. Endpoint trong workbook là hợp đồng dự kiến, phải xác nhận bằng OpenAPI/backend trước khi dùng.

## Design language

- Audited surface: các route mua sắm, tài khoản, quản lý người bán, vận hành và quản trị thuộc một ứng dụng Nexus.
- Design sources: `src/app/globals.css`, `src/components/layout/RoutePlaceholder.tsx`, route/layout và README của Nexus; ma trận Stitch trong `DOCUMENTS/report26102026/trien-khai-UI-26102026.md`; báo cáo màn/API ngày 27/10. Không tìm thấy `DESIGN.md` hoặc bộ token hiện hành.
- Documented decisions: App Router chỉ điều phối route; page mỏng; UI nghiệp vụ thuộc feature, UI ghép nhiều feature thuộc widget; gọi nghiệp vụ qua API client/service. Buyer dùng điều hướng phần storefront; Seller/Staff/Admin dùng cổng quản lý theo vai trò. Ma trận đích là 22 màn: Auth 2, Buyer 9, Seller 6, Staff 3, Admin 2.
- Governing owners and consumers: `src/app/` sở hữu route; `src/features/` sở hữu UI và service nghiệp vụ; `src/components/` sở hữu shell/primitives dùng chung; `src/widgets/` ghép feature; `src/lib/api/` sở hữu HTTP client.
- Explicit exceptions: `None documented`.

### Hướng thiết kế đề xuất

Giữ một hệ thống thị giác cho marketplace và cổng vận hành, phân biệt chúng bằng bố cục và mật độ thông tin thay vì tạo bộ màu riêng cho từng role. Buyer ưu tiên duyệt sản phẩm và quyết định mua; Seller/Staff/Admin ưu tiên bảng, trạng thái và thao tác theo hàng đợi. Màn auth tập trung vào biểu mẫu, màn chi tiết dùng cấu trúc thông tin theo nhóm, và trạng thái đơn/đấu giá dùng màu có nghĩa nghiệp vụ.

| Trục | Đề xuất ban đầu để đối chiếu với 22 màn nguồn |
| --- | --- |
| Màu | Harbor `#18324A` cho điều hướng; sương `#F4F7F9` làm nền; trắng `#FFFFFF` cho vùng đọc; teal `#167D7F` cho hành động chính; amber `#D79A2B` cho trạng thái cần chú ý; đỏ gạch `#B54745` cho lỗi/nguy hiểm. Đây là token đề xuất, chưa phải màu đã duyệt. |
| Chữ | Be Vietnam Pro cho giao diện tiếng Việt; một họ chữ, thang cỡ rõ, số tiền và số liệu dùng tabular figures. Giữ font hiện có nếu bộ 22 màn chuẩn đã quy định font khác. |
| Bố cục | Storefront có header tìm kiếm và vùng sản phẩm rộng; form sản phẩm/checkout chia vùng nhập liệu và tóm tắt; cổng quản trị giữ sidebar theo role và bảng theo hàng đợi. Căn trái cho thông tin và bảng; chỉ căn giữa nội dung auth hoặc trạng thái rỗng ngắn. |
| Nguyên tắc | Tái sử dụng nhận diện và pattern đã có trong màn nguồn; không nâng scaffold placeholder thành thiết kế chuẩn; trạng thái rỗng/lỗi phải cho biết bước tiếp theo; không dùng số liệu, giao dịch hay thành công giả để lấp chỗ trống. |

Wireframe khung Buyer:

```text
┌ Logo ───── Tìm sản phẩm ───────────── Tài khoản / Giỏ ┐
├ Danh mục ─────────────────────────────────────────────┤
│ Nội dung mua sắm / bộ lọc     │ Kết quả sản phẩm      │
│                               │ thẻ có ảnh, giá, trạng │
└───────────────────────────────┴───────────────────────┘
```

Wireframe khung cổng vận hành:

```text
┌ Logo / role ─────────────────────────── Người dùng ┐
├ Điều hướng role ─┬ Tiêu đề và thao tác trang       │
│                  ├ Bộ lọc / trạng thái              │
│                  └ Bảng hoặc biểu mẫu theo nghiệp vụ│
└──────────────────┴─────────────────────────────────┘
```

### Rà soát kế hoạch thiết kế

Nền trung tính, teal cho hành động và hai bố cục theo tác vụ marketplace/operations là đề xuất gắn với nội dung Nexus. Dù vậy, màu, font và chi tiết bố cục chưa được xác nhận vì source giao diện 22 màn không có trong checkout đang mở và chưa có screenshot Stitch kèm theo. Trước khi code UI, đối chiếu đề xuất với source chuẩn; giữ nguyên token/pattern của source nếu chúng đã được duyệt, chỉ bổ sung token còn thiếu. Không coi hướng màu ở trên là yêu cầu đổi nhận diện.

## Hiện trạng đã xác minh

- Nexus hiện ở commit `022afd4`; `git status` ban đầu chỉ có `DOCUMENTS/report26102026/` chưa được theo dõi. Không sửa hoặc xóa các tài liệu đó.
- `src/app/` có 19 route scaffold. Đa số gọi `RoutePlaceholder`; trang chủ là landing tạm. `src/widgets/checkout/CheckoutSection.tsx` cũng chỉ trả placeholder.
- Có 9 feature với type/service/index khung; `components/` và `hooks/` gần như trống. Service gọi các đường dẫn `/api/...`, trong khi tài liệu và workbook dùng `/api/v1/...`; README xác định endpoint/type hiện tại là giả định.
- `src/lib/api/client.ts` đã gọi `fetch` trong browser, đọc access token từ `localStorage`, bọc lỗi thành `ApiError` và điều hướng khi 401. Nó chưa kiểm tra schema response; `authService` chỉ lưu trường `token` đơn, nên chưa khớp refresh-token rotation trong workbook.
- Nexus không có `DESIGN.md`. `globals.css` hiện chỉ định nghĩa nền/trước-sau và Geist, còn landing/placeholder dùng slate-indigo; đây là scaffold, chưa phải bằng chứng design system được duyệt.
- Báo cáo đính kèm cho biết checkout `fsa-nexus-fe` cũng đang ở scaffold `022afd4`, và ghi nhận một commit lịch sử `d0817a8` có source 22 màn. Tôi không xác minh được commit đó từ checkout hiện có; xem nó là nguồn cần khôi phục/đối chiếu ở chặng 0, không phải source đã kiểm tra trực tiếp.
- Theo báo cáo 27/10, ba trang `/`, `/catalog`, `/catalog/[id]` ở source 22 màn có GET Catalog; những màn còn lại chưa có API hoạt động. Workbook `flow_mock_excel.xlsx` mô tả endpoint và envelope dự kiến, không chứng minh route nào đang chạy ở Gateway.

## Phạm vi route

| Nhóm | 22 route đích |
| --- | --- |
| Auth (2) | `/login`, `/register` |
| Buyer (9) | `/`, `/catalog`, `/catalog/[id]`, `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]`, `/buyer/wallet`, `/auctions/[id]` |
| Seller (6) | `/seller/products`, `/seller/products/new`, `/seller/inventory`, `/seller/orders`, `/seller/auctions`, `/seller/auctions/new` |
| Staff (3) | `/staff/sellers`, `/staff/sellers/[id]`, `/staff/reports` |
| Admin (2) | `/admin/users`, `/admin/roles` |

Để bộ route ứng dụng khớp scope, 14 route trùng scaffold được làm lại, 8 route được thêm (`/buyer/orders/[id]`, `/auctions/[id]`, `/seller/products/new`, `/seller/orders`, `/seller/auctions`, `/seller/auctions/new`, `/staff/sellers/[id]`, `/staff/reports`) và 5 route khung ngoài scope được gỡ khỏi route map (`/buyer/profile`, `/staff/orders`, `/staff/fulfillment`, `/admin/categories`, `/admin/audit-log`). Chỉ gỡ sau khi xác nhận không có yêu cầu sản phẩm mới hơn thay đổi ma trận này.

## Design decision

Tách giao diện thành 22 client screens theo feature, ghép bằng shell theo vai trò và widget khi màn kết hợp nhiều feature. Route files giữ mỏng và tải screen qua client-only boundary. Mỗi screen lấy route ID/search/filter ở browser; gọi API qua service của feature; phản ánh loading, empty, error, retry, unauthorized và success theo dữ liệu thật. Không chuyển mọi code vào một Client Component gốc duy nhất vì sẽ gom JavaScript các role và làm khó tách feature.

SSR vẫn có thể phục vụ HTML khung, metadata và asset. Tiêu chí CSR ở đây là HTML response ban đầu không chứa nội dung màn nghiệp vụ hoặc dữ liệu API; client tải màn và request dữ liệu sau khi khởi chạy. Giữ Next runtime để route động mở trực tiếp và reload được; chưa chuyển sang static export/SPA hosting.

## Reuse

- `src/constants/routes.ts` làm chủ route; mở rộng theo đúng ma trận sau khi loại route cũ được duyệt.
- `src/features/*/index.ts` là public interface; screen import từ index của feature khác, không import sâu implementation.
- `src/lib/api/client.ts` là điểm gọi HTTP dùng chung; sửa hợp đồng một lần thay vì fetch riêng tại page/widget.
- `src/components/layout/` là nơi đặt shell và navigation dùng chung; `src/components/ui/` giữ primitive; `src/widgets/` giữ tổ hợp checkout.
- Exemplar hình ảnh và hành vi cần lấy từ commit `fsa-nexus-fe@d0817a8` hoặc Stitch IDs trong `trien-khai-UI-26102026.md`. Chưa thể nêu path component cụ thể trước khi source đó được truy cập.

## Changes

1. `design-plans/csr-22-screen-plan.md` và source tham chiếu tại `fsa-nexus-fe`
   - Change: ở chặng 0 lấy source commit `d0817a8` hoặc bộ Stitch tương ứng, lập inventory route → screen → component → style → trạng thái API; chụp 22 route ở viewport chuẩn.
   - Preserve: nhận diện, nội dung và bố cục đã được chọn cho 22 màn; không dùng scaffold tạm làm chuẩn. Không dùng `.next` làm source.
   - Verify: mỗi route có source visual xác định; các khác biệt giữa báo cáo và source hiện tại được ghi rõ trước khi chuyển code.

2. `src/app/`, `src/components/layout/`, `src/features/`, `src/widgets/`
   - Change: thêm 22 route đích, client entry có `dynamic(..., { ssr: false })` nằm trong Client Component, shell Auth/Buyer/Portal và screen theo feature. Dùng loading shell gọn trong lúc JS/screen tải.
   - Preserve: App Router, locale tiếng Việt, responsive design của source chuẩn, đường dẫn deep link và ranh giới feature/widget Nexus.
   - Verify: mở trực tiếp/reload/back-forward được ở mọi route; HTML đầu tiên chỉ có app shell/loading và không lộ copy/dữ liệu nghiệp vụ; bundle screen được tải phía client.

3. `src/lib/api/`, `src/features/*/services/`, `src/features/*/types/`
   - Change: tạo adapter envelope thành công, phân trang và ProblemDetails; chuẩn hóa `ApiError`, hủy request stale, xử lý status 401/403/404; đổi service sang API path/DTO đã xác nhận. Dùng enum PascalCase từ `FRONTEND_ENUM_SPECIFICATION.md` qua adapter hiển thị riêng, không tự đặt biến thể trạng thái.
   - Preserve: browser gọi Gateway công khai, không đưa secret backend vào bundle; không để widget/page tự gọi API nghiệp vụ.
   - Verify: mỗi service được đối chiếu với OpenAPI và phản hồi backend thật; có trạng thái loading/empty/error và không dùng fallback mock khi API lỗi.

4. `src/features/auth/` và shell theo role
   - Change: triển khai login/register và trạng thái phiên sau khi xác minh JWT, refresh-token rotation, logout, quyền và role response; route guard client cho trải nghiệm điều hướng.
   - Preserve: backend/Gateway là nơi quyết định quyền cuối cùng; route group/menu không được xem như access control.
   - Verify: 401/403/expired session đi tới trạng thái rõ; role sai không render vùng riêng tư sau khi xác minh session; mọi endpoint nhạy cảm vẫn bị backend bảo vệ.

5. `src/features/commerce/`, `wallet/`, `auction/`, `fulfillment/`, `profile/`, `audit-log/` và screen liên quan
   - Change: chỉ bật tạo đơn, thanh toán, nạp/rút, đặt giá, duyệt, sửa quyền và hành động ghi khác sau khi request/response, auth và quy tắc nghiệp vụ có endpoint chạy thật được xác nhận. Trước đó hiển thị trạng thái chưa khả dụng với lý do hướng người dùng.
   - Preserve: các quy tắc đã xác nhận trong nguồn nghiệp vụ; mock gateway stateless chỉ làm dữ liệu đọc/hiển thị, không coi response thành công giả là giao dịch hoàn tất.
   - Verify: mỗi thao tác ghi có điều kiện thành công, lỗi validation, quyền bị từ chối và kết quả cập nhật rõ; không có nút tạo cảm giác đã thanh toán/đặt giá/duyệt khi không có lệnh backend.

6. `src/app/globals.css`, `src/components/ui/`, shell và 22 screen
   - Change: sau đối chiếu màn chuẩn, đưa token màu/chữ/spacing tập trung vào stylesheet và variants có owner; bổ sung responsive, focus keyboard, reduced motion và trạng thái biểu mẫu/bảng.
   - Preserve: token/pattern hiện hữu của source chuẩn nếu có; tránh áp palette gợi ý trong kế hoạch này như quyết định đã duyệt.
   - Verify: ảnh so sánh desktop 1440×900, tablet 768px, mobile 390×844 cho đủ 22 màn và route động cùng ID/fixture; xác nhận menu, bảng, form, empty/error states và không có scroll ngang ngoài chủ ý.

## Scope

- Inherit: cả 22 route trong bảng scope, shell của Auth/Buyer/Portal, feature screen và API service mà chúng dùng.
- Verify: `/catalog` và `/catalog/[id]` vì hiện ở source SSR có dữ liệu GET; route dynamic vì cần ID thật; checkout và các màn có nút ghi; các role portals vì hiện chưa có kiểm soát truy cập.
- Exclude: 5 scaffold ngoài ma trận; chức năng mới ngoài 22 màn; thay đổi backend; bật API chỉ dựa trên workbook; static export; thiết kế lại nhận diện đã được duyệt.

## Validation

- Product: kiểm tra mọi đường đi trong role, các link list/detail truyền ID thật, filter/query hoạt động sau reload, và trạng thái action phản ánh phản hồi API.
- Interface: so sánh 22 route với source chuẩn ở desktop/tablet/mobile; thử nội dung dài, dữ liệu rỗng, lỗi, loading, 401/403/404 và trạng thái biểu mẫu.
- CSR: kiểm tra HTML response ban đầu không chứa nội dung nghiệp vụ; xác minh screen và request dữ liệu xuất hiện sau khi browser chạy; kiểm tra route động trực tiếp và điều hướng client.
- System: xác nhận screen/shell đều sau client-only boundary; server không lấy/nhúng payload nghiệp vụ; các route đều dùng owner đã có và không phát sinh bộ component song song.
- Repository: `npm run typecheck`, `npm run lint`, `npm run build` → cả ba qua và build thể hiện đúng 22 route.

## Stop conditions

- Dừng trước khi dựng lại visual nếu không truy cập được source chuẩn 22 màn hoặc thiết kế Stitch tương ứng; xác nhận lại màn hình/visual baseline với chủ sở hữu.
- Dừng trước khi nối dữ liệu riêng tư/ghi nếu backend OpenAPI, auth mode hoặc Gateway runtime không xác nhận được endpoint và quyền.
- Dừng trước khi gỡ 5 route scaffold nếu ma trận sản phẩm đã đổi hoặc route đó được yêu cầu trong scope mới.
- Dừng trước khi áp dụng token màu/chữ gợi ý nếu source chuẩn cho thấy một design system đã được duyệt.

## Design documentation

- After acceptance and validation: tạo/cập nhật `DESIGN.md` với token và pattern đã được đối chiếu/duyệt; không ghi các token ứng viên ở trên thành quyết định hiện hành.
