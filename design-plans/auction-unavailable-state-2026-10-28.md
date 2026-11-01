# Thông báo phiên đấu giá không khả dụng

Written against: `c09db94461ece2dd9c74f555f3569c9a8fb5f212`

## Evidence chain

- Surface: route `/auctions/[id]`, gồm trạng thái ID không hợp lệ và trạng thái Auction API trả về 404.
- Problem: ID không hợp lệ gọi `notFound()` tại `src/app/(public)/auctions/[id]/page.tsx`; chưa có màn `not-found.tsx` riêng nên người mua nhận trang 404 chung. Nếu Auction API không còn phiên, `AuctionRoomScreen` hiển thị `NoData` chung “Không tải được thông tin phiên”.
- Design evidence: giao diện đấu giá dùng `--canvas: #f8fafc`, `--surface: #ffffff`, `--ink: #0f172a`, `--muted: #64748b`, `--line: #e2e8f0`, `--sky: #0284c7`, Plus Jakarta Sans; primitives hiện có `ButtonLink`, `Card`, `NoData` trong `src/components/ui/Primitives.tsx`.
- Owner: `src/app/(public)/auctions/[id]/page.tsx` sở hữu not-found cho ID sai; `src/features/auction/AuctionPages.tsx` sở hữu kết quả tải detail; token và kiểu nút ở `src/styles/globals.css` và `src/components/ui/Primitives.tsx`.
- Scope and affected surfaces: chỉ public buyer route `/auctions/[id]` và nhánh lỗi detail của route này.
- Uncertainty: chưa xác nhận được trường hợp 404 thực tế từ Auction API; kế hoạch cần giữ các lỗi API khác với thông báo lỗi hiện có.

## Design decision

Thay trang 404 chung và empty state lỗi detail bằng một trạng thái thông báo gọn, đặt giữa vùng nội dung công khai của Nexus. Hiển thị đúng nội dung “Phiên đấu giá không hợp lệ hoặc đã không còn khả dụng !” và một nút “Quay lại danh sách phiên” trỏ đến `ROUTES.auction.index`. Giữ phong cách trang đấu giá hiện hữu: nền canvas sáng, bề mặt trắng, chữ và viền theo token, nút dùng `ButtonLink` variant `primary`; không thêm minh họa hoặc màu cảnh báo mới.

## Reuse

- `ButtonLink` từ `src/components/ui/Primitives.tsx`, variant `primary`.
- `ROUTES.auction.index` từ `src/constants/routes.ts`.
- Token `--canvas`, `--surface`, `--ink`, `--muted`, `--line`, `--sky` và font `--font-ui` trong `src/styles/globals.css`.
- Exemplar: trạng thái nội dung đấu giá hiện tại trong `src/features/auction/AuctionPages.tsx`; route owner trong `src/app/(public)/auctions/[id]/page.tsx`.

## Changes

1. `src/app/(public)/auctions/[id]/not-found.tsx`
   - Change: tạo not-found state riêng cho route; render thông báo chính xác theo yêu cầu và một `ButtonLink` “Quay lại danh sách phiên” tới `ROUTES.auction.index`. Canh khối theo chiều ngang ở vùng nội dung, giữ chiều rộng đọc gọn và co về một cột trên màn hẹp.
   - Preserve: giữ `notFound()` trong route page để ID sai tiếp tục được phân loại là not-found; không đổi shell, header hoặc footer dùng chung.
   - Verify: mở `/auctions/not-a-uuid`; route hiển thị thông báo cùng nút điều hướng về `/auctions`, không còn nội dung 404 mặc định.

2. `src/features/auction/AuctionPages.tsx`
   - Change: khi `auctionService.detail` trả `ApiError` có HTTP status 404, thay nội dung lỗi chung bằng cùng trạng thái “Phiên đấu giá không hợp lệ hoặc đã không còn khả dụng !” và nút quay lại danh sách. Giữ nút tải lại cùng thông báo API hiện tại cho các lỗi khác.
   - Preserve: không coi lỗi mạng, 401/403, 5xx hoặc lỗi bids là phiên không khả dụng; giữ trạng thái loading và xử lý dữ liệu thành công.
   - Verify: dùng một UUID hợp lệ nhưng không tồn tại để kiểm tra lỗi detail 404; xác nhận các lỗi API khác vẫn có nội dung tải lại phù hợp.

## Scope

- Inherit: chỉ `/auctions/[id]` nhận trạng thái mới.
- Verify: bố cục ở 1440px, 768px và 390px; liên kết quay lại hoạt động khi vào route trực tiếp.
- Exclude: thay đổi route quản trị/vận hành, API, quy tắc validate UUID, layout shell chung và thiết kế màn 404 toàn ứng dụng.

## Validation

- Product: ID không hợp lệ và phiên API 404 hiển thị cùng nội dung yêu cầu; nút đưa người dùng về danh sách phiên.
- Interface: trạng thái nằm trong vùng nội dung Nexus, dễ đọc trên desktop/mobile; nút giữ focus/hover theo `.button` hiện có.
- System: dùng lại `ButtonLink`, route constant và các token hiện tại; không tạo primitive hay palette song song.
- Repository: `npm run lint` → không có lỗi; `npm run typecheck` → thành công; `npm run build` → route not-found và route detail biên dịch thành công.

## Stop conditions

- Dừng việc ánh xạ lỗi API nếu Auction Service không dùng HTTP 404 cho phiên không tồn tại; xác nhận hợp đồng trước khi mở rộng điều kiện.
- Dừng nếu Next.js phiên bản hiện tại không cho phép segment `not-found.tsx` bao phủ dynamic route này; kiểm tra hướng dẫn Next trong `node_modules/next/dist/docs/` trước khi chọn cơ chế khác.

## Design documentation

- After acceptance and validation: không cần cập nhật tài liệu thiết kế.
