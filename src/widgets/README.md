# Widgets

Widget ghép UI và dữ liệu của từ hai feature trở lên. Ví dụ, checkout có thể ghép giỏ hàng (`commerce`), số dư (`wallet`) và giao hàng (`fulfillment`).

- Widget có thể dùng interface công khai từ `features/*/index.ts`.
- Widget không tự gọi `fetch` hay xây URL backend; request thuộc về service của feature qua `lib/api/client.ts`.
- Page trong `app/` render widget để giữ phần định tuyến ngắn gọn.

`checkout/CheckoutSection.tsx` hiện chỉ là scaffold. Chưa có bước thanh toán hay yêu cầu mạng nào được thực thi.
